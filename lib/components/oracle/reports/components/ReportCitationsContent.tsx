import { CitationItem } from "@oracle";
import {
  LayoutDashboard,
  ChartBarIcon,
  File,
  GripVertical,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye,
  X,
  Search,
  Code2,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/fonts/KaTeX_Size2-Regular.woff2";
import "katex/dist/fonts/KaTeX_Main-Regular.woff2";
import "katex/dist/fonts/KaTeX_Math-Italic.woff2";
import { marked } from "marked";
import {
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { OracleReportContext } from "../../utils/OracleReportContext";
import { SqlAnalysisContent } from "./SqlAnalysisContent";
import { WebSearchContent } from "./WebSearchContent";
import { PdfCitationsContent } from "./PdfCitationsContent";
import { ChartContainer } from "../../../observable-charts/ChartContainer";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { createChartManager } from "../../../observable-charts/ChartManagerContext";
import { parseData } from "@agent";
import { csvFormat } from "d3";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { createRoot } from "react-dom/client";
import { CodeInterpreterContent } from "./CodeInterpreterContent";

const toolToLabel = {
  text_to_sql_tool: "SQL",
  pdf_citations_tool: "PDF",
  web_search_tool: "Web",
};

// TODO: Define or import proper AnalysisItem type if available
// Using 'any' for now based on observed usage.
type AnalysisItem = any;

interface ReportCitationsContentProps {
  citations: CitationItem[];
  setSelectedAnalysisIndex?: (index: number) => void;
}

// Define a unified structure for dashboard items
interface DashboardItem {
  id: string; // analysis_id
  type: "chart" | "pdf" | "webSearch" | "codeInterpreter";
  analysis: AnalysisItem; // Use a proper type
  chartData?: any; // Specific data needed for charts (like parsedOutputs)
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
        parsed.push(expr.slice(0, matches[0].index));
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
              output: "html",
            })
          );

          if (textBetween.length > 0) {
            parsed.push(textBetween);
          }
        } else {
          const rendered = katex.renderToString(match[1], {
            displayMode: false,
            output: "html",
          });
          if (parsed.length > 0) {
            parsed[parsed.length - 1] += rendered + textBetween;
          } else {
            parsed.push(rendered + textBetween);
          }
        }
      }

      console.groupEnd();
      // Join all the parsed fragments and replace newline sequences
      return parsed.join("");
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
}: ReportCitationsContentProps) {
  const oracleReportContext = useContext(OracleReportContext);
  const { analyses } = oracleReportContext;

  // Dashboard mode to show all charts together
  const [showDashboard, setShowDashboard] = useState(false);

  // Dashboard specific state
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<
    "all" | "charts" | "pdfs" | "webSearches" | "codeInterpreterRuns" | "hidden"
  >("all");
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null); // Track dragging state

  const citationsParsed = useMemo(() => {
    if (!citations) return null;

    console.groupCollapsed("Parsing citations");

    try {
      return citations
        .map((item) => {
          const parsedCitation = {
            ...item,
            parsed: "",
          };
          if (!item.text) parsedCitation.parsed = "";
          // Check for both <latex-block> and <latex-inline> tags
          if (
            item.text.indexOf("<latex-block>") === -1 &&
            item.text.indexOf("<latex-inline>") === -1
          ) {
            // No LaTeX content, just use item.text
            // @ts-ignore
            parsedCitation.parsed = item.text;
          } else {
            const text = item.text;
            parsedCitation.parsed = parseTextWithMath(text);
          }

          // now that we have replaced the latex
          // we can now wrap all the elements with citations inside tags for easier reference later
          if (
            parsedCitation.citations &&
            Array.isArray(item.citations) &&
            item.citations.length > 0
          ) {
            item.citations.forEach((citation) => {
              const [toolName, citationId] = citation.document_title.split(":");

              const citationLabel = toolToLabel[toolName.trim()] || toolName;

              parsedCitation.parsed = `${parsedCitation.parsed}<span class='report-citation' data-document-title='${citation.document_title}' data-tool-name='${toolName}' data-citation-id='${citationId.trim()}' data-expanded='0'><span class='report-citation-label'>${citationLabel}</span><span class='report-citation-content initial'></span></span>`;
            });
          }

          return parsedCitation;
        })
        .filter((d) => d.parsed);
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      console.groupEnd();
    }
  }, [citations]);

  useEffect(() => {
    document.querySelectorAll(".report-citation").forEach((el, i) => {
      const label = el.querySelector(".report-citation-label");
      if (!label) return;

      function initialiseCitationContent() {
        let citationContent = null;
        let contentCtr: HTMLSpanElement = null;

        try {
          contentCtr = el.querySelector(".report-citation-content");
          // add content inside the report-citation-content div
          // get the ids by splitting on comma
          // @ts-ignore
          const citationId: string = el?.dataset?.citationId;
          // @ts-ignore
          const documentTitle: string = el?.dataset?.documentTitle;
          // @ts-ignore
          const toolName: string = el?.dataset?.toolName;

          citationContent = (
            <>
              <span className="report-citation-header">Citation</span>
              {getAnalysisContent(
                documentTitle,
                analyses.findIndex(
                  (analysis) => analysis.analysis_id === citationId
                )
              )}
            </>
          );
        } catch (err) {
          citationContent = (
            <div className="w-full h-full flex items-center justify-center">
              Error getting citation content
            </div>
          );
        } finally {
          createRoot(contentCtr).render(
            <OracleReportContext.Provider value={oracleReportContext}>
              {citationContent}
            </OracleReportContext.Provider>
          );
        }
      }

      label.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        // @ts-ignore
        const content: HTMLSpanElement = el.querySelector(
          ".report-citation-content"
        );

        // if content has not been initialised, initialise it now
        // @ts-ignore
        if (!+el?.dataset?.expanded) {
          initialiseCitationContent();
          // @ts-ignore
          el.dataset.expanded = 1;
        }

        content.classList.remove("initial");
        if (content.classList.contains("show")) {
          content.classList.remove("show");
          content.classList.add("hide");
        } else {
          content.classList.add("show");
          content.classList.remove("hide");
        }
      });
    });
  }, [[citations]]);

  // Function to get the appropriate analysis component based on document type
  const getAnalysisContent = (documentTitle: string, analysisIndex: number) => {
    if (!analyses || analysisIndex === -1) return null;

    const analysis = analyses[analysisIndex];

    if (documentTitle.includes("text_to_sql")) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded">
          <SqlAnalysisContent analysis={analysis} />
        </div>
      );
    }

    if (documentTitle.includes("pdf_citations")) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded">
          <PdfCitationsContent analysis={analysis} />
        </div>
      );
    }

    if (documentTitle.includes("web_search")) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded">
          <WebSearchContent analysis={analysis} />
        </div>
      );
    }

    if (documentTitle.includes("code_interpreter")) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded">
          {/* @ts-ignore */}
          <CodeInterpreterContent {...analysis.result} />
        </div>
      );
    }

    return (
      <div className="text-sm bg-white dark:bg-gray-800 rounded">
        <div className="font-medium mb-1 text-gray-700 dark:text-gray-200">
          Analysis
        </div>
      </div>
    );
  };

  // Effect to set up drag and drop monitoring
  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => setDraggingItemId(source.data.id as string),
      onDrop: ({ location, source }) => {
        setDraggingItemId(null); // Clear dragging state on drop

        const target = location.current.dropTargets[0];
        if (!target) return; // No valid drop target

        const sourceId = source.data.id as string;
        const targetId = target.data.id as string;

        const sourceIndex = dashboardItems.findIndex(
          (item) => item.id === sourceId
        );
        const targetIndex = dashboardItems.findIndex(
          (item) => item.id === targetId
        );

        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
          console.warn("Drag and drop failed: Invalid indices", {
            sourceId,
            targetId,
            sourceIndex,
            targetIndex,
          });
          return; // Invalid indices or dropped on itself
        }

        setDashboardItems((currentItems) => {
          const reorderedItems = reorder({
            list: currentItems,
            startIndex: sourceIndex,
            finishIndex: targetIndex,
          });
          return reorderedItems;
        });
      },
    });
  }, [dashboardItems]); // Re-run monitor setup if dashboardItems array instance changes

  // Effect to initialize and update dashboard items when analyses change
  useEffect(() => {
    if (!analyses) {
      setDashboardItems([]);
      return;
    }

    const newDashboardItems: DashboardItem[] = [];

    // Process charts
    analyses.forEach((analysis) => {
      if (
        analysis.rows &&
        analysis.rows.length > 0 &&
        analysis.columns &&
        analysis.columns.length > 0 &&
        !(
          analysis.function_name === "pdf_citations_tool" ||
          analysis.function_name === "web_search_tool"
        )
      ) {
        try {
          // Convert analysis rows to a proper array of objects for d3's csvFormat
          const formattedRows = analysis.rows.map((row) => {
            const formattedRow: Record<string, any> = {};
            analysis.columns.forEach((col) => {
              const key = col.title || col.dataIndex;
              formattedRow[key] =
                row[key] === undefined || row[key] === null ? "" : row[key];
            });
            return formattedRow;
          });
          const csvString = csvFormat(formattedRows);
          const parsedData = parseData(csvString);

          const enhancedColumns = parsedData.columns.map((col) => {
            let isDateColumn = col.isDate || false;
            if (!isDateColumn && parsedData.data.length > 0) {
              const sampleValues = parsedData.data
                .slice(0, Math.min(5, parsedData.data.length))
                .map((row) => row[col.key])
                .filter(
                  (val) => val !== null && val !== undefined && val !== ""
                );
              if (sampleValues.length > 0) {
                const allAreDates = sampleValues.every(
                  (val) => !isNaN(new Date(val).getTime())
                );
                if (allAreDates) isDateColumn = true;
              }
            }
            return {
              ...col,
              description: "",
              isDate: isDateColumn,
              dateToUnix: (date: string) => {
                if (!date) return null;
                const parsedDate = new Date(date);
                return isNaN(parsedDate.getTime())
                  ? null
                  : parsedDate.getTime();
              },
            };
          });

          const chartManager = createChartManager({
            data: parsedData.data,
            availableColumns: enhancedColumns,
          });
          chartManager.autoSelectVariables();

          newDashboardItems.push({
            id: analysis.analysis_id,
            type: "chart",
            analysis,
            chartData: {
              // This structure should match ChartContainer's expected stepData prop
              csvString,
              data: parsedData,
              chartManager: chartManager,
              reactive_vars: {},
              chart_images: {},
              analysis: {}, // Assuming this structure is needed by ChartContainer
            },
          });
        } catch (error) {
          console.error(
            `Error processing chart analysis ${analysis.analysis_id}:`,
            error
          );
        }
      }
      // Process PDFs
      else if (
        analysis.function_name === "pdf_citations_tool" &&
        analysis.result?.citations &&
        Array.isArray(analysis.result.citations) &&
        analysis.result.citations.length > 0
      ) {
        newDashboardItems.push({
          id: analysis.analysis_id,
          type: "pdf",
          analysis,
        });
      }
      // Process Web Searches
      else if (
        analysis.function_name === "web_search_tool" &&
        analysis.result &&
        (analysis.result.answer ||
          (analysis.result.reference_sources &&
            Array.isArray(analysis.result.reference_sources) &&
            analysis.result.reference_sources.length > 0))
      ) {
        newDashboardItems.push({
          id: analysis.analysis_id,
          type: "webSearch",
          analysis,
        });
      } else if (
        analysis.function_name === "code_interpreter_tool" &&
        analysis.result &&
        !analysis?.result?.error &&
        analysis?.result?.result &&
        analysis.result.sql
      ) {
        newDashboardItems.push({
          id: analysis.analysis_id,
          type: "codeInterpreter",
          analysis,
        });
      }
    });

    setDashboardItems(newDashboardItems);

    // Reset expanded/hidden state when analyses change
    setHiddenCards(new Set());
    setActiveFilter("all");
  }, [analyses]);

  // Calculate counts for filters
  const dashboardCounts = useMemo(() => {
    const counts = {
      charts: 0,
      pdfs: 0,
      webSearches: 0,
      codeInterpreterRuns: 0,
      hidden: hiddenCards.size,
    };
    dashboardItems.forEach((item) => {
      if (!hiddenCards.has(item.id)) {
        if (item.type === "chart") counts.charts++;
        else if (item.type === "pdf") counts.pdfs++;
        else if (item.type === "webSearch") counts.webSearches++;
        else if (item.type === "codeInterpreter") counts.codeInterpreterRuns++;
      }
    });
    return counts;
  }, [dashboardItems, hiddenCards]);

  // Filter dashboard items based on active filter and hidden status
  const filteredDashboardItems = useMemo(() => {
    let itemsToShow = dashboardItems;

    if (activeFilter === "hidden") {
      itemsToShow = itemsToShow.filter((item) => hiddenCards.has(item.id));
    } else if (activeFilter === "all") {
      itemsToShow = itemsToShow.filter((item) => !hiddenCards.has(item.id));
    } else {
      itemsToShow = itemsToShow.filter(
        (item) =>
          item.type ===
            (activeFilter === "charts"
              ? "chart"
              : activeFilter === "pdfs"
                ? "pdf"
                : activeFilter === "webSearches"
                  ? "webSearch"
                  : "codeInterpreter") && !hiddenCards.has(item.id)
      );
    }

    return itemsToShow;
  }, [dashboardItems, activeFilter, hiddenCards]);

  const toggleHidden = useCallback((id: string) => {
    setHiddenCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id); // Unhide
      } else {
        newSet.add(id); // Hide
      }
      return newSet;
    });
  }, []);

  // Render Dashboard View
  if (showDashboard && analyses && analyses.length > 0) {
    return (
      <div className="flex flex-col space-y-6 mt-10">
        {/* Dashboard header */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              Content Dashboard
            </h2>
            <button
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded-md px-3 py-1.5 font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Close Dashboard
            </button>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-3 pb-2 border-b dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">
              Filter:
            </div>
            {/* ALL Button - Implicitly selected if no other is */}
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                activeFilter === "all"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All (
              {dashboardCounts.charts +
                dashboardCounts.pdfs +
                dashboardCounts.webSearches}
              )
            </button>
            {/* Charts Button */}
            {dashboardCounts.charts > 0 && (
              <button
                onClick={() => setActiveFilter("charts")}
                className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  activeFilter === "charts"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <ChartBarIcon className="w-4 h-4" />
                Charts ({dashboardCounts.charts})
              </button>
            )}
            {/* PDFs Button */}
            {dashboardCounts.pdfs > 0 && (
              <button
                onClick={() => setActiveFilter("pdfs")}
                className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  activeFilter === "pdfs"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <File className="w-4 h-4" />
                PDFs ({dashboardCounts.pdfs})
              </button>
            )}
            {/* Web Searches Button */}
            {dashboardCounts.webSearches > 0 && (
              <button
                onClick={() => setActiveFilter("webSearches")}
                className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  activeFilter === "webSearches"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Search className="w-4 h-4" />
                Web ({dashboardCounts.webSearches})
              </button>
            )}

            {/* Code Interpreter Button */}
            {dashboardCounts.codeInterpreterRuns > 0 && (
              <button
                onClick={() => setActiveFilter("codeInterpreterRuns")}
                className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  activeFilter === "codeInterpreterRuns"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Code2 className="w-4 h-4" />
                Code ({dashboardCounts.codeInterpreterRuns})
              </button>
            )}

            {/* Hidden Button */}
            {dashboardCounts.hidden > 0 && (
              <button
                onClick={() => setActiveFilter("hidden")}
                className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  activeFilter === "hidden"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 ring-1 ring-yellow-300 dark:ring-yellow-600"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <EyeOff className="w-4 h-4" />
                Hidden ({dashboardCounts.hidden})
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Grid - Apply drop target to the grid */}
        {filteredDashboardItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              {filteredDashboardItems
                .filter((d, i) => i % 2 === 0)
                .map((item) => (
                  <DashboardCard
                    key={item.id}
                    isHidden={hiddenCards.has(item.id)}
                    item={item}
                    isDragging={draggingItemId === item.id}
                    toggleHidden={toggleHidden}
                  />
                ))}
            </div>
            <div className="flex flex-col gap-6">
              {filteredDashboardItems
                .filter((d, i) => i % 2 !== 0)
                .map((item) => (
                  <DashboardCard
                    key={item.id}
                    item={item}
                    isHidden={hiddenCards.has(item.id)}
                    isDragging={draggingItemId === item.id}
                    toggleHidden={toggleHidden}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            {activeFilter === "hidden"
              ? "No hidden items."
              : "No items match the current filter."}
          </div>
        )}
      </div>
    );
  }

  // Regular citations view (Remains largely unchanged, but adjust the Dashboard toggle button logic)
  return (
    <div className="flex flex-col space-y-4 mt-10">
      {/* Dashboard toggle button - Condition might change based on whether any items exist */}
      {dashboardItems.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-400 rounded-md px-3 py-1.5 font-medium transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            View Content Dashboard ({dashboardItems.length})
          </button>
        </div>
      )}

      <div
        className="prose dark:prose-invert prose-sm max-w-none py-1"
        dangerouslySetInnerHTML={{
          __html: marked.parse(citationsParsed.map((d) => d.parsed).join("")),
        }}
      />
    </div>
  );
}

// Define a new component for the Dashboard Card
interface DashboardCardProps {
  item: DashboardItem;
  isHidden: boolean;
  isDragging: boolean;
  toggleHidden: (id: string) => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  item,
  isHidden,
  isDragging,
  toggleHidden,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null); // Ref for the draggable element

  // slightly hacky way to initialise content the first time
  // when this is turned to true, we create the cardContent, till then cardContent keeps returning null
  const [initialiseContent, setInitialiseContent] = useState<boolean>(false);

  // Use effect for drag and drop setup on the card element
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Combine draggable and dropTarget for the element
    return combine(
      draggable({
        element: element,
        getInitialData: () => ({ id: item.id }), // Pass item ID for identification
      }),
      dropTargetForElements({
        element: element,
        getData: () => ({ id: item.id }), // Allow dropping onto this item
        getIsSticky: () => true, // Make target sticky
      })
    );
  }, [item.id]); // Depend on item.id

  const cardTitle =
    item.analysis.question ||
    item.analysis.inputs?.question ||
    (item.type === "chart"
      ? "Chart Analysis"
      : item.type === "pdf"
        ? "PDF Citation"
        : item.type === "webSearch"
          ? "Web Search"
          : "Analysis");

  const icon =
    item.type === "chart" ? (
      <ChartBarIcon className="min-w-3 min-h-3 w-3 h-3 text-blue-500 dark:text-blue-400" />
    ) : item.type === "pdf" ? (
      <File className="min-w-3 min-h-3 w-3 h-3 text-green-500 dark:text-green-400" />
    ) : item.type === "webSearch" ? (
      <Search className="min-w-3 min-h-3 w-3 h-3 text-purple-500 dark:text-purple-400" />
    ) : item.type === "codeInterpreter" ? (
      <Code2 className="min-w-3 min-h-3 w-3 h-3 text-purple-500 dark:text-purple-400" />
    ) : null;

  useEffect(() => {
    // when this is first expanded, and content hasn't been initialised, set it to true
    if (!initialiseContent && isExpanded) {
      setInitialiseContent(true);
    }
  }, [isExpanded, initialiseContent]);

  const cardContent = useMemo(() => {
    if (!initialiseContent && !isExpanded) return null;

    return (
      <div className="p-4">
        <ErrorBoundary>
          {item.type === "chart" && item.chartData && (
            <ChartContainer
              stepData={item.chartData}
              initialQuestion={item.analysis.question}
              initialOptionsExpanded={false} // Keep options initially collapsed
              key={item.id} // Use item.id as key
            />
          )}
          {item.type === "pdf" && (
            <PdfCitationsContent analysis={item.analysis} />
          )}
          {item.type === "webSearch" && (
            <WebSearchContent analysis={item.analysis} />
          )}
          {item.type === "codeInterpreter" && (
            <CodeInterpreterContent {...item.analysis.result} />
          )}
        </ErrorBoundary>
      </div>
    );
  }, [initialiseContent, isExpanded]);

  return (
    <div
      ref={ref}
      className={`bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 overflow-hidden shadow-sm transition-opacity ${
        isDragging ? "opacity-50 ring-2 ring-blue-500" : "opacity-100" // Style for dragging
      } ${isHidden ? "border-dashed border-yellow-500 dark:border-yellow-600" : ""}`} // Style for hidden
    >
      {/* Card Header */}
      <div
        className={
          "flex justify-between items-center p-3 border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-700"
        }
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Drag Handle */}
          <button
            className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 -ml-1"
            // Drag handle props will be implicitly picked up by draggable if needed,
            // or we can explicitly pass dragHandleProps from the hook if we configure it.
            // For now, the whole card is draggable via the ref. Let's add a visual handle.
          >
            <GripVertical size={16} />
          </button>
          {icon}
          <h4
            className="font-medium text-sm text-gray-700 dark:text-gray-300"
            title={cardTitle}
          >
            {cardTitle}
          </h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Hide/Unhide Button */}
          <button
            onClick={() => toggleHidden(item.id)}
            title={isHidden ? "Unhide Card" : "Hide Card"}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          {/* Expand/Collapse Button - Don't show if hidden */}
          {!isHidden && (
            <button
              onClick={() => setIsExpanded((p) => !p)}
              title={isExpanded ? "Collapse Card" : "Expand Card"}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Card Content - Render based on expanded state, don't render if hidden */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? "h-[600px] opacity-100 overflow-scroll"
            : "h-0 opacity-0 overflow-hidden" // Use max-h and opacity for transition
        }`}
        style={{ maxHeight: isExpanded ? "800px" : "0px" }} // Explicit max-height for transition
      >
        {/* Render content only when expanded to avoid performance issues with many charts/maps */}
        {cardContent}
      </div>
    </div>
  );
};
