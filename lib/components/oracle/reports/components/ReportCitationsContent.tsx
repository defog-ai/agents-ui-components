import { CitationItem } from "@oracle";
import { File } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/fonts/KaTeX_Size2-Regular.woff2";
import "katex/dist/fonts/KaTeX_Main-Regular.woff2";
import "katex/dist/fonts/KaTeX_Math-Italic.woff2";
import { marked } from "marked";
import { useContext, useEffect, useMemo, useState } from "react";
import { OracleReportContext } from "../../utils/OracleReportContext";
import { SqlAnalysisContent } from "./SqlAnalysisContent";
import { WebSearchContent } from "./WebSearchContent";
import { PdfCitationsContent } from "./PdfCitationsContent";

interface ReportCitationsContentProps {
  citations: CitationItem[];
  setSelectedAnalysisIndex?: (index: number) => void;
}

function parseTextWithMath(expr: string) {
  try {
    // Latex is wrapped in <latex-block>...</latex-block> for block equations or <latex-inline>...</latex-inline> for inline expressions

    const regexes = [
      /<latex-block>([\s\S]*?)<\/latex-block>/g, // Block LaTeX
      /<latex-inline>([\s\S]*?)<\/latex-inline>/g, // Inline LaTeX
    ];

    let matches: RegExpExecArray[] = [];

    if (!expr) return null;

    for (let i = 0; i < regexes.length; i++) {
      const regex = regexes[i];

      let match: RegExpExecArray | null;
      do {
        match = regex.exec(expr);
        if (!match) continue;
        matches.push(match);
      } while (match);
    }

    if (matches && matches.length > 0) {
      console.groupCollapsed("Latex Matches");
      console.log(expr);
      console.log(matches.map((d) => d.index));

      // Sort matches by their index to ensure proper order of processing
      matches.sort((a, b) => a.index - b.index);

      console.log("matches", matches);

      const parsed: string[] = [];

      // First, add the content before the first match
      if (matches[0].index > 0) {
        // @ts-ignore
        parsed.push(marked.parse(expr.slice(0, matches[0].index)));
      }

      // Process each match in order
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        // Parse the LaTeX content
        // Check if this is a block or inline LaTeX based on the tag
        const isBlockLatex = match[0].includes("<latex-block>");

        // Get the content between this match and the next match (or end of string)
        const nextIndex =
          i < matches.length - 1 ? matches[i + 1].index : expr.length;
        const textBetween = expr.slice(
          match.index + match[0].length,
          nextIndex
        );

        // if this was block latex, add it as a separate entry in the parsed array
        // otherwise, append it to the previous entry in the parsed array to maintain the same sentence when parsing via
        // marked later.
        // if the parsed array is empty, create the first entry
        if (isBlockLatex) {
          parsed.push(
            katex.renderToString(match[1], {
              displayMode: true,
            })
          );

          if (textBetween.length > 0) {
            parsed.push(textBetween);
          }
        } else {
          const rendered = katex.renderToString(match[1], {
            displayMode: false,
          });
          if (parsed.length > 0) {
            parsed[parsed.length - 1] += rendered + textBetween;
          } else {
            parsed.push(rendered + textBetween);
          }
        }
      }

      // run all the entries through marked.parse
      const parsedMarkdown = parsed.map((d) => marked.parse(d));

      console.log("Parsed LaTeX and markdown:", parsedMarkdown);

      console.groupEnd();
      // Join all the parsed fragments and replace newline sequences
      return parsedMarkdown.join("").replace(/\n+/g, "\n\n").trim();
    }

    console.log("No latex matches, returning text as is");

    return expr;
  } catch (e) {
    console.error(e);
    return expr;
  } finally {
  }
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

  const citationsParsed = useMemo(() => {
    if (!citations) return null;

    console.groupCollapsed("Parsing citations");

    try {
      return citations
        .map((item) => {
          if (!item.text)
            return {
              ...item,
              parsed: "",
            };
          // Check for both <latex-block> and <latex-inline> tags
          if (
            item.text.indexOf("<latex-block>") === -1 &&
            item.text.indexOf("<latex-inline>") === -1
          ) {
            // No LaTeX content, just parse markdown and return
            return {
              ...item,
              parsed: marked.parse(item.text),
            };
          } else {
            const text = item.text;
            return {
              ...item,
              parsed: parseTextWithMath(text),
            };
          }
        })
        .filter((d) => d.parsed);
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      console.groupEnd();
    }
  }, [citations]);

  // Find analysis IDs in document titles
  useEffect(() => {
    if (!citationsParsed || !analyses) return;

    const foundIds = new Set<string>();

    citationsParsed.forEach((item) => {
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
  }, [citationsParsed, analyses]);

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
    <div className="flex flex-col space-y-4 mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 py-3 px-3 sm:px-5 lg:px-7">
        {(() => {
          // Track which citation sources have already been shown
          const shownCitationSources = new Set<string>();

          // Filter out empty items first, then map the valid ones
          return citationsParsed
            .filter((item) => {
              // Check if this citation has a valid document title
              const hasValidCitation =
                item.citations &&
                Array.isArray(item.citations) &&
                item.citations.length > 0;

              // Check for meaningful text content
              // const hasNonEmptyText =
              //   item.parsed && item.parsed.trim().length > 0;
              // const parsedHTML = String(
              //   hasNonEmptyText ? marked.parse(item.parsed) : ""
              // );
              // const hasNonEmptyHTML =
              //   parsedHTML.replace(/<[^>]*>/g, "").trim().length > 0;

              // Keep item only if it has either valid citation or non-empty content
              return hasValidCitation || item.parsed;
            })
            .map((item, index) => {
              // Check if this citation has a valid document title
              const hasValidCitation =
                item.citations &&
                Array.isArray(item.citations) &&
                item.citations.length > 0;

              // Get citation source ID
              const citationSourceId = hasValidCitation
                ? item.citations[0].document_title.split(":").pop()?.trim()
                : null;

              // Check if we should show "Dig Deeper" for this citation
              const shouldShowDigDeeper =
                citationSourceId && !shownCitationSources.has(citationSourceId);

              // If this is a new citation source, add it to our tracking set
              if (shouldShowDigDeeper && citationSourceId) {
                shownCitationSources.add(citationSourceId);
              }

              // Process text content
              // const hasNonEmptyText =
              //   item.parsed && item.parsed.trim().length > 0;
              // const parsedHTML = String(
              //   hasNonEmptyText ? marked.parse(item.parsed) : ""
              // );
              // const hasNonEmptyHTML =
              //   parsedHTML.replace(/<[^>]*>/g, "").trim().length > 0;

              return (
                <div key={index} className="mb-4 relative group">
                  {item.parsed && (
                    <div
                      className="prose dark:prose-invert prose-sm max-w-none py-1"
                      dangerouslySetInnerHTML={{
                        __html: item.parsed,
                      }}
                    />
                  )}

                  {hasValidCitation && (
                    <>
                      {shouldShowDigDeeper && (
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
                                <line
                                  x1="21"
                                  y1="21"
                                  x2="16.65"
                                  y2="16.65"
                                ></line>
                              </svg>
                            )}
                            <span className="break-all flex-grow">
                              Dig Deeper
                            </span>
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
                      )}

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
              );
            });
        })()}
      </div>
    </div>
  );
}
