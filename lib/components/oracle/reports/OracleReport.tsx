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
  CitationItem
} from "@oracle";
import { LoadingState, ErrorState, AnalysisPanel, ReportCitationsContent } from "./components";

export function OracleReport({
  apiEndpoint,
  reportId,
  projectName,
  token,
  onReportParsed = () => {},
  onDelete = () => {},
}: {
  apiEndpoint: string;
  reportId: string;
  projectName: string;
  token: string;
  onDelete?: (reportId: string, projectName: string) => void;
  onReportParsed?: (data: ReportData | null) => void;
}) {
  const [tables, setTables] = useState<any>({});
  const [analyses, setAnalyses] = useState<OracleAnalysis[]>([]);
  const [comments, setComments] = useState<OracleReportComment[]>([]);
  const [mdx, setMDX] = useState<string | null>(null);
  const [reportWithCitations, setReportWithCitations] = useState<CitationItem[] | null>(null);
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

    const setup = async (reportId: string, projectName: string) => {
      try {
        setLoading(true);

        const data = await fetchAndParseReportData(
          apiEndpoint,
          reportId,
          projectName,
          token
        );

        data.parsed.mdx && setMDX(data.parsed.mdx);
        data.parsed.tables && setTables(data.parsed.tables);
        data.analyses && setAnalyses(data.analyses);
        data.comments && setComments(data.comments);
        data.report_with_citations && setReportWithCitations(data.report_with_citations);

        onReportParsed && onReportParsed(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    if (reportId && projectName) {
      setup(reportId, projectName);
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
        projectName,
        token,
        commentManager: commentManager({
          apiEndpoint,
          reportId,
          projectName,
          token,
          initialComments: comments,
        }),
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 relative overflow-auto">
        <div className="flex-1 relative oracle-report-ctr">
          {reportWithCitations && reportWithCitations.length > 0 ? (
            <div className="max-w-none sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto py-2 px-4 sm:px-6 md:px-10 mb-12 md:mb-0">
              <OracleNav onDelete={onDelete} />
              <ReportCitationsContent citations={reportWithCitations} />
            </div>
          ) : (
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
          )}
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
