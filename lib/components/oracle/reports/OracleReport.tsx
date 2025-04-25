import { useEffect, useRef, useState } from "react";
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
  CitationItem,
  exportAsMarkdown,
  exportAsPdf,
  exportAsPodcast,
  toggleReportPublicStatus,
} from "@oracle";
import { Download, FileText, Mic, Globe, Copy, Check } from "lucide-react";
import { Button, Modal } from "@ui-components";
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
  const [reportWithCitations, setReportWithCitations] = useState<
    CitationItem[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isPublicToggleLoading, setIsPublicToggleLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

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
        data.report_with_citations &&
          setReportWithCitations(data.report_with_citations);
        
        // Check if the report has public sharing enabled
        if (data.is_public !== undefined) {
          setIsPublic(data.is_public);
        }
        
        if (data.public_url) {
          setPublicUrl(data.public_url);
        }

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
  
  // Handle toggling the public status
  const handleTogglePublic = async () => {
    try {
      setIsPublicToggleLoading(true);
      const result = await toggleReportPublicStatus(
        apiEndpoint,
        reportId,
        token,
        projectName,
        !isPublic
      );
      
      setIsPublic(!isPublic);
      
      if (result.public_url) {
        setPublicUrl(result.public_url);
        
        // If making public, show the share modal
        if (!isPublic) {
          setShareModalOpen(true);
        }
      } else {
        setPublicUrl(null);
      }
    } catch (e) {
      console.error("Error toggling public status:", e);
    } finally {
      setIsPublicToggleLoading(false);
    }
  };
  
  // Copy public URL to clipboard
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    if (publicUrl) {
      const fullUrl = window.location.origin + publicUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Function to handle exporting as Markdown
  const handleExportMarkdown = () => {
    const fileName = `report-${reportId}.md`;
    // For citation-based reports, we'll generate simple markdown
    const markdownContent = reportWithCitations
      ? reportWithCitations.map((item) => item.text || "").join("\n\n")
      : mdx || "";
    exportAsMarkdown(markdownContent, fileName);
    setExportDropdownOpen(false);
  };

  // Function to handle exporting as PDF
  const handleExportPdf = () => {
    const fileName = `report-${reportId}.pdf`;
    // For citation-based reports, we'll generate simple markdown
    const markdownContent = reportWithCitations
      ? reportWithCitations.map((item) => item.text || "").join("\n\n")
      : mdx || "";
    exportAsPdf(markdownContent, fileName);
    setExportDropdownOpen(false);
  };

  // Function to handle exporting as Podcast
  const handleExportPodcast = () => {
    try {
      // For citation-based reports, we'll generate simple markdown
      const markdownContent = reportWithCitations
        ? reportWithCitations.map((item) => item.text || "").join("\n\n")
        : mdx || "";
      setExportDropdownOpen(false);
      exportAsPodcast(
        markdownContent,
        reportId,
        apiEndpoint,
        projectName,
        token,
        setIsPodcastLoading
      ).catch((error) => {
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  };

  // This was moved up to maintain hooks order

  const ExportDropdown = () => (
    <div className="relative z-50" ref={exportDropdownRef}>
      <Button
        variant="secondary"
        onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
        className={exportDropdownOpen ? "bg-gray-100 dark:bg-gray-700" : ""}
      >
        <Download className="w-5 h-5" />
      </Button>

      {exportDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border dark:border-gray-700">
          <div className="py-1">
            <button
              onClick={handleExportMarkdown}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as Markdown
            </button>
            <button
              onClick={handleExportPdf}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </button>
            <button
              onClick={handleExportPodcast}
              disabled={isPodcastLoading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              {isPodcastLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
                  Generating podcast...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Export as Podcast
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
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
        isLoading: isPodcastLoading,
        setIsLoading: setIsPodcastLoading,
      }}
    >
      <div className="relative overflow-auto">
        {isPodcastLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 flex flex-col items-center shadow-lg">
              <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                Generating podcast transcript...
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                This may take a minute, please wait.
              </p>
            </div>
          </div>
        )}
        <div className="relative oracle-report-ctr w-full">
          {reportWithCitations && reportWithCitations.length > 0 ? (
            <div className="w-full max-w-none sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto py-2 px-2 sm:px-4 md:px-6 mb-12 md:mb-0">
              <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between px-4 py-2 border-b dark:border-gray-700">
                <Button
                  variant="danger"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant={isPublic ? "primary" : "secondary"}
                    onClick={handleTogglePublic}
                    disabled={isPublicToggleLoading}
                    className="flex items-center"
                  >
                    {isPublicToggleLoading ? (
                      <div className="w-4 h-4 border-t-2 border-current border-solid rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Globe className="w-4 h-4 mr-2" />
                    )}
                    {isPublic ? "Published" : "Publish Publicly"}
                  </Button>
                  
                  <ExportDropdown />
                </div>

                <Modal
                  open={deleteModalOpen}
                  onOk={() => {
                    onDelete(reportId, projectName);
                    setDeleteModalOpen(false);
                  }}
                  onCancel={() => setDeleteModalOpen(false)}
                  okText="Yes, Delete"
                  okVariant="danger"
                  title="Delete Report"
                >
                  <p>
                    Are you sure you want to delete this report? This action
                    cannot be undone.
                  </p>
                </Modal>
                
                <Modal
                  open={shareModalOpen}
                  onOk={() => setShareModalOpen(false)}
                  onCancel={() => setShareModalOpen(false)}
                  okText="Close"
                  title="Share Report"
                >
                  <div className="mb-4">
                    <p className="mb-2">
                      Your report is now publicly accessible. Share this link with anyone to view the report:
                    </p>
                    <div className="flex items-center mt-3">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl ? window.location.origin + publicUrl : ""}
                        className="flex-grow p-2 border rounded-l-md bg-gray-50 dark:bg-gray-800 text-sm"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-md"
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Note: Anyone with this link can view this report without logging in.
                  </p>
                </Modal>
              </div>
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
