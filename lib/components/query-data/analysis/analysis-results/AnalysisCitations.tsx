import { useContext, useEffect, useState } from "react";
import {
  AnalysisRowFromBackend,
  PDFSearchResults,
  Citation,
} from "../analysisManager";
import { fetchPDFSearchResults } from "../../queryDataUtils";
import { QueryDataEmbedContext } from "@agent";

export function AnalysisCitations({
  analysis,
}: {
  analysis: AnalysisRowFromBackend;
}) {
  const [loading, setLoading] = useState(true);
  const [pdfSearchResults, setPdfSearchResults] =
    useState<PDFSearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false);
  const { apiEndpoint, token } = useContext(QueryDataEmbedContext);

  // Function to fetch PDF search results if not already present
  const fetchCitationsIfNeeded = async () => {
    if (!analysis.analysis_id || !analysis.data?.sql) return;

    try {
      setLoading(true);
      const results = await fetchPDFSearchResults(
        analysis.analysis_id,
        apiEndpoint,
        token
      );

      if (typeof results === "string" && results.startsWith("Error:")) {
        setError(results);
        setPdfSearchResults(null);
      } else {
        setPdfSearchResults(results as PDFSearchResults);
        setError(null);
      }
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setPdfSearchResults(null);
    } finally {
      setLoading(false);
      setHasFetchedInitially(true);
    }
  };

  useEffect(() => {
    if (analysis.data?.pdf_search_results) {
      // Check if the result is an error message (string that starts with "Error:")
      if (
        typeof analysis.data.pdf_search_results === "string" &&
        analysis.data.pdf_search_results.startsWith("Error:")
      ) {
        setError(analysis.data.pdf_search_results);
        setPdfSearchResults(null);
      } else {
        setPdfSearchResults(
          analysis.data.pdf_search_results as PDFSearchResults
        );
        setError(null);
      }
      setLoading(false);
      setHasFetchedInitially(true);
    } else if (analysis.data?.sql && !hasFetchedInitially) {
      // If we have SQL but no PDF search results yet, fetch them
      fetchCitationsIfNeeded();
    } else if (!analysis.data?.pdf_search_results) {
      setLoading(true);
      setPdfSearchResults(null);
      setError(null);
    }
  }, [
    analysis.data?.pdf_search_results,
    analysis.data?.sql,
    hasFetchedInitially,
  ]);

  if (loading) {
    return (
      <div className="mt-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">
          Citations
        </h3>
        <div className="text-sm text-gray-600 italic">
          Loading citations from PDF documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">
          Citations
        </h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!pdfSearchResults || pdfSearchResults.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">
          Citations
        </h3>
        <div className="text-sm text-gray-600 italic">
          No relevant citations found in PDF documents.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-[600px] overflow-auto">
      <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">
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
                  className="p-3 bg-gray-50 rounded-md border border-gray-200"
                >
                  <p className="text-sm mb-2">{item.text}</p>
                  <div className="text-xs text-gray-500 mt-1">
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
                  <p>{item.text}</p>
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
