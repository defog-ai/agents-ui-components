import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Sidebar,
  SingleSelect,
  SpinningLoader,
} from "@ui-components";
import { useEffect, useRef, useState } from "react";
import { getApiKeyNames } from "../../utils/utils";
import {
  fetchReports,
  OracleReport,
  oracleReportTimestamp,
  ReportData,
  ReportListItem,
} from "@oracle";
import { SquarePen } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { OracleDraftReport } from "./report-creation/OracleDraftReport";

interface OracleReportType extends ReportListItem {
  reportData?: ReportData;
}

interface ReportHistory {
  [apiKeyName: string]: {
    Today: { [reportId: string]: OracleReportType };
    Yesterday: { [reportId: string]: OracleReportType };
    "Past week": { [reportId: string]: OracleReportType };
    "Past month": { [reportId: string]: OracleReportType };
    Earlier: { [reportId: string]: OracleReportType };
  };
}

const findReportGroupInHistory = (
  apiKeyName: string,
  reportId: string,
  history: ReportHistory
) => {
  // default to Today
  if (!history[apiKeyName]) return "Today";
  const groups = Object.keys(history[apiKeyName]);

  for (const group of groups) {
    if (history[apiKeyName][group][reportId]) {
      return group;
    }
  }

  // default to Today
  return "Today";
};

/**
 * Renders an Oracle report in an embedded mode.
 * This has a sidebar to select api key names, and a report selector which shows a list of already generated reports.
 * Has a button to start a new report.
 */
export function OracleEmbed({ apiEndpoint }: { apiEndpoint: string }) {
  const [keyNames, setKeyNames] = useState([]);
  const [selectedApiKeyName, setSelectedApiKeyName] = useState("Default DB");
  const [reportHistory, setReportHistory] = useState<ReportHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const messageManager = useRef(MessageManager());

  const token = useRef<string>(
    localStorage.getItem("defogToken") || import.meta.env.VITE_TOKEN
  );

  useEffect(() => {
    async function setup() {
      try {
        const keyNames = await getApiKeyNames(token.current);
        if (!keyNames) throw new Error("Failed to get api key names");
        setKeyNames(keyNames);

        setSelectedApiKeyName(keyNames[0]);

        const histories: ReportHistory = {};

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        const month = new Date(today);
        month.setMonth(month.getMonth() - 1);

        for (const keyName of keyNames) {
          histories[keyName] = {
            Today: {},
            Yesterday: {},
            "Past week": {},
            "Past month": {},
            Earlier: {},
          };

          try {
            const reports = await fetchReports(
              apiEndpoint,
              token.current,
              keyName
            );
            if (!reports) throw new Error("Failed to get reports");

            reports
              // Filter out reports that are not done
              .filter((report) => report.status === "done")
              // add to histories based on date created
              .forEach((report) => {
                const date = new Date(report.date_created);
                if (date.toDateString() === today.toDateString()) {
                  histories[keyName]["Today"][report.report_id] = report;
                } else if (date.toDateString() === yesterday.toDateString()) {
                  histories[keyName]["Yesterday"][report.report_id] = report;
                } else if (date >= week) {
                  histories[keyName]["Past week"][report.report_id] = report;
                } else if (date >= month) {
                  histories[keyName]["Past month"][report.report_id] = report;
                } else {
                  histories[keyName]["Earlier"][report.report_id] = report;
                }
              });
          } catch (error) {
            setError("Failed to fetch reports for key name " + keyName);
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
          location="left"
          rootClassNames="sticky top-0 bg-gray-50"
          title={<span className="font-bold">History</span>}
          contentClassNames={
            "w-72 p-4 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto"
          }
        >
          <div className="space-y-4">
            <SingleSelect
              label="Select Database"
              value={selectedApiKeyName}
              allowClear={false}
              allowCreateNewOption={false}
              options={keyNames.map((keyName) => ({
                value: keyName,
                label: keyName,
              }))}
              onChange={(v: string) => {
                setSelectedApiKeyName(v);
                setSelectedReportId(null);
              }}
            />
            <div
              className={twMerge(
                "title hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item p-2 text-sm",
                !selectedReportId
                  ? "font-medium bg-gray-100 dark:bg-gray-800 border-l-2 border-l-blue-500"
                  : ""
              )}
              onClick={() => setSelectedReportId(null)}
            >
              <span>
                <SquarePen /> New
              </span>
            </div>
            {Object.entries(reportHistory[selectedApiKeyName]).map(
              ([group, reports]) => {
                if (Object.keys(reports).length === 0) return null; // Skip empty groups
                return (
                  <div key={group} className="mb-6">
                    <div className="px-2 mb-2 text-xs font-medium tracking-wide text-blue-400 uppercase">
                      {group}
                    </div>
                    {Object.values(reports).map((report: OracleReportType) => (
                      <div
                        key={report.report_id}
                        className={twMerge(
                          "title hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item p-2 text-sm",
                          report.report_id === selectedReportId
                            ? "font-bold bg-gray-100 dark:bg-gray-800 border-l-2 border-l-blue-500"
                            : ""
                        )}
                        onClick={() => {
                          setSelectedReportId(report.report_id);
                        }}
                      >
                        <span>{report.report_name}</span>
                      </div>
                    ))}
                  </div>
                );
              }
            )}
          </div>
        </Sidebar>
        <div className="flex flex-col grow p-2 overflow-auto">
          {selectedReportId && (
            <OracleReport
              key={selectedReportId}
              reportId={selectedReportId}
              apiEndpoint={apiEndpoint}
              keyName={selectedApiKeyName}
              token={token.current}
              onReportParsed={(data: ReportData) => {
                // find the group of this report in histories
                const group = findReportGroupInHistory(
                  selectedApiKeyName,
                  selectedReportId,
                  reportHistory
                );

                setReportHistory((prev) => ({
                  ...prev,
                  [selectedApiKeyName]: {
                    ...prev[selectedApiKeyName],
                    [group]: {
                      ...prev[selectedApiKeyName][group],
                      [selectedReportId]: {
                        ...prev[selectedApiKeyName][group][selectedReportId],
                        reportData: data,
                      },
                    },
                  },
                }));
              }}
            />
          )}
          {keyNames.map((keyName) => {
            return (
              <div
                key={keyName}
                className={twMerge(
                  "w-full h-full m-auto",
                  selectedReportId || selectedApiKeyName !== keyName
                    ? "hidden"
                    : ""
                )}
              >
                <OracleDraftReport
                  token={token.current}
                  apiKeyName={keyName}
                  apiEndpoint={apiEndpoint}
                  onReportGenerated={(userQuestion, reportId, status) => {
                    setReportHistory((prev) => ({
                      ...prev,
                      [keyName]: {
                        ...prev[keyName],
                        Today: {
                          ...prev[keyName]["Today"],
                          [reportId]: {
                            report_id: reportId,
                            report_name: userQuestion,
                            status,
                            date_created: oracleReportTimestamp(),
                          },
                        },
                      },
                    }));
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
