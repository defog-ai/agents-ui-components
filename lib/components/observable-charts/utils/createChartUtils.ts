import { createChartManager, ChartManager } from "../ChartManagerContext";
import { ParsedOutput } from "../../query-data/analysis/analysisManager";

// Define Column interface since it's not exported from ChartManagerContext
interface Column {
  key: string;
  variableType: string;
  isDate: boolean;
  title: string;
  description: string;
  colType: string;
  dataIndex: string;
  dateToUnix: (date: string) => number;
}

export interface ChartData {
  rows: any[];
  columns: any[];
  initialQuestion: string | null;
  chartManager?: ChartManager;
}

/**
 * Standardizes chart creation for different data sources.
 * Works with both ParsedOutput from AnalysisAgent and raw rows/columns from SqlAnalysisContent.
 * 
 * @param source - Either ParsedOutput from AnalysisAgent or object with rows and columns
 * @param initialQuestion - Optional initial question to be used for chart editing
 * @returns Standardized ChartData object to be passed to ChartContainer
 */
export function createChartData(
  source: ParsedOutput | { rows: any[]; columns: any[] },
  initialQuestion: string | null = null
): ChartData {
  // Check if the source is a ParsedOutput (has chartManager property)
  if ('chartManager' in source) {
    // It's a ParsedOutput from AnalysisAgent
    return {
      rows: source.data.data || [],
      columns: source.data.columns || [],
      initialQuestion: initialQuestion,
      chartManager: source.chartManager
    };
  } else {
    // It's a raw rows/columns object from SqlAnalysisContent
    // Need to format columns to match expected Column interface
    const formattedColumns = source.columns.map((col: any): Column => ({
      key: col.title || col.key || col.dataIndex,
      variableType: inferVariableType(col),
      isDate: inferIsDate(col),
      title: col.title || col.key || col.dataIndex,
      description: "",
      colType: col.colType || inferColType(col),
      dataIndex: col.dataIndex || col.title || col.key,
      dateToUnix: (date: string) => new Date(date).getTime() / 1000
    }));

    // Create a new chart manager with the formatted data
    const chartManager = createChartManager({
      data: source.rows,
      availableColumns: formattedColumns,
    });

    // Auto-select variables for initial display
    chartManager.autoSelectVariables();

    return {
      rows: source.rows,
      columns: formattedColumns,
      initialQuestion: initialQuestion,
      chartManager: chartManager
    };
  }
}

/**
 * More robust date column inference that works consistently
 * with both AnalysisOutputTable and SqlAnalysisContent.
 */
function inferIsDate(col: any): boolean {
  // First check explicit flags
  if (col.isDate !== undefined) return col.isDate;
  if (col.colType === 'date') return true;
  
  // Check column name patterns
  const colName = col.title || col.key || '';
  if (/date|year|month|week|time/gi.test(colName)) return true;
  
  // If we have sample data, check if it's in a date format
  if (col.sample && typeof col.sample === 'string') {
    // ISO date format check
    if (/^\d{4}-\d{2}-\d{2}/.test(col.sample)) return true;
    
    // Check if parseable as date
    const date = new Date(col.sample);
    if (!isNaN(date.getTime())) return true;
  }
  
  return false;
}

/**
 * Infers the variable type (quantitative or categorical)
 */
function inferVariableType(col: any): string {
  if (col.variableType) return col.variableType;
  
  // Infer based on colType or other properties
  if (col.colType === 'integer' || col.colType === 'decimal' || col.colType === 'number') {
    return 'quantitative';
  }
  
  if (col.colType === 'date') {
    return 'categorical';
  }
  
  return 'categorical';
}

/**
 * Infers the column type if not already specified
 */
function inferColType(col: any): string {
  if (col.colType) return col.colType;
  
  // Try to infer from data type
  if (typeof col.sample === 'number') return 'number';
  if (col.isDate) return 'date';
  
  return 'string';
}