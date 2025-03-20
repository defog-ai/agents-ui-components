import { OracleAnalysis } from "@oracle";
import { AnalysisList } from "./AnalysisList";
import { AnalysisContent } from "./AnalysisContent";

interface AnalysisPanelProps {
  analyses: OracleAnalysis[];
  selectedAnalysisIndex: number;
  setSelectedAnalysisIndex: (index: number) => void;
  viewMode: "table" | "chart";
  setViewMode: (mode: "table" | "chart") => void;
  showSqlQuery: boolean;
  setShowSqlQuery: (show: boolean) => void;
}

export function AnalysisPanel({
  analyses,
  selectedAnalysisIndex,
  setSelectedAnalysisIndex,
  viewMode,
  setViewMode,
  showSqlQuery,
  setShowSqlQuery,
}: AnalysisPanelProps) {
  // Get the currently selected analysis
  const selectedAnalysis =
    analyses.length > 0 ? analyses[selectedAnalysisIndex] || null : null;

  return (
    <div className="analysis-panel w-full lg:w-[600px] xl:w-[650px] 2xl:w-[800px] lg:sticky lg:top-4 self-start max-h-[calc(100vh-1rem)] flex flex-col border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 mt-4 lg:mt-0">
      {/* Header with view mode toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Analysis Results
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "table"
                ? "bg-primary-highlight text-gray-200 dark:bg-blue-600 dark:text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode("chart")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "chart"
                ? "bg-primary-highlight text-gray-200 dark:bg-blue-600 dark:text-white"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {/* Main content area - flex column on small screens, flex row on medium+ */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Questions sidebar - horizontal scrolling tabs on mobile, vertical sidebar on md+ */}
        <AnalysisList
          analyses={analyses}
          selectedAnalysisIndex={selectedAnalysisIndex}
          onSelectAnalysis={setSelectedAnalysisIndex}
        />

        {/* Content area */}
        <div className="w-full overflow-auto p-3 bg-white dark:bg-gray-800">
          <AnalysisContent
            analysis={selectedAnalysis}
            viewMode={viewMode}
            showSqlQuery={showSqlQuery}
            setShowSqlQuery={setShowSqlQuery}
          />
        </div>
      </div>
    </div>
  );
}