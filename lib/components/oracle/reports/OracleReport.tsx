import { useEffect, useState } from "react";
import { SpinningLoader } from "@ui-components";
import {
  extensions,
  commentManager,
  OracleNav,
  OracleReportComment,
  OracleReportContext,
  fetchAndParseReportData,
  OracleAnalysis,
  ReportData,
} from "@oracle";
import { EditorProvider } from "@tiptap/react";
import { Tabs, Table } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { ChartContainer } from "../../observable-charts/ChartContainer";
import { marked } from "marked";

export function OracleReport({
  apiEndpoint,
  reportId,
  dbName,
  token,
  onReportParsed = () => {},
  onDelete = () => {},
}: {
  apiEndpoint: string;
  reportId: string;
  dbName: string;
  token: string;
  onDelete?: (reportId: string, dbName: string) => void;
  onReportParsed?: (data: ReportData | null) => void;
}) {
  const [tables, setTables] = useState<any>({});
  const [analyses, setAnalyses] = useState<OracleAnalysis[]>([]);
  const [comments, setComments] = useState<OracleReportComment[]>([]);

  const [mdx, setMDX] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // New state for selected analysis and view mode
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  useEffect(() => {
    const setup = async (reportId: string, dbName: string) => {
      try {
        // don't fetch if either the report is not done
        // or if it's being revised and we already have the MDX
        setLoading(true);

        let data: ReportData;

        data = await fetchAndParseReportData(
          apiEndpoint,
          reportId,
          dbName,
          token
        );

        data.parsed.mdx && setMDX(data.parsed.mdx);
        data.parsed.tables && setTables(data.parsed.tables);
        data.analyses && setAnalyses(data.analyses);
        data.comments && setComments(data.comments);

        onReportParsed && onReportParsed(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (reportId && dbName) {
      setup(reportId, dbName);
    }
  }, [reportId, dbName]);

  if (loading) {
    return (
      <div
        className={
          "w-full h-full min-h-60 flex flex-col justify-center items-center text-center rounded-md p-2 bg-white dark:bg-gray-800"
        }
      >
        <div className="mb-2 text-sm text-gray-400 dark:text-gray-200">
          <SpinningLoader classNames="w-5 h-5" />
          Loading
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          "w-full h-full min-h-60 flex flex-col justify-center items-center bg-rose-100 dark:bg-rose-900 text-red text-center rounded-md p-2"
        }
      >
        <div className="mb-2 text-sm text-rose-500 dark:text-rose-400">
          {error}
        </div>
      </div>
    );
  }

  // Filter analyses to only include those without errors
  const validAnalyses = analyses.filter(
    (analysis) => !analysis?.error || analysis.error === ""
  );

  console.log("validAnalyses", validAnalyses);

  // Get the currently selected analysis
  const selectedAnalysis = validAnalyses[selectedAnalysisIndex] || null;

  return (
    <OracleReportContext.Provider
      value={{
        apiEndpoint: apiEndpoint,
        tables: tables,
        multiTables: {},
        images: {},
        analyses: analyses,
        executiveSummary: null,
        reportId: reportId,
        dbName: dbName,
        token: token,
        commentManager: commentManager({
          apiEndpoint: apiEndpoint,
          reportId: reportId,
          dbName: dbName,
          token: token,
          initialComments: comments,
        }),
      }}
    >
      <div className="flex gap-4 relative">
        <div className="flex-1 relative oracle-report-ctr">
          <EditorProvider
            extensions={extensions}
            content={mdx}
            immediatelyRender={false}
            editable={false}
            slotBefore={<OracleNav onDelete={onDelete} />}
            editorProps={{
              attributes: {
                class:
                  "max-w-4xl oracle-report-tiptap relative prose prose-base dark:prose-invert mx-auto py-2 px-10 mb-12 md:mb-0 focus:outline-none *:cursor-default",
              },
            }}
          ></EditorProvider>
        </div>

        {/* New UI for analyses */}
        {validAnalyses.length > 0 && (
          <div className="w-[600px] 2xl:w-[800px] sticky top-4 self-start max-h-[calc(100vh-2rem)] flex flex-col border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
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

            {/* Main content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Questions sidebar */}
              <div className="w-[250px] border-r dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800">
                {validAnalyses.map((analysis, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnalysisIndex(index)}
                    className={`w-full text-left p-3 border-b dark:border-gray-700 text-sm ${
                      selectedAnalysisIndex === index
                        ? "bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100 h-auto"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {/* Use max-height transition for smooth expansion */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        selectedAnalysisIndex === index
                          ? "max-h-[500px]"
                          : "max-h-[4.5rem] hover:max-h-[500px]"
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

              {/* Content area */}
              <div className="w-full overflow-auto p-3 bg-white dark:bg-gray-800">
                {selectedAnalysis.analysis_id ? (
                  <>
                    {viewMode === "table" ? (
                      <Table
                        columns={selectedAnalysis.columns}
                        rows={selectedAnalysis.rows}
                        columnHeaderClassNames="py-2"
                        skipColumns={["index"]}
                      />
                    ) : (
                      <ErrorBoundary>
                        <ChartContainer
                          key={`chart-${selectedAnalysisIndex}`}
                          rows={selectedAnalysis.rows}
                          columns={selectedAnalysis.columns}
                          initialQuestion={selectedAnalysis.question}
                          initialOptionsExpanded={false}
                        />
                      </ErrorBoundary>
                    )}
                  </>
                ) : selectedAnalysis.function_name === "web_search_tool" ? (
                  <div className="flex flex-col space-y-4">
                    {/* Question header with icon */}
                    {selectedAnalysis.inputs?.question && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600">
                        <div className="flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Question</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {selectedAnalysis.inputs.question}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Answer with markdown */}
                    {selectedAnalysis.result?.answer && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Answer from Web Search</h4>
                        </div>
                        <div className="prose dark:prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(selectedAnalysis.result.answer) }} />
                      </div>
                    )}

                    {/* Reference sources card */}
                    {selectedAnalysis.result?.reference_sources && selectedAnalysis.result.reference_sources.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b dark:border-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Reference Sources</h4>
                        </div>
                        <ul className="space-y-2">
                          {selectedAnalysis.result.reference_sources.map(
                            (source, i) => (
                              <li key={i} className="flex items-start">
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 mr-2 flex-shrink-0">
                                  {i + 1}
                                </span>
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 break-all"
                                >
                                  {source.source}
                                </a>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </OracleReportContext.Provider>
  );
}
