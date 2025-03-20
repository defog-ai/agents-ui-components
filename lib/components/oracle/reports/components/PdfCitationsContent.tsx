import { OracleAnalysis } from "@oracle";
import { marked } from "marked";

interface PdfCitationsContentProps {
  analysis: OracleAnalysis;
}

export function PdfCitationsContent({ analysis }: PdfCitationsContentProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Question header with icon */}
      {analysis.inputs?.question && (
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
                {analysis.inputs.question}
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
            PDF Citations
          </h4>
        </div>

        {analysis.result.citations.map((item, index) => (
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
                      className="h-3 w-3 mr-1 flex-shrink-0 text-blue-500 dark:text-blue-400"
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
                        (Pages {item.citations[0].start_page_number}-
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
                      const panel =
                        e.currentTarget.parentElement?.querySelector(
                          ".mobile-citation-panel"
                        );
                      if (panel) {
                        panel.classList.toggle("hidden");
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
  );
}
