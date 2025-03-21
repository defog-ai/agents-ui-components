import { ListReportResponseItem, ReportData } from "@oracle";
import { AnalysisTree, AnalysisTreeManager } from "../../query-data/analysis-tree-viewer/analysisTreeManager";

/**
 * Represents a report item in the Oracle history
 */
export interface OracleReportType extends ListReportResponseItem {
  /**
   * Always "report"
   */
  itemType: "report";
  /**
   * For a report, this is equal to report_id.
   */
  itemId: string;
  reportData?: ReportData;
}

/**
 * Represents a query data analysis tree in the Oracle history
 */
export interface QueryDataTree {
  /**
   * Always "query-data"
   */
  itemType: "query-data";
  date_created: string;
  /**
   * For a query data tree, this is equal to rootAnalysisId.
   */
  itemId: string;
  analysisTree: AnalysisTree;
  treeManager?: AnalysisTreeManager;
}

/**
 * Union type representing items in the Oracle history sidebar
 */
export type OracleHistoryItem = OracleReportType | QueryDataTree;

/**
 * Time groups for history organization
 */
export type groups =
  | "Today"
  | "Yesterday"
  | "Past week"
  | "Past month"
  | "Earlier";

/**
 * Structure of the Oracle history object
 */
export interface OracleHistory {
  [projectName: string]: Record<groups, OracleHistoryItem[]>;
}