import { CitationItem } from "@oracle";
import { marked } from "marked";
import { useContext, useEffect, useState } from "react";
import { OracleReportContext } from "../../utils/OracleReportContext";
import { SqlAnalysisContent } from "./SqlAnalysisContent";
import { WebSearchContent } from "./WebSearchContent";
import { PdfCitationsContent } from "./PdfCitationsContent";

interface ReportCitationsContentProps {
  citations: CitationItem[];
  setSelectedAnalysisIndex?: (index: number) => void;
}

export function ReportCitationsContent({
  citations,
  setSelectedAnalysisIndex,
}: ReportCitationsContentProps) {
  const { analyses } = useContext(OracleReportContext);
  // Track which analysis indices have been found to enable highlighting
  const [foundAnalysisIds, setFoundAnalysisIds] = useState<Set<string>>(
    new Set()
  );
  // Track which citations are expanded
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(
    new Set()
  );
  // Track the view mode for SQL content
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  // Track SQL query visibility - default to hidden
  const [showSqlQuery, setShowSqlQuery] = useState<boolean>(false);

  // Find analysis IDs in document titles
  useEffect(() => {
    if (!citations || !analyses) return;

    const foundIds = new Set<string>();

    citations.forEach((item) => {
      if (
        item.citations &&
        Array.isArray(item.citations) &&
        item.citations.length > 0
      ) {
        const documentTitle = item.citations[0].document_title;
        if (documentTitle) {
          const parts = documentTitle.split(":");
          if (parts.length >= 2) {
            const analysisId = parts[parts.length - 1].trim();
            const exists = analyses.some(
              (analysis) => analysis.analysis_id === analysisId
            );
            if (exists) {
              foundIds.add(analysisId);
            }
          }
        }
      }
    });

    setFoundAnalysisIds(foundIds);
  }, [citations, analyses]);

  if (!citations || citations.length === 0) {
    return null;
  }

  // Function to handle citation click and expand/collapse the analysis content
  const handleCitationClick = (index: number, documentTitle: string) => {
    // Parse the analysis_id from document_title format "some_text:analysis_id"
    const parts = documentTitle.split(":");
    if (parts.length < 2) return;

    const analysisId = parts[parts.length - 1].trim();

    // Find the index of the analysis in the analyses array
    const analysisIndex = analyses.findIndex(
      (analysis) => analysis.analysis_id === analysisId
    );

    if (analysisIndex !== -1) {
      // Toggle the expanded state for this citation
      setExpandedCitations((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    }
  };

  // Function to get the appropriate analysis component based on document type
  const getAnalysisContent = (documentTitle: string, analysisIndex: number) => {
    if (!analyses || analysisIndex === -1) return null;

    const analysis = analyses[analysisIndex];

    if (documentTitle.includes("text_to_sql")) {
      return (
        <div className="mt-2 border-l-2 border-blue-400 pl-3 py-2 bg-white dark:bg-gray-800 rounded">
          <div className="flex items-center justify-start space-x-2 mb-3">
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
          <SqlAnalysisContent
            analysis={analysis}
            viewMode={viewMode}
            showSqlQuery={showSqlQuery}
            setShowSqlQuery={setShowSqlQuery}
          />
        </div>
      );
    }

    if (documentTitle.includes("pdf_citations")) {
      return (
        <div className="mt-2 border-l-2 border-blue-400 pl-3 py-2 bg-white dark:bg-gray-800 rounded">
          <PdfCitationsContent analysis={analysis} />
        </div>
      );
    }

    if (documentTitle.includes("web_search")) {
      return (
        <div className="mt-2 border-l-2 border-blue-400 pl-3 py-2 bg-white dark:bg-gray-800 rounded">
          <WebSearchContent analysis={analysis} />
        </div>
      );
    }

    return (
      <div className="mt-2 border-l-2 border-blue-400 pl-3 py-2 text-sm bg-white dark:bg-gray-800 rounded">
        <div className="font-medium mb-1 text-gray-700 dark:text-gray-200">
          Analysis
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
        {citations.map((item, index) => (
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
                  <div
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mt-1 flex flex-wrap items-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={() =>
                      handleCitationClick(
                        index,
                        item.citations[0].document_title
                      )
                    }
                  >
                    <div className="flex items-center w-full">
                      {item.citations[0].document_title.includes(
                        "text_to_sql"
                      ) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                      )}
                      {item.citations[0].document_title.includes(
                        "pdf_citations"
                      ) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      )}
                      {item.citations[0].document_title.includes(
                        "web_search"
                      ) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      )}
                      <span className="break-all flex-grow">Dig Deeper</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-3.5 w-3.5 ml-1 text-blue-500 dark:text-blue-400 transition-transform ${
                          expandedCitations.has(index) ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    {item.citations[0].start_page_number && (
                      <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Pages {item.citations[0].start_page_number}-
                        {item.citations[0].end_page_number}
                      </span>
                    )}
                  </div>

                  {expandedCitations.has(index) && (
                    <div className="mt-2 transition-all duration-200 ease-in-out max-h-[500px] overflow-y-auto">
                      {getAnalysisContent(
                        item.citations[0].document_title,
                        analyses.findIndex(
                          (analysis) =>
                            analysis.analysis_id ===
                            item.citations[0].document_title
                              .split(":")
                              .pop()
                              ?.trim()
                        )
                      )}
                    </div>
                  )}
                </>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
