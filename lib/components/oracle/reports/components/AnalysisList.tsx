import { OracleAnalysis } from "@oracle";

interface AnalysisListProps {
  analyses: OracleAnalysis[];
  selectedAnalysisIndex: number;
  onSelectAnalysis: (index: number) => void;
}

export function AnalysisList({
  analyses,
  selectedAnalysisIndex,
  onSelectAnalysis,
}: AnalysisListProps) {
  return (
    <div className="w-full md:w-[250px] md:border-r dark:border-gray-700 overflow-x-auto md:overflow-x-visible md:overflow-y-auto bg-white dark:bg-gray-800">
      <div className="flex md:flex-col min-w-max md:min-w-0">
        {analyses.map((analysis, index) => (
          <button
            key={index}
            onClick={() => onSelectAnalysis(index)}
            className={`flex-shrink-0 md:flex-shrink text-left p-3 md:w-full border-b dark:border-gray-700 text-sm ${
              index === 0 ? "" : "md:border-t-0"
            } ${
              selectedAnalysisIndex === index
                ? "bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100 h-auto"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {/* Analysis type badge */}
            <div className="flex items-center mb-1.5">
              {analysis.analysis_id && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mr-1.5">
                  SQL
                </span>
              )}
              {analysis.function_name === "web_search_tool" && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 mr-1.5">
                  Web
                </span>
              )}
              {analysis.function_name === "pdf_citations_tool" && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mr-1.5">
                  PDF
                </span>
              )}
            </div>
            
            {/* Use max-height transition for smooth expansion */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                selectedAnalysisIndex === index
                  ? "max-h-[500px] min-w-[240px] md:min-w-0"
                  : "max-h-[4.5rem] min-w-[180px] md:min-w-0 hover:max-h-[500px]"
              }`}
            >
              <p
                className={`${
                  selectedAnalysisIndex === index
                    ? "line-clamp-none"
                    : "line-clamp-3 hover:line-clamp-none"
                }`}
              >
                {analysis?.question || analysis?.inputs?.question}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}