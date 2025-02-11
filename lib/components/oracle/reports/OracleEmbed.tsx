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
    [reportId: string]: OracleReportType;
  };
}

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

        const histories = {};

        for (const keyName of keyNames) {
          histories[keyName] = {};
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
              .forEach((report) => {
                histories[keyName][report.report_id] = report;
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
          <div className="space-y-2">
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
            {Object.values(reportHistory[selectedApiKeyName]).map(
              (report: OracleReportType) => (
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
              )
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
                setReportHistory((prev) => ({
                  ...prev,
                  [selectedApiKeyName]: {
                    ...prev[selectedApiKeyName],
                    [selectedReportId]: {
                      ...prev[selectedApiKeyName][selectedReportId],
                      reportData: data,
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
                        [reportId]: {
                          report_id: reportId,
                          report_name: userQuestion,
                          status,
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
