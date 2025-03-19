// types.ts
import { Editor } from "@tiptap/core";

// File and Resource Types
export interface PdfFileInfo {
  file_id: string;
  file_name: string;
}

// Analysis Types
export interface OracleAnalysis {
  analysis_id: string;
  function_name: string;
  mdx?: string;
  question?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  rows?: Record<string, any>[];
  columns?: {
    title: string;
    dataIndex: string;
  }[];
  result?: any;
  status?: string;
  error?: string;
}

// Report Types
export interface ListReportResponseItem {
  report_id: string;
  report_name: string;
  data?: ReportData;
  date_created: string;
  inputs?: Record<string, any>;
  is_being_revised?: boolean;
  is_revision?: boolean;
  status?: string;
}

export type ListReportResponse = ListReportResponseItem[];

export interface CitationItem {
  text: string;
  citations?: {
    cited_text: string;
    document_title: string;
    end_page_number?: number;
    start_page_number?: number;
    type: string;
  }[];
}

export interface ReportData {
  parsed: ReturnType<any> | null;
  analyses: OracleAnalysis[];
  comments: OracleReportComment[];
  report_with_citations?: CitationItem[];
}

export interface ClarificationObject {
  question: string;
  clarification: string;
  options: string[];
  input_type: "single_choice" | "multiple_choice" | "text";
  answer?: string | string[];
  onAnswerChange?: (answer: string | string[]) => void;
  onDismiss?: () => void;
}

export interface SourceItem {
  link: string;
  position: number;
  q: string;
  snippet: string;
  title: string;
}

export type ORACLE_REPORT_STATUS_TYPE =
  | "DONE"
  | "ERRORED"
  | "THINKING"
  | "INITIALIZED";

export const ORACLE_REPORT_STATUS = {
  DONE: "DONE",
  ERRORED: "ERRORED",
  THINKING: "THINKING",
  INITIALIZED: "INITIALIZED",
};

// Tag parsing result types
export interface TagAttributes {
  [key: string]: string;
}

export interface TagParseResult {
  fullText: string;
  attributes: TagAttributes;
  innerContent: string;
}

// MDX Parsing result types
export interface ParsedMDX {
  mdx: string;
  tables: {
    [key: string]: {
      columns: any[];
      data: any[];
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
  multiTables: {
    [key: string]: {
      tableIds: string[];
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
  images: {
    [key: string]: {
      src: string;
      alt: string;
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
}

// Comment Manager interface
export interface CommentManager {
  subscribeToCommentUpdates: (listener: () => void) => () => void;
  getComments: () => OracleReportComment[];
  updateComments: (
    editor: Editor,
    updatedComments: OracleReportComment[]
  ) => void;
}

export interface Segment {
  name: string;
  description: string;
  "table.column": string[];
}

export interface Artifacts {
  fetched_table_csv?: {
    artifact_content?: string;
    data?: any[];
    columns?: any[];
  };
}

interface Recommendation {
  title: string;
  insight: string;
  action: string;
  id: string;
  analysis_reference: string[];
}

export interface Summary {
  title: string;
  introduction: string;
  recommendations: Recommendation[];
}

export interface Working {
  generated_sql: string;
}

export interface Analysis {
  analysis_id: string;
  generated_qn?: string;
  segment?: Segment;
  artifacts?: Artifacts;
  working?: Working;
  summary?: string;
  title?: string;
  round?: number;
}
interface MultiTable {
  [key: string]: {
    tableIds: string[];
    attributes?: { [key: string]: string };
    fullText?: string;
  };
}

interface Table {
  columns: any[];
  data: any[];
  id?: string;
  type?: string;
  csv?: string;
  attributes?: { [key: string]: string };
  fullText?: string;
}

interface Image {
  /** Source path on the backend */
  src: string;
  /** Alt text */
  alt: string;
  attributes?: Object;
  fullText?: string;
}

export interface AnalysisParsed {
  analysis_id: string;
  mdx?: string;
  tables?: {
    [key: string]: Table;
  };
  multiTables?: {
    [key: string]: MultiTable;
  };
  images?: {
    [key: string]: Image;
  };
  analysis_json: Analysis;
  status?: string;
}

export interface OracleReportComment {
  user?: string | null;
  id: string;
  content: string;
  // Add fields that were causing type errors
  text?: string;
  from?: number;
  to?: number;
  color?: string;
  createdAt?: string;
}
