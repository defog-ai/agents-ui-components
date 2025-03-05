import { useEffect, useState } from "react";
import { EditorProvider } from "@tiptap/react";
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
import { LoadingState, ErrorState, AnalysisPanel } from "./components";

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

  // State for analysis panel
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [showSqlQuery, setShowSqlQuery] = useState<boolean>(false);

  useEffect(() => {
    // Skip if we're already loading or if we have data
    if (loading === false && mdx !== null) {
      return;
    }

    const setup = async (reportId: string, dbName: string) => {
      try {
        setLoading(true);

        const data = await fetchAndParseReportData(
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
  }, [reportId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  // Filter analyses to only include those without errors
  const validAnalyses = analyses.filter(
    (analysis) => !analysis?.error || analysis.error === ""
  );

  return (
    <OracleReportContext.Provider
      value={{
        apiEndpoint,
        tables,
        multiTables: {},
        images: {},
        analyses,
        executiveSummary: {
          title: "",
          introduction: "",
          recommendations: [],
        },
        reportId,
        dbName,
        token,
        commentManager: commentManager({
          apiEndpoint,
          reportId,
          dbName,
          token,
          initialComments: comments,
        }),
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 relative overflow-auto">
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
          />
        </div>

        {/* Analysis panel */}
        {validAnalyses.length > 0 && (
          <AnalysisPanel
            analyses={validAnalyses}
            selectedAnalysisIndex={selectedAnalysisIndex}
            setSelectedAnalysisIndex={setSelectedAnalysisIndex}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showSqlQuery={showSqlQuery}
            setShowSqlQuery={setShowSqlQuery}
          />
        )}
      </div>
    </OracleReportContext.Provider>
  );
}
