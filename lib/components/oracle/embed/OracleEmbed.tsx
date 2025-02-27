import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Sidebar,
  SpinningLoader,
  SingleSelect,
} from "@ui-components";
import { useEffect, useMemo, useRef, useState } from "react";
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
                const date = new Date(report.date_created);
                if (date.toDateString() === today.toDateString()) {
                  histories[dbName]["Today"].push(report);
                } else if (date.toDateString() === yesterday.toDateString()) {
                  histories[dbName]["Yesterday"].push(report);
                } else if (date >= week) {
                  histories[dbName]["Past week"].push(report);
                } else if (date >= month) {
                  histories[dbName]["Past month"].push(report);
                } else {
                  histories[dbName]["Earlier"].push(report);
                }
              });

            // sort the reports within each group in the history by date created
            Object.entries(histories[dbName]).forEach(([group, reports]) => {
              reports.sort(
                (a, b) =>
                  new Date(a.date_created).getTime() -
                  new Date(b.date_created).getTime()
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
          rootClassNames="absolute left-0 min-h-full shadow-2xl lg:shadow-none lg:sticky top-0 bg-gray-50 z-20"
          title={<span className="font-bold">History</span>}
          contentClassNames={
            "w-72 p-4 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto"
          }
        >
          <div className="space-y-4">
            {selectedDbName !== newDbName ? (
              <div
                className={twMerge(
                  "title hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item p-2 text-sm",
                  !selectedReportId
                    ? "font-medium bg-gray-100 dark:bg-gray-800 border-l-2 border-l-blue-500"
                    : ""
                )}
                onClick={() => setSelectedReportId(null)}
              >
                <div className="flex flex-row items-center gap-2">
                  <SquarePen /> <span>New</span>
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
                      <div className="px-2 mb-2 text-xs font-medium tracking-wide text-blue-400 uppercase">
                        {group}
                      </div>
                      {reports.map((report: OracleReportType) => (
                        <div
                          key={report.report_id}
                          onClick={() => {
                            setSelectedReportId(report.report_id);
                          }}
                          className={twMerge(
                            "title hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item p-2 text-sm",
                            report.report_id === selectedReportId
                              ? "font-bold bg-gray-100 dark:bg-gray-800 border-l-2 border-l-blue-500"
                              : ""
                          )}
                        >
                          {report.report_name ||
                            report.inputs.user_question ||
                            "Untitled report"}
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
              onDelete={async () => {
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
                    const newReportList = prev[selectedDbName][
                      reportGroup
                    ].filter((report) => report.report_id !== selectedReportId);

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
              }}
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
