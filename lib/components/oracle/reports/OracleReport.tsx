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
                  <>
                    {/* display question if it exists */}
                    {selectedAnalysis.inputs?.question && (
                      <p className="text-sm text-gray-500 dark:text-gray-100">
                        {selectedAnalysis.inputs?.question}
                      </p>
                    )}

                    {/* display sources */}
                    {selectedAnalysis.result?.reference_sources && (
                      <div>
                        <h3>Reference Sources</h3>
                        <ul>
                          {selectedAnalysis.result.reference_sources.map(
                            (source, i) => (
                              <li key={i}>
                                <a href={source.url} target="_blank">
                                  {source.source}
                                </a>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {/* display the answer */}
                    {selectedAnalysis.result.answer && (
                      <div>{selectedAnalysis.result.answer}</div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </OracleReportContext.Provider>
  );
}
