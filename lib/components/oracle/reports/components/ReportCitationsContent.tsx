import { CitationItem } from "@oracle";
import { marked } from "marked";
import { useContext, useEffect, useState } from "react";
import { OracleReportContext } from "../../utils/OracleReportContext";

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
  const [foundAnalysisIds, setFoundAnalysisIds] = useState<Set<string>>(new Set());

  // Find analysis IDs in document titles
  useEffect(() => {
    if (!citations || !analyses) return;
    
    const foundIds = new Set<string>();
    
    citations.forEach(item => {
      if (item.citations && Array.isArray(item.citations) && item.citations.length > 0) {
        const documentTitle = item.citations[0].document_title;
        if (documentTitle) {
          const parts = documentTitle.split(":");
          if (parts.length >= 2) {
            const analysisId = parts[parts.length - 1].trim();
            const exists = analyses.some(analysis => analysis.analysis_id === analysisId);
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

  // Function to handle citation click and select the related analysis
  const handleCitationClick = (documentTitle: string) => {
    // Parse the analysis_id from document_title format "some_text:analysis_id"
    const parts = documentTitle.split(":");
    if (parts.length < 2) return;
    
    const analysisId = parts[parts.length - 1].trim();
    
    // Find the index of the analysis in the analyses array
    const analysisIndex = analyses.findIndex(analysis => analysis.analysis_id === analysisId);
    
    if (analysisIndex !== -1) {
      // If setSelectedAnalysisIndex prop is provided, use it directly (preferred method)
      if (setSelectedAnalysisIndex) {
        setSelectedAnalysisIndex(analysisIndex);
        return;
      }
      
      // Fallback to DOM manipulation if the prop is not available
      const analysisPanel = document.querySelector('.analysis-panel');
      if (analysisPanel) {
        const analysisButtons = analysisPanel.querySelectorAll('button[data-analysis-index]');
        if (analysisButtons && analysisButtons.length > analysisIndex) {
          (analysisButtons[analysisIndex] as HTMLButtonElement).click();
        }
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Citations Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0"
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
            Report Citations
          </h4>
        </div>

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
                    onClick={() => handleCitationClick(item.citations[0].document_title)}
                  >
                    <div className="flex items-center w-full">
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
                      <span className="break-all flex-grow">
                        {item.citations[0].document_title}
                      </span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3.5 w-3.5 ml-1 text-blue-500 dark:text-blue-400" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </div>
                    {item.citations[0].start_page_number && (
                      <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Pages {item.citations[0].start_page_number}-{item.citations[0].end_page_number}
                      </span>
                    )}
                  </div>

                </>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
