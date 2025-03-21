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
import { LoadingState, ErrorState, ReportCitationsContent } from "./components";

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
      <div className="relative overflow-auto">
        <div className="relative oracle-report-ctr w-full">
          {reportWithCitations && reportWithCitations.length > 0 ? (
            <div className="w-full max-w-none sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto py-2 px-2 sm:px-4 md:px-6 mb-12 md:mb-0">
              <OracleNav onDelete={onDelete} />
              <ReportCitationsContent 
                citations={reportWithCitations} 
              />
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
                    "w-full max-w-none sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl oracle-report-tiptap relative prose prose-base dark:prose-invert mx-auto py-2 px-2 sm:px-4 md:px-6 mb-12 md:mb-0 focus:outline-none *:cursor-default",
                },
              }}
            />
          )}
        </div>
      </div>
    </OracleReportContext.Provider>
  );
}
