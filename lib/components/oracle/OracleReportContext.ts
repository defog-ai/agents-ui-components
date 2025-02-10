import { createContext } from "react";
import { CommentManager, updateReportComments } from "./oracleUtils";
import { Editor } from "@tiptap/core";

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

export interface OracleReportContext {
  /** Api endpoint */
  apiEndpoint: string;
  /** User */
  user?: string | null;
  /** API Key name */
  keyName: string;
  /** Report ID */
  reportId: string;
  /** Token */
  token: string;
  // /**
  //  * Holds all the analysis data for an oracle report
  //  */
  // analyses: {
  //   [key: string]: AnalysisParsed;
  // };

  /**
   * Holds the analysis ids for an oracle report
   */
  analysisIds: string[];

  /**
   * Holds the executive summary for an oracle report
   */
  executiveSummary: Summary;

  /**
   * Holds the images for an oracle report
   */
  images: {
    [key: string]: Image;
  };

  /**
   * Holds the multi tables for an oracle report
   */
  multiTables: {
    [key: string]: MultiTable;
  };
  /**
   * Holds the tables for an oracle report
   */
  tables: {
    [key: string]: Table;
  };
  /**
   * Any extra info
   */

  extra?: { [key: string]: any };

  commentManager?: CommentManager;
}

/**
 * Holds the context for the oracle reports
 */
export const OracleReportContext = createContext<OracleReportContext>({
  apiEndpoint: "",
  user: null,
  keyName: "",
  reportId: "",
  token: "",
  multiTables: {},
  tables: {},
  images: {},
  analysisIds: [],
  executiveSummary: {
    title: "",
    introduction: "",
    recommendations: [],
  },
});

export interface OracleReportComment {
  user?: string | null;
  id: string;
  content: string;
}
