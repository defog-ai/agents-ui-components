// @ts-nocheck
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useSyncExternalStore,
  useContext,
} from "react";
import { MessageManagerContext } from "@ui-components";
import { chartNames, roundColumns } from "../../agentUtils";

import {
  Download,
  ChartBarIcon,
  Copy,
  TableIcon,
  Sparkles,
  ChevronRightIcon,
} from "lucide-react";
import ErrorBoundary from "../../../common/ErrorBoundary";
import ChartImage from "./ChartImage";

import Editor from "react-simple-code-editor";
// @ts-ignore
import { highlight, languages } from "prismjs/components/prism-core";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";

import "prismjs/themes/prism.css";
import { roundNumber } from "@utils/utils";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { Button, Table } from "@ui-components";
import { ChartContainer } from "../../../observable-charts/ChartContainer";
import StepResultAnalysis from "./StepResultAnalysis";

import type { ParsedOutput, Step } from "../analysisManager";
import type { AnalysisTreeManager } from "../../analysis-tree-viewer/analysisTreeManager";
import { KeyboardShortcutIndicator } from "../../../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../../../constants/keymap";

interface TabItem {
  key: string;
  tabLabel: string;
  icon?: React.ReactNode;
  component: React.ReactNode;
}

const AnalysisDrawerHandle = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className={`
      absolute -left-8 top-1/2 -translate-y-1/2
      h-36 w-8 flex items-center justify-center group
      bg-[#F9FAFB] dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      hover:bg-gray-50 dark:hover:bg-gray-700
      transition-colors rounded-l
      ${!isOpen ? "z-10" : ""}
    `}
    title={`${isOpen ? "Collapse" : "Expand"} analysis panel (${KEYMAP.TOGGLE_ANALYSIS})`}
  >
    <div className="relative flex flex-col h-full">
      {/* Center the icon */}
      <div className="flex items-center justify-center flex-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-4 h-4" />
        </span>
      </div>

      {/* Bottom-aligned shortcut */}
      <div className="absolute -translate-x-1/2 bottom-2 left-1/2">
        <KeyboardShortcutIndicator
          shortcut={KEYMAP.TOGGLE_ANALYSIS}
          className="scale-75"
        />
      </div>
    </div>
  </button>
);

// tabBarLeftContent: extra content for the tab bar on the left side
export function StepResultsTable({
  stepId,
  keyName,
  analysisId,
  nodeName,
  apiEndpoint,
  stepData = null,
  codeStr = null,
  sql = null,
  chartImages = null,
  initialQuestion = null,
  handleEdit = (...args) => {},
  analysisTreeManager = null,
}: {
  stepId: string;
  keyName: string;
  analysisId: string;
  nodeName: string;
  apiEndpoint: string;
  stepData?: ParsedOutput | null;
  codeStr?: string | null;
  sql?: string | null;
  chartImages?: any;
  initialQuestion: string | null;
  handleEdit?: (...args: any) => void;
  analysisTreeManager?: AnalysisTreeManager;
}) {
  const downloadCsvEndpoint = setupBaseUrl({
    protocol: "http",
    path: "download_csv",
    apiEndpoint: apiEndpoint,
  });
  const messageManager = useContext(MessageManagerContext);
  const tableChartRef = useRef(null);
  const [sqlQuery, setSqlQuery] = useState(sql);
  const [toolCode, setToolCode] = useState(codeStr);
  const [csvLoading, setCsvLoading] = useState(false);
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(true);
  const [isChartOptionsExpanded, setIsChartOptionsExpanded] = useState(false);

  async function saveCsv() {
    if (csvLoading) return;

    let csv = "";
    try {
      // tableData: {columns: Array(4), data: Array(1)}
      const tableData = stepData?.data;
      if (!tableData) return;
      const { columns, data } = tableData;

      // if data has >= 1000 rows, it might have been truncated
      // in this case, send a request to the server to get the full data
      // we will send the tool run id and also the output_storage_key we need to download
      if (data.length >= 1000) {
        setCsvLoading(true);

        const res = await fetch(downloadCsvEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step_id: stepId,
            output_storage_key: nodeName,
            analysis_id: analysisId,
            db_name: keyName,
          }),
        }).then((r) => r.json());

        if (!res?.success) {
          messageManager.error(res?.error_message || "Error saving CSV.");
          return;
        } else if (res?.success && res?.csv) {
          csv = res.csv;
        }
      } else {
        const filteredColumns = columns.filter((d) => d.title !== "index");
        // Use columns to append to a string
        csv = filteredColumns.map((d) => d.title).join(",") + "\n";
        // Use data to append to a string
        // go through each row and each column and append to csv
        for (let i = 0; i < data.length; i++) {
          let row = data[i];
          for (let j = 0; j < filteredColumns.length; j++) {
            csv += row[filteredColumns[j].title];
            if (j < filteredColumns.length - 1) csv += ",";
          }
          csv += "\n";
        }
      }

      // Create a blob and download it
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // name with time stamp but without miliseconds

      a.download = `${nodeName}-${new Date().toISOString().split(".")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      // delete a tag
      a.remove();
      message.success("CSV saved.");
    } catch (e) {
      console.error(e);
      message.error("Error saving CSV.");
    } finally {
      setCsvLoading(false);
    }
  }

  const activeTab = useSyncExternalStore(
    (l) => analysisTreeManager.subscribeToActiveTabChanges(analysisId, l),
    () => analysisTreeManager.getActiveTab(analysisId)
  );

  const updateCodeAndSql = (
    updateProp: string | null = null,
    newVal: string
  ) => {
    // update values of the code and the SQL
    if (updateProp !== "sql" && updateProp !== "code") return;
    if (!stepId) return;
    if (!newVal) return;

    if (updateProp === "sql") {
      setSqlQuery(newVal);
    }
    if (updateProp === "code") {
      setToolCode(newVal);
    }
    handleEdit({
      step_id: stepId,
      update_prop: updateProp,
      new_val: newVal,
    });
  };

  useEffect(() => {
    setSqlQuery(sql);
    setToolCode(codeStr);
  }, [sql, codeStr]);

  const [results, setResults] = useState<TabItem[]>([]);

  const resultAnalysis = useMemo(() => {
    return (
      stepData?.csvString && (
        <StepResultAnalysis
          stepId={stepId}
          keyName={keyName}
          question={initialQuestion}
          data_csv={stepData?.csvString}
          sql={sql}
          apiEndpoint={apiEndpoint}
          token={token}
        />
      )
    );
  }, [stepData, stepId, keyName, initialQuestion, sql, apiEndpoint]);

  const chartContainer = useMemo(() => {
    return (
      stepData && (
        <ChartContainer
          stepData={stepData}
          initialQuestion={initialQuestion}
          initialOptionsExpanded={isChartOptionsExpanded}
          onOptionsExpandedChange={setIsChartOptionsExpanded}
        />
      )
    );
  }, [stepData, initialQuestion, isChartOptionsExpanded]);

  const renderContent = (content) => (
    <div className="flex">
      <div
        className={`
          transition-all duration-200 pr-6
          ${isAnalysisVisible ? "w-[70%]" : "w-[95%]"}
        `}
      >
        {content}
      </div>

      {/* Analysis Panel */}
      <div
        className={`
          relative
          transition-all duration-200 
          border-l border-gray-200 dark:border-gray-700
          ${isAnalysisVisible ? "w-[30%]" : "lg:w-[5%] w-0"}
        `}
      >
        <div className="flex items-start">
          {/* Handle positioned outside the main container */}
          <AnalysisDrawerHandle
            isOpen={isAnalysisVisible}
            onClick={() => setIsAnalysisVisible(!isAnalysisVisible)}
          />

          <div
            className="relative ml-2"
            onClick={() => !isAnalysisVisible && setIsAnalysisVisible(true)}
          >
            {/* Add clickable overlay when collapsed */}
            {!isAnalysisVisible && (
              <div
                className="absolute inset-0 cursor-pointer"
                title="Expand analysis panel"
              />
            )}

            {/* Fixed width wrapper */}
            {isAnalysisVisible && (
              <div style={{ width: "100%" }}>{resultAnalysis}</div>
            )}
          </div>
        </div>

        {/* Fade overlay when collapsed */}
        <div
          className={`
            absolute inset-y-0 right-0 w-24
            transition-opacity duration-200
            ${isAnalysisVisible ? "opacity-0 pointer-events-none" : "opacity-100"}
            bg-gradient-to-r from-transparent 
            via-white/50 to-white
            dark:via-gray-800/50 dark:to-gray-800
          `}
        />
      </div>
    </div>
  );

  useEffect(() => {
    let tabs: TabItem[] = [];
    const tableData = stepData?.data;

    if (tableData) {
      const roundedData = roundColumns(tableData.data, tableData.columns);
      tabs.push({
        component: renderContent(
          <Table
            rootClassNames="lg:pl-0"
            rows={roundedData}
            columns={tableData.columns
              .filter((d) => d.title !== "index")
              .map((d) => {
                d.render = (text: string) => <div>{text}</div>;
                return d;
              })}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          />
        ),
        key: "table",
        tabLabel: "Table",
        icon: <TableIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
      });
    }

    if (!chartImages || chartImages.length <= 0) {
      if (stepData) {
        tabs.push({
          component: renderContent(
            <ErrorBoundary>{chartContainer}</ErrorBoundary>
          ),
          key: "chart",
          tabLabel: "Chart",
          icon: <ChartBarIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
        });
      }
    } else {
      tabs.push({
        component: (
          <ErrorBoundary>
            <ChartImage apiEndpoint={apiEndpoint} images={chartImages} />
          </ErrorBoundary>
        ),
        key: "chart",
        tabLabel: chartNames[chartImages[0].type] || "Chart",
      });
    }

    if (toolCode !== null) {
      tabs.push({
        component: (
          <ErrorBoundary>
            <>
              <p>The following code was run:</p>
              <Editor
                className="language-python table-code-ctr"
                value={toolCode}
                highlight={(code) =>
                  highlight(code, languages.python, "python")
                }
                onValueChange={(newVal) => updateCodeAndSql("code", newVal)}
              />
            </>
          </ErrorBoundary>
        ),
        key: "code",
        tabLabel: "Code",
      });
    }

    setResults(tabs);
  }, [stepData, chartImages, toolCode, sqlQuery, isAnalysisVisible]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement === document.body) {
        // If any modifier keys are pressed, do not match
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
          return;
        }
        if (matchesKey(e.key, KEYMAP.TOGGLE_ANALYSIS)) {
          setIsAnalysisVisible((prev) => !prev);
          e.preventDefault();
        }
        // Only handle chart options when chart tab is active
        if (
          matchesKey(e.key, KEYMAP.TOGGLE_CHART_OPTIONS) &&
          activeTab === "chart"
        ) {
          setIsChartOptionsExpanded((prev) => !prev);
          e.preventDefault();
        }
        // Add handlers for table/chart view switching
        if (matchesKey(e.key, KEYMAP.VIEW_TABLE)) {
          analysisTreeManager?.setActiveTab(analysisId, "table");
          e.preventDefault();
        }
        if (matchesKey(e.key, KEYMAP.VIEW_CHART)) {
          analysisTreeManager?.setActiveTab(analysisId, "chart");
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [activeTab, analysisId, analysisTreeManager]);

  return (
    <div className="table-chart-ctr" ref={tableChartRef}>
      <div className="flex flex-col w-full">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-4" aria-label="Tabs">
              {results.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() =>
                    analysisTreeManager.setActiveTab(analysisId, tab.key)
                  }
                  className={`
                    px-3 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2
                    ${
                      activeTab === tab.key
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <span className="flex items-center">
                    {tab.icon}
                    {tab.tabLabel}
                  </span>
                  {tab.key === "table" && (
                    <KeyboardShortcutIndicator
                      shortcut={KEYMAP.VIEW_TABLE}
                      className="opacity-50 px-1 py-0.5"
                    />
                  )}
                  {tab.key === "chart" && (
                    <KeyboardShortcutIndicator
                      shortcut={KEYMAP.VIEW_CHART}
                      className="opacity-50 px-1 py-0.5"
                    />
                  )}
                </button>
              ))}
            </nav>
            <Button
              onClick={async () => {
                await saveCsv();
              }}
              title="Download CSV"
              disabled={csvLoading}
              variant="ghost"
              className="flex mb-2 items-center px-2.5 py-1.5 hover:text-white text-white rounded-md border border-blue-200/50 
                bg-blue-500 hover:bg-blue-600/95 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 
                shadow-sm  transition-all duration-200 
                dark:border-blue-700/50 dark:hover:border-blue-600/50
                hover:shadow-md hover:-translate-y-0.5
                group"
            >
              <Download size={16} className="mr-1" />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          {results.map((tab) => {
            // tab.key === activeTab
            return (
              <div
                key={tab.key}
                className={
                  tab.key === activeTab
                    ? "z-2"
                    : "absolute overflow-hidden top-[-100%] z-[-1] pointer-events-none *:pointer-events-none opacity-0"
                }
              >
                {tab.component}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
