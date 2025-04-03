import { OracleAnalysis } from "@oracle";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { Table } from "@ui-components";
import { ChartContainer } from "../../../observable-charts/ChartContainer";
import { createChartManager } from "../../../observable-charts/ChartManagerContext";
import { CodeEditor } from "../../../query-data/analysis/analysis-results/CodeEditor";
import { useEffect, useMemo, useState } from "react";
import { ChartBarIcon, TableIcon } from "lucide-react";
import { KeyboardShortcutIndicator } from "../../../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../../../constants/keymap";
import { parseData } from "@agent";
import { checkIfDate, reFormatData } from "../../../query-data/queryDataUtils";

interface SqlAnalysisContentProps {
  analysis: OracleAnalysis;
  viewMode: "table" | "chart";
  showSqlQuery: boolean;
  setShowSqlQuery: (show: boolean) => void;
  setViewMode: (mode: "table" | "chart") => void;
}

interface TabItem {
  key: "table" | "chart";
  tabLabel: string;
  icon?: React.ReactNode;
  component: React.ReactNode;
}

export function SqlAnalysisContent({
  analysis,
  viewMode,
  showSqlQuery,
  setShowSqlQuery,
  setViewMode,
}: SqlAnalysisContentProps) {
  const [isChartOptionsExpanded, setIsChartOptionsExpanded] = useState(false);
  const [results, setResults] = useState<TabItem[]>([]);

  // Create a parsedOutput object that exactly matches what parseOutput() creates in analysisManager.ts
  const parsedOutputs = useMemo(() => {
    if (!analysis) return null;
    
    // Convert analysis rows to CSV string (exactly like the backend would)
    let csvString = '';
    
    // Add header
    csvString += analysis.columns.map(col => col.title || col.key || '').join(',') + '\n';
    
    // Add data rows
    analysis.rows.forEach(row => {
      const rowStr = analysis.columns.map(col => {
        const key = col.title || col.key || col.dataIndex;
        return row[key] === undefined || row[key] === null ? '' : row[key];
      }).join(',');
      csvString += rowStr + '\n';
    });
    
    // Now use the exact same function as analysisManager.ts to parse the output
    // This is the most direct approach - we're using the same parseData function with CSV
    const parsedData = parseData(csvString);
    
    // Create chart manager exactly like analysisManager.parseOutput does
    const chartManager = createChartManager({
      data: parsedData.data,
      availableColumns: parsedData.columns,
    });
    
    // Auto-select variables (exactly like the backend)
    chartManager.autoSelectVariables();
    
    return {
      csvString,
      data: parsedData,
      chartManager: chartManager, // Exact same structure as in analysisManager.parseOutput
      reactive_vars: {},
      chart_images: {},
      analysis: {}
    };
  }, [analysis.analysis_id]);

  const chartContainer = useMemo(() => {
    return (
      parsedOutputs && (
        <ChartContainer
          stepData={parsedOutputs}
          initialQuestion={analysis?.question}
          initialOptionsExpanded={isChartOptionsExpanded}
        />
      )
    );
  }, [analysis.analysis_id, parsedOutputs, isChartOptionsExpanded]);

  useEffect(() => {
    let tabs: TabItem[] = [];

    tabs.push({
      component: (
        <div className="w-full overflow-x-auto">
          <Table
            columns={analysis.columns}
            rows={analysis.rows}
            columnHeaderClassNames="py-2"
            skipColumns={["index"]}
            rootClassNames="shadow-sm min-w-[400px]"
          />
        </div>
      ),
      key: "table",
      tabLabel: "Table",
      icon: <TableIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
    });

    tabs.push({
      component: (
        <ErrorBoundary>
          {chartContainer}
        </ErrorBoundary>
      ),
      key: "chart",
      tabLabel: "Chart",
      icon: <ChartBarIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
    });

    setResults(tabs);
  }, [analysis.analysis_id, chartContainer]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement === document.body) {
        // If any modifier keys are pressed, do not match
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
          return;
        }
        // Only handle chart options when chart tab is active
        if (
          matchesKey(e.key, KEYMAP.TOGGLE_CHART_OPTIONS) &&
          viewMode === "chart"
        ) {
          setIsChartOptionsExpanded((prev) => !prev);
          e.preventDefault();
        }
        // Add handlers for table/chart view switching
        if (matchesKey(e.key, KEYMAP.VIEW_TABLE)) {
          setViewMode("table");
          e.preventDefault();
        }
        if (matchesKey(e.key, KEYMAP.VIEW_CHART)) {
          setViewMode("chart");
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [viewMode, setViewMode]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Question header with icon */}
      {analysis.question && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                SQL Analysis
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {analysis.question}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Database badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
          {(analysis as any)?.db_name || "Database"}
        </span>
        {analysis.rows && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
            {analysis.rows.length}{" "}
            {analysis.rows.length === 1 ? "row" : "rows"}
          </span>
        )}
      </div>

      {/* SQL Results with Query Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between p-3 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <nav className="flex space-x-4" aria-label="Tabs">
              {results.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2
                    ${
                      viewMode === tab.key
                        ? "border-b-2 border-blue-500 text-blue-600 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }
                  `}
                >
                  <span className="flex items-center">
                    {tab.icon}
                    {tab.tabLabel}
                  </span>
                  {tab.key === "table" && (
                    <KeyboardShortcutIndicator
                      keyValue={KEYMAP.VIEW_TABLE}
                      className="opacity-50 px-1 py-0.5"
                    />
                  )}
                  {tab.key === "chart" && (
                    <KeyboardShortcutIndicator
                      keyValue={KEYMAP.VIEW_CHART}
                      className="opacity-50 px-1 py-0.5"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {(analysis as any)?.sql && (
            <button
              onClick={() => setShowSqlQuery(!showSqlQuery)}
              className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded px-2 py-1 transition-colors flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              {showSqlQuery ? "Hide SQL" : "Show SQL"}
            </button>
          )}
        </div>

        {/* SQL Query section that shows/hides based on toggle */}
        {showSqlQuery && (analysis as any)?.sql && (
          <div className="border-b dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700">
              <div className="flex items-center gap-1.5 mb-2 sm:mb-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-purple-500 dark:text-purple-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 9l3 3-3 3"></path>
                  <line x1="13" y1="15" x2="16" y2="15"></line>
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  ></rect>
                </svg>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  SQL Query
                </span>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    (analysis as any).sql || ""
                  );
                  // You could add a toast notification here if you have one
                }}
                className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </button>
            </div>

            <div className="max-h-[150px] sm:max-h-[200px] overflow-auto">
              <CodeEditor
                code={(analysis as any).sql || ""}
                language="sql"
                editable={false}
                className="text-sm"
              />
            </div>
          </div>
        )}

        <div className="p-2 sm:p-3">
          {results.map((tab) => (
            <div
              key={tab.key}
              className={
                tab.key === viewMode
                  ? "z-2"
                  : "absolute overflow-hidden top-[-100%] z-[-1] pointer-events-none *:pointer-events-none opacity-0"
              }
            >
              {tab.component}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}