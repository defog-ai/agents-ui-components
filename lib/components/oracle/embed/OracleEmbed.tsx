import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Sidebar,
  SpinningLoader,
  SingleSelect,
} from "@ui-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteReport,
  fetchReports,
  ORACLE_REPORT_STATUS,
  OracleReport,
  oracleReportTimestamp,
  ReportData,
  ListReportResponseItem,
} from "@oracle";
import { SquarePen } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { OracleDraftReport } from "../reports/report-creation/OracleDraftReport";
import { OracleNewDb } from "./OracleNewDb";
import { OracleThinking } from "../reports/OracleThinking";

interface OracleReportType extends ListReportResponseItem {
  reportData?: ReportData;
}

type groups = "Today" | "Yesterday" | "Past week" | "Past month" | "Earlier";

interface ReportHistory {
  [dbName: string]: Record<groups, OracleReportType[]>;
}

const findReportGroupInHistory = (
  dbName: string,
  reportId: string,
  history: ReportHistory
) => {
  // default to Today
  if (!history[dbName]) return "Today";

  const groups = Object.keys(history[dbName]) as groups[];

  for (const group of groups) {
    if (history[dbName][group].some((r) => r.report_id === reportId)) {
      return group;
    }
  }

  // default to Today
  return "Today";
};

/**
 * Renders an Oracle report in an embedded mode.
 * This has a sidebar to select db names, and a report selector which shows a list of already generated reports.
 * Has a button to start a new report.
 */
export function OracleEmbed({
  apiEndpoint,
  token,
  initialDbNames = [],
}: {
  apiEndpoint: string;
  token: string;
  initialDbNames: string[];
}) {
  const [dbNames, setDbNames] = useState<string[]>(initialDbNames);
  const [selectedDbName, setSelectedDbName] = useState("Default DB");
  const [reportHistory, setReportHistory] = useState<ReportHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selectedReport = useMemo(() => {
    if (!selectedReportId) return null;
    return reportHistory[selectedDbName][
      findReportGroupInHistory(selectedDbName, selectedReportId, reportHistory)
    ].find((r) => r.report_id === selectedReportId);
  }, [selectedReportId, reportHistory, selectedDbName]);

  const messageManager = useRef(MessageManager());
  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: newDbName } = useRef<string>(crypto.randomUUID().toString());

  useEffect(() => {
    async function setup() {
      try {
        const histories: ReportHistory = {};
        setSelectedDbName(dbNames.length ? dbNames[0] : newDbName);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        const month = new Date(today);
        month.setMonth(month.getMonth() - 1);

        for (const dbName of dbNames) {
          histories[dbName] = {
            Today: [],
            Yesterday: [],
            "Past week": [],
            "Past month": [],
            Earlier: [],
          };

          try {
            const reports = await fetchReports(apiEndpoint, token, dbName);
            if (!reports) throw new Error("Failed to get reports");

            reports
              // Filter out reports that had errors
              .filter(
                (report) =>
                  report.status !== ORACLE_REPORT_STATUS.ERRORED &&
                  report.status !== ORACLE_REPORT_STATUS.INITIALIZED
              )
              // add to histories based on date created
              .forEach((report) => {
                // Parse date_created as UTC and convert to local timezone
                const date = new Date(report.date_created + 'Z');
                const localToday = new Date();
                const localYesterday = new Date(localToday);
                localYesterday.setDate(localYesterday.getDate() - 1);
                const localWeek = new Date(localToday);
                localWeek.setDate(localWeek.getDate() - 7);
                const localMonth = new Date(localToday);
                localMonth.setMonth(localMonth.getMonth() - 1);
                
                // Compare dates using local timezone
                if (date.toDateString() === localToday.toDateString()) {
                  histories[dbName]["Today"].push(report);
                } else if (date.toDateString() === localYesterday.toDateString()) {
                  histories[dbName]["Yesterday"].push(report);
                } else if (date >= localWeek) {
                  histories[dbName]["Past week"].push(report);
                } else if (date >= localMonth) {
                  histories[dbName]["Past month"].push(report);
                } else {
                  histories[dbName]["Earlier"].push(report);
                }
              });

            // sort the reports within each group in the history by date created in reverse chronological order
            Object.entries(histories[dbName]).forEach(([group, reports]) => {
              reports.sort(
                (a, b) =>
                  new Date(b.date_created + 'Z').getTime() -
                  new Date(a.date_created + 'Z').getTime()
              );
            });
          } catch (error) {
            setError("Failed to fetch reports for db name " + dbName);
            break;
          }
        }

        setReportHistory(histories);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, []);

  const onReportDelete = useCallback(async () => {
    const reportGroup = findReportGroupInHistory(
      selectedDbName,
      selectedReportId,
      reportHistory
    );

    const deleteSucess = await deleteReport(
      apiEndpoint,
      selectedReportId,
      token,
      selectedDbName
    );

    if (!deleteSucess) {
      messageManager.current.error("Failed to delete report");
      return;
    } else {
      messageManager.current.success("Report deleted");

      // remove the report from the history
      setReportHistory((prev) => {
        const newReportList = prev[selectedDbName][reportGroup].filter(
          (report) => report.report_id !== selectedReportId
        );

        const newHistory = {
          ...prev,
          [selectedDbName]: {
            ...prev[selectedDbName],
            [reportGroup]: newReportList,
          },
        };
        // if no reports left in group, remove group
        if (newReportList.length === 0) {
          delete newHistory[selectedDbName][reportGroup];
        }
        return newHistory;
      });
      setSelectedReportId(null);
    }
  }, [apiEndpoint, token, selectedReportId, selectedDbName]);

  const dbSelector = useMemo(
    () => (
      <SingleSelect
        label="Select Database"
        rootClassNames="mb-2"
        value={selectedDbName}
        allowClear={false}
        allowCreateNewOption={false}
        options={[
          {
            value: newDbName,
            label: "Upload new",
          },
        ].concat(
          dbNames.map((dbName) => ({
            value: dbName,
            label: dbName,
          }))
        )}
        onChange={(v: string) => {
          setSelectedDbName(v);
          setSelectedReportId(null);
        }}
      />
    ),
    [selectedDbName, dbNames]
  );

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-rose-50 text-rose-500">
        Error: {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        <SpinningLoader /> <span>Loading</span>
      </div>
    );
  }

  return (
    <MessageManagerContext.Provider value={messageManager.current}>
      <MessageMonitor rootClassNames={"absolute left-0 right-0"} />
      <div className="flex flex-row min-w-full min-h-full max-h-full overflow-hidden text-gray-600 bg-white dark:bg-gray-900">
        <Sidebar
          open={true}
          beforeTitle={dbSelector}
          location="left"
          rootClassNames="absolute left-0 min-h-full shadow-lg lg:shadow-none lg:sticky top-0 bg-gray-50 dark:bg-gray-800 z-20 border-r border-gray-100 dark:border-gray-700"
          title={<h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-lg flex items-center"><span className="mr-2">📚</span> History</h2>}
          contentClassNames={
            "w-72 p-5 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          }
        >
          <div className="space-y-4">
            {selectedDbName !== newDbName ? (
              <div
                className={twMerge(
                  "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-3 flex items-center border border-transparent",
                  !selectedReportId
                    ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                )}
                onClick={() => setSelectedReportId(null)}
              >
                <div className="flex flex-row items-center gap-2">
                  <SquarePen size={18} /> <span className="font-medium">New Report</span>
                </div>
              </div>
            ) : (
              <p className="text-xs">
                Upload a new CSV/Excel file on the right
              </p>
            )}
            {selectedDbName !== newDbName &&
              Object.entries(reportHistory[selectedDbName]).map(
                ([group, reports]) => {
                  if (Object.keys(reports).length === 0) return null; // Skip empty groups
                  return (
                    <div key={group} className="mb-6">
                      <div className="px-2 mb-3 text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400 uppercase flex items-center">
                        <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow mr-2"></div>
                        {group}
                        <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow ml-2"></div>
                      </div>
                      {reports.map((report: OracleReportType) => (
                        <div
                          key={report.report_id}
                          onClick={() => {
                            setSelectedReportId(report.report_id);
                          }}
                          className={twMerge(
                            "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-2 border border-transparent",
                            report.report_id === selectedReportId
                              ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                          )}
                        >
                          <div className="line-clamp-2 font-medium">
                            {report.report_name ||
                              report.inputs.user_question ||
                              "Untitled report"}
                          </div>
                          <div className="flex items-center text-xs mt-1.5 text-gray-500 dark:text-gray-400">
                            <span className="inline-block w-3 h-3 mr-1.5 rounded-full bg-blue-200 dark:bg-blue-700"></span>
                            {new Date(report.date_created + 'Z').toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
              )}
          </div>
        </Sidebar>
        <div className="flex flex-col grow p-2 overflow-auto">
          {selectedReportId === null && selectedDbName === newDbName && (
            <OracleNewDb
              apiEndpoint={apiEndpoint}
              token={token}
              onDbCreated={(dbName) => {
                setReportHistory((prev) => ({
                  ...prev,
                  [dbName]: {
                    Today: [],
                    Yesterday: [],
                    "Past week": [],
                    "Past month": [],
                    Earlier: [],
                  },
                }));
                setDbNames((prev) => [...prev, dbName]);
                setSelectedDbName(dbName);
              }}
            />
          )}

          {selectedReportId &&
          selectedReport &&
          selectedReport.status === ORACLE_REPORT_STATUS.DONE ? (
            <OracleReport
              key={selectedReportId}
              reportId={selectedReportId}
              apiEndpoint={apiEndpoint}
              dbName={selectedDbName}
              token={token}
              onDelete={onReportDelete}
              onReportParsed={(data: ReportData) => {
                // find the group of this report in histories
                const group = findReportGroupInHistory(
                  selectedDbName,
                  selectedReportId,
                  reportHistory
                );

                setReportHistory((prev) => {
                  const prevReports = prev[selectedDbName][group];
                  // if report is found, update it
                  return {
                    ...prev,
                    [selectedDbName]: {
                      ...prev[selectedDbName],
                      [group]: prevReports.map((r) => {
                        if (r.report_id === selectedReportId) {
                          return {
                            ...r,
                            reportData: data,
                          };
                        }
                        return r;
                      }),
                    },
                  };
                });
              }}
            />
          ) : (
            selectedReportId && (
              <OracleThinking
                apiEndpoint={apiEndpoint}
                token={token}
                reportId={selectedReportId}
                onDelete={onReportDelete}
                onStreamClosed={(thinkingSteps, hadError) => {
                  const reportGroup = findReportGroupInHistory(
                    selectedDbName,
                    selectedReportId,
                    reportHistory
                  );

                  if (hadError) {
                    // remove this report from the history
                    setReportHistory((prev) => {
                      const newHistory = { ...prev };
                      newHistory[selectedDbName][reportGroup] = newHistory[
                        selectedDbName
                      ][reportGroup].filter((r) => {
                        return r.report_id !== selectedReportId;
                      });
                      return newHistory;
                    });

                    setSelectedReportId(null);
                  } else {
                    // set the status to done which will trigger the report rendering
                    setReportHistory((prev) => {
                      const newHistory = { ...prev };
                      newHistory[selectedDbName][reportGroup] = newHistory[
                        selectedDbName
                      ][reportGroup].map((r) => {
                        if (r.report_id === selectedReportId) {
                          return {
                            ...r,
                            status: ORACLE_REPORT_STATUS.DONE,
                          };
                        }
                        return r;
                      });
                      return newHistory;
                    });
                  }
                }}
              />
            )
          )}
          {dbNames.map((dbName) => {
            return (
              <div
                key={dbName}
                className={twMerge(
                  "w-full h-full m-auto",
                  selectedReportId || selectedDbName !== dbName ? "hidden" : ""
                )}
              >
                <OracleDraftReport
                  token={token}
                  dbName={dbName}
                  apiEndpoint={apiEndpoint}
                  onReportGenerated={(userQuestion, reportId, status) => {
                    setReportHistory((prev) => {
                      console.log(prev[dbName]["Today"]);
                      return {
                        ...prev,
                        [dbName]: {
                          ...prev[dbName],
                          Today: [
                            {
                              report_id: reportId,
                              report_name: userQuestion,
                              status,
                              date_created: oracleReportTimestamp(),
                            },
                            ...(prev[dbName]["Today"] || []),
                          ],
                        },
                      };
                    });
                    setSelectedReportId(reportId);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </MessageManagerContext.Provider>
  );
}
