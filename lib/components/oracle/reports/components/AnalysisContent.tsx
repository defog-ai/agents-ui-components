import { OracleAnalysis } from "@oracle";
import { SqlAnalysisContent } from "./SqlAnalysisContent";
import { WebSearchContent } from "./WebSearchContent";
import { PdfCitationsContent } from "./PdfCitationsContent";

interface AnalysisContentProps {
  analysis: OracleAnalysis | null;
  viewMode: "table" | "chart";
  showSqlQuery: boolean;
  setShowSqlQuery: (show: boolean) => void;
}

export function AnalysisContent({
  analysis,
  viewMode,
  showSqlQuery,
  setShowSqlQuery,
}: AnalysisContentProps) {
  const setViewMode = (mode: "table" | "chart") => {}; // Stub implementation to satisfy type requirements
  if (!analysis) return null;

  // SQL Analysis
  if (analysis.sql) {
    return (
      <SqlAnalysisContent
        analysis={analysis}
      />
    );
  }

  // Web Search
  if (analysis.function_name === "web_search_tool") {
    return <WebSearchContent analysis={analysis} />;
  }

  // PDF Citations
  if (analysis.function_name === "pdf_citations_tool") {
    return <PdfCitationsContent analysis={analysis} />;
  }

  return null;
}
