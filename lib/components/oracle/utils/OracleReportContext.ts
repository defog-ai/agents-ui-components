import { createContext } from "react";
import { CommentManager, OracleAnalysis, Summary } from "./types";

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

export interface OracleReportContext {
  /** Api endpoint */
  apiEndpoint: string;
  /** User */
  user?: string | null;
  /** DB name */
  dbName: string;
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
  analyses: OracleAnalysis[];

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
  analysis_json: OracleAnalysis;
  status?: string;
}

export interface OracleReportComment {
  user?: string | null;
  id: string;
  content: string;
}

/**
 * Holds the context for the oracle reports
 */
export const OracleReportContext = createContext<OracleReportContext>({
  apiEndpoint: "",
  user: null,
  dbName: "",
  reportId: "",
  token: "",
  multiTables: {},
  tables: {},
  images: {},
  analyses: [],
  executiveSummary: {
    title: "",
    introduction: "",
    recommendations: [],
  },
});
