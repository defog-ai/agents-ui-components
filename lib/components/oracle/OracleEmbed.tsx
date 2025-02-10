import { Sidebar, SingleSelect, SpinningLoader } from "@ui-components";
import { useEffect, useRef, useState } from "react";
import { getApiKeyNames } from "../utils/utils";
import {
  fetchReports,
  OracleReport,
  ReportData,
  ReportListItem,
} from "@oracle";
import { SquarePen } from "lucide-react";
import { twMerge } from "tailwind-merge";
import ErrorBoundary from "../common/ErrorBoundary";

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

            reports.forEach((report) => {
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
    <div className="flex flex-row min-w-full min-h-full max-h-full overflow-hidden text-gray-600 bg-white dark:bg-gray-900">
      <Sidebar
        open={true}
        location="left"
        rootClassNames="sticky top-0"
        title={<span className="font-bold">History</span>}
        contentClassNames={
          "w-72 p-4 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto"
        }
      >
        <div className="space-y-2">
          <SingleSelect
            label="Select Database"
            value={selectedApiKeyName}
            options={keyNames.map((keyName) => ({
              value: keyName,
              label: keyName,
            }))}
            onChange={(v) => setSelectedApiKeyName(v)}
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
        {selectedReportId ? (
          <OracleReport
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
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2">
            <div className="text-gray-500 dark:text-gray-400">
              Select a report
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              or start a new one
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
