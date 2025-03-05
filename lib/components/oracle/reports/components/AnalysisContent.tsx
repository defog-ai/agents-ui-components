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
  setShowSqlQuery 
}: AnalysisContentProps) {
  if (!analysis) return null;

  // SQL Analysis
  if (analysis.analysis_id) {
    return (
      <SqlAnalysisContent 
        analysis={analysis} 
        viewMode={viewMode} 
        showSqlQuery={showSqlQuery} 
        setShowSqlQuery={setShowSqlQuery}
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