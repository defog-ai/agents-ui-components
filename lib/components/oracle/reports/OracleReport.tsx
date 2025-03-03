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
import { Table } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { ChartContainer } from "../../observable-charts/ChartContainer";
import { CodeEditor } from "../../query-data/analysis/analysis-results/CodeEditor";
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
  const [showSqlQuery, setShowSqlQuery] = useState<boolean>(false);

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
      } catch (e: any) {
        console.error(e);
        setError(e.message || String(e));
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

  // Get the currently selected analysis
  const selectedAnalysis =
    validAnalyses.length > 0
      ? validAnalyses[selectedAnalysisIndex] || null
      : null;

  return (
    <OracleReportContext.Provider
      value={{
        apiEndpoint: apiEndpoint,
        tables: tables,
        multiTables: {},
        images: {},
        analyses: analyses,
        executiveSummary: {
          title: "",
          introduction: "",
          recommendations: [],
        },
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
      <div className="flex flex-col lg:flex-row gap-4 relative">
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
                  "max-w-none sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl oracle-report-tiptap relative prose prose-base dark:prose-invert mx-auto py-2 px-4 sm:px-6 md:px-10 mb-12 md:mb-0 focus:outline-none *:cursor-default",
              },
            }}
          ></EditorProvider>
        </div>

        {/* New UI for analyses */}
        {validAnalyses.length > 0 && (
          <div className="w-full lg:w-[600px] xl:w-[650px] 2xl:w-[800px] lg:sticky lg:top-4 self-start max-h-[calc(100vh-1rem)] flex flex-col border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 mt-4 lg:mt-0">
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
              <div className="w-full md:w-[250px] md:border-r dark:border-gray-700 overflow-x-auto md:overflow-x-visible md:overflow-y-auto bg-white dark:bg-gray-800">
                <div className="flex md:flex-col min-w-max md:min-w-0">
                  {validAnalyses.map((analysis, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnalysisIndex(index)}
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

              {/* Content area */}
              <div className="w-full overflow-auto p-3 bg-white dark:bg-gray-800">
                {selectedAnalysis && selectedAnalysis.analysis_id ? (
                  <div className="flex flex-col space-y-4">
                    {/* Question header with icon */}
                    {selectedAnalysis.question && (
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
                              {selectedAnalysis.question}
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
                        {(selectedAnalysis as any)?.db_name || "Database"}
                      </span>
                      {selectedAnalysis.rows && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
                          {selectedAnalysis.rows.length}{" "}
                          {selectedAnalysis.rows.length === 1 ? "row" : "rows"}
                        </span>
                      )}
                    </div>

                    {/* SQL Results with Query Toggle */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between p-3 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-indigo-500 dark:text-indigo-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                          </svg>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {viewMode === "table" ? "SQL Results" : "SQL Chart"}
                          </h4>
                        </div>

                        {(selectedAnalysis as any)?.sql && (
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
                      {showSqlQuery && (selectedAnalysis as any)?.sql && (
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
                                  (selectedAnalysis as any).sql || ""
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
                              code={(selectedAnalysis as any).sql || ""}
                              language="sql"
                              editable={false}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div className="p-2 sm:p-3">
                        {viewMode === "table" ? (
                          <div className="w-full overflow-x-auto">
                            <Table
                              columns={selectedAnalysis.columns}
                              rows={selectedAnalysis.rows}
                              columnHeaderClassNames="py-2"
                              skipColumns={["index"]}
                              rootClassNames="shadow-sm min-w-[400px]"
                            />
                          </div>
                        ) : (
                          <ErrorBoundary>
                            <div className="min-h-[250px] sm:min-h-[300px]">
                              <ChartContainer
                                key={`chart-${selectedAnalysisIndex}`}
                                rows={selectedAnalysis.rows}
                                columns={selectedAnalysis.columns}
                                initialQuestion={selectedAnalysis.question}
                                initialOptionsExpanded={false}
                              />
                            </div>
                          </ErrorBoundary>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedAnalysis &&
                  selectedAnalysis.function_name === "web_search_tool" ? (
                  <div className="flex flex-col space-y-4">
                    {/* Question header with icon */}
                    {selectedAnalysis.inputs?.question && (
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
                              Question
                            </h4>
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-green-500 dark:text-green-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Answer from Web Search
                          </h4>
                        </div>
                        <div
                          className="prose dark:prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: marked.parse(
                              selectedAnalysis.result.answer
                            ),
                          }}
                        />
                      </div>
                    )}

                    {/* Reference sources card */}
                    {selectedAnalysis.result?.reference_sources &&
                      Array.isArray(
                        selectedAnalysis.result.reference_sources
                      ) &&
                      selectedAnalysis.result.reference_sources.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b dark:border-gray-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Reference Sources
                            </h4>
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
                ) : selectedAnalysis &&
                  selectedAnalysis.function_name === "pdf_citations_tool" ? (
                  <div className="flex flex-col space-y-4">
                    {/* Question header with icon */}
                    {selectedAnalysis.inputs?.question && (
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
                              Question
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {selectedAnalysis.inputs.question}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PDF Citations Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          PDF Citations
                        </h4>
                      </div>

                      {Array.isArray(selectedAnalysis.result) &&
                        selectedAnalysis.result.map((item, index) => (
                          <div key={index} className="mb-4 relative group">
                            <div
                              className="prose dark:prose-invert prose-sm max-w-none py-1"
                              dangerouslySetInnerHTML={{
                                __html: marked.parse(item.text),
                              }}
                            />

                            {item.citations &&
                              Array.isArray(item.citations) &&
                              item.citations.length > 0 && (
                                <>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3 w-3 mr-1 flex-shrink-0"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                    <span className="italic mr-1">Source:</span>
                                    <span className="break-all">
                                      {item.citations[0].document_title}
                                    </span>
                                    {item.citations[0].start_page_number && (
                                      <span className="ml-1">
                                        (Pages{" "}
                                        {item.citations[0].start_page_number}-
                                        {item.citations[0].end_page_number})
                                      </span>
                                    )}
                                  </div>

                                  {/* Citation hover/touch panel - adaptive for mobile */}
                                  <div className="absolute left-0 right-0 -bottom-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible md:transition-all md:duration-200 transform translate-y-full z-10">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 mt-2 shadow-lg">
                                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Cited Text:
                                      </h5>
                                      <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                        "{item.citations[0].cited_text}"
                                      </p>
                                    </div>
                                  </div>

                                  {/* Mobile-friendly citation toggle button */}
                                  <button 
                                    className="text-xs text-blue-600 dark:text-blue-400 mt-1 block md:hidden"
                                    onClick={(e) => {
                                      // Find the next sibling (the citation panel) and toggle its visibility
                                      const panel = e.currentTarget.parentElement?.querySelector('.mobile-citation-panel');
                                      if (panel) {
                                        panel.classList.toggle('hidden');
                                      }
                                    }}
                                  >
                                    View citation
                                  </button>

                                  {/* Mobile citation panel (initially hidden) */}
                                  <div className="mobile-citation-panel hidden mt-2 md:hidden">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 shadow-sm">
                                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Cited Text:
                                      </h5>
                                      <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                        "{item.citations[0].cited_text}"
                                      </p>
                                    </div>
                                  </div>
                                </>
                              )}
                          </div>
                        ))}
                    </div>
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
