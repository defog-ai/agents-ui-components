import { useState, useEffect } from "react";
import { EditorProvider } from "@tiptap/react";
import {
  extensions,
  CitationItem,
  parseMDX,
  OracleReportContext,
  OracleAnalysis,
} from "@oracle";
import { ReportCitationsContent } from "./components";
import { marked } from "marked";

export function OraclePublicReport({
  apiEndpoint,
  publicUuid,
}: {
  apiEndpoint: string;
  publicUuid: string;
}) {
  const [mdx, setMDX] = useState<string | null>(null);
  const [reportWithCitations, setReportWithCitations] = useState<
    CitationItem[] | null
  >(null);
  const [analyses, setAnalyses] = useState<OracleAnalysis[]>([]);
  const [reportName, setReportName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPublicReport = async () => {
      try {
        setLoading(true);
        
        console.log("Fetching public report with UUID:", publicUuid);
        
        // Always use the correct endpoint path
        const apiUrl = `${apiEndpoint}/public/report/${publicUuid}`;
          
        console.log("Fetching from URL:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Report data received:", data);
        const report = data.report;

        if (!report) {
          throw new Error("Invalid report format received");
        }

        if (report.mdx) {
          setMDX(report.mdx);
          const parsed = parseMDX(report.mdx);
          // Handle any additional parsing if needed
        }

        if (report.report_content_with_citations) {
          setReportWithCitations(report.report_content_with_citations);
        }

        if (report.analyses) {
          console.log("Setting analyses:", report.analyses);
          setAnalyses(report.analyses);
        }

        setReportName(report.report_name || "Report");
      } catch (e: any) {
        console.error("Error fetching report:", e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    if (publicUuid) {
      fetchPublicReport();
    }
  }, [apiEndpoint, publicUuid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <div className="text-red-500 text-2xl mb-2">Error</div>
        <div className="text-gray-700 dark:text-gray-300">{error}</div>
      </div>
    );
  }

  // Create a simplified report context object
  const reportContextValue = {
    apiEndpoint,
    tables: {},
    multiTables: {},
    images: {},
    analyses: analyses || [],
    executiveSummary: {
      title: reportName,
      introduction: "",
      recommendations: [],
    },
    reportId: "public",
    projectName: "public",
    token: "",
    commentManager: {
      subscribeToCommentUpdates: () => () => {},
      getComments: () => [],
      updateComments: () => {},
    },
    isLoading: false,
    setIsLoading: () => {},
  };

  return (
    <div className="relative overflow-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-900 shadow-sm mb-4 py-4 px-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          {reportName}
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Public Report
        </div>
      </div>

      <OracleReportContext.Provider value={reportContextValue}>
        <div className="relative oracle-report-ctr w-full">
          {reportWithCitations && reportWithCitations.length > 0 ? (
            <div className="w-full max-w-none sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto py-2 px-2 sm:px-4 md:px-6 mb-12 md:mb-0">
              <ReportCitationsContent citations={reportWithCitations} />
            </div>
          ) : (
            <EditorProvider
              extensions={extensions}
              content={mdx}
              immediatelyRender={false}
              editable={false}
              editorProps={{
                attributes: {
                  class:
                    "w-full max-w-none sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl oracle-report-tiptap relative prose prose-base dark:prose-invert mx-auto py-2 px-2 sm:px-4 md:px-6 mb-12 md:mb-0 focus:outline-none *:cursor-default",
                },
              }}
            />
          )}
        </div>
      </OracleReportContext.Provider>
    </div>
  );
}