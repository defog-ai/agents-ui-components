import { useContext, useEffect, useState } from "react";
import {
  AnalysisRowFromBackend,
  PDFSearchResults,
  Citation,
  AnalysisManager,
} from "../analysisManager";
import { fetchPDFSearchResults } from "../../queryDataUtils";
import { QueryDataEmbedContext } from "@agent";
import { SpinningLoader } from "@ui-components";

export function AnalysisCitations({
  analysis,
  analysisManager,
}: {
  analysis: AnalysisRowFromBackend;
  analysisManager: AnalysisManager;
}) {
  const [loading, setLoading] = useState(true);

  const [pdfSearchResults, setPdfSearchResults] = useState<
    PDFSearchResults | string
  >(analysis?.data?.pdf_search_results);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pdfSearchResults || analysis.data?.pdf_search_results) {
      // Check if the result is an error message (string that starts with "Error:")
      if (typeof analysis.data.pdf_search_results === "string") {
        setError(analysis.data.pdf_search_results);
        setPdfSearchResults(null);
      } else {
        setPdfSearchResults(analysis.data.pdf_search_results);
        setError(null);
      }
      setLoading(false);
    } else if (analysis.data?.sql && !pdfSearchResults) {
      // fetch them here
      analysisManager.getPdfSearchResults();
    } else if (!analysis.data?.pdf_search_results) {
      setLoading(true);
      setPdfSearchResults(null);
      setError(null);
    }
  }, [analysis]);

  if (loading) {
    return (
      <div className="mt-4 text-xs h-40 flex items-center justify-center bg-gray-50 border-gray-500 text-gray-600 dark:bg-gray-800/30 dark:border-gray-500 dark:text-gray-200">
        <SpinningLoader classNames="mr-2" /> Searching in your PDFs..
      </div>
    );
  }

  if (error || !Array.isArray(pdfSearchResults)) {
    return (
      <div className="mt-4 text-xs h-40 flex items-center justify-center bg-red-100 border-red-500 text-red-800 dark:bg-red-800/30 dark:border-red-500 dark:text-red-200">
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  if (!pdfSearchResults || pdfSearchResults.length === 0) {
    return (
      <div className="mt-4 text-xs h-40 flex items-center justify-center bg-gray-100 border-gray-500 text-gray-600 dark:bg-gray-800/30 dark:border-gray-500 dark:text-gray-200">
        No relevant citations found in PDF documents.
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-[600px] overflow-auto">
      <h3 className="text-sm uppercase font-semibold mb-2 text-gray-600 dark:text-gray-200">
        Citations
      </h3>
      <div className="space-y-4">
        {pdfSearchResults.map((item, index) => {
          if (item.type === "text") {
            if (
              "citations" in item &&
              item.citations &&
              item.citations.length > 0
            ) {
              // This is a CitedText
              return (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-md border border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                >
                  <p className="text-sm mb-2 dark:text-gray-200">{item.text}</p>
                  <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {item.citations.map(
                      (citation: Citation, citIndex: number) => (
                        <div key={citIndex} className="mt-1">
                          <span className="font-medium">
                            {citation.document_title}
                          </span>{" "}
                          - Page
                          {citation.start_page_number ===
                          citation.end_page_number
                            ? ` ${citation.start_page_number}`
                            : `s ${citation.start_page_number}-${citation.end_page_number}`}
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            } else {
              // This is a PlainText
              return (
                <div key={index} className="text-sm">
                  <p className="dark:text-gray-200">{item.text}</p>
                </div>
              );
            }
          }
          return null;
        })}
      </div>
    </div>
  );
}
