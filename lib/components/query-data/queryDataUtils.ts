import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import weekOfYear from "dayjs/plugin/weekOfYear.js";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(advancedFormat);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

import { mean } from "d3-array";
import { isNumber } from "@utils/utils";
import setupBaseUrl from "@utils/setupBaseUrl";
import { AnalysisRowFromBackend } from "./analysis/analysisManager";

export const fetchAllAnalyses = async (
  apiEndpoint: string,
  token: string,
  dbName: string
): Promise<AnalysisRowFromBackend[]> => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "query-data/get_all_analyses",
    apiEndpoint,
  });
  const response = await fetch(urlToConnect, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
      db_name: dbName,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json;
};

export const fetchAnalysis = async (
  analysisId: string,
  token: string,
  apiEndpoint: string
): Promise<AnalysisRowFromBackend | null> => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "query-data/get_analysis",
    apiEndpoint,
  });
  const response = await fetch(urlToConnect, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
      analysis_id: analysisId,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json;
};

export const createAnalysis = async (
  token: string,
  dbName: string,
  apiEndpoint: string,
  customId: string,
  bodyData = {}
): Promise<AnalysisRowFromBackend> => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "query-data/create_analysis",
    apiEndpoint: apiEndpoint,
  });

  const response = await fetch(urlToConnect, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      custom_id: customId,
      token: token,
      db_name: dbName,
      ...bodyData,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create analysis");
  }

  const json = await response.json();
  return json;
};

// Type definitions
export type DateType = "year" | "month" | "week" | "date" | "datetime" | null;
export type VariableType = "quantitative" | "categorical";
export type ColumnType = "string" | "date" | "decimal" | "integer" | string;

export interface DateCheckResult {
  isDate: boolean;
  dateType: DateType;
  parseFormat: string | null;
  dateToUnix: (val: any) => number;
}

export interface ColumnInfo {
  title: string;
  dataIndex: string;
  key: string;
  simpleTypeOf: string;
  colType: ColumnType;
  variableType: VariableType;
  numeric: boolean;
  sorter: (a: any, b: any, dataIndex: string) => number;
  render: (value: any) => any;
  mean?: number;
  parseFormat?: string | null;
  dateToUnix?: (val: any) => number;
  dateType?: DateType;
  isDate?: boolean;
}

export interface ProcessDataResult {
  xAxisColumns: ColumnInfo[];
  categoricalColumns: ColumnInfo[];
  yAxisColumns: ColumnInfo[];
  dateColumns: ColumnInfo[];
  xAxisColumnValues: Record<string, any[]>;
  data: any[];
}

export interface ReformattedData {
  newCols: ColumnInfo[];
  newRows: any[];
}

export interface ColumnTypeInference {
  numeric: boolean;
  variableType: VariableType;
  colType?: ColumnType;
  parseFormat?: string | null;
  dateToUnix?: (val: any) => number;
  dateType?: DateType;
  isDate?: boolean;
  mean?: number;
  simpleTypeOf?: string;
}

export interface VisibleAnalysisResult {
  id: string;
  element: HTMLElement | null;
}

export interface Tool {
  name: string;
  description: string;
  fn: string;
}

const dateFormats = [
  "MM/DD/YYYY HH:mm:ss",
  "DD/MM/YYYY HH:mm:ss",
  "DD/MM/YYYY HH:mm:ss",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DD",
  "YYYY-MM",
  "YYYY-MMM",
];

export function checkIfDate(
  s: any,
  colIdx: number,
  colName: string,
  rows: any[]
): DateCheckResult {
  let isDate =
    dayjs(s, dateFormats, true).isValid() ||
    /^year$/gi.test(colName) ||
    /^month$/gi.test(colName) ||
    /^date$/gi.test(colName) ||
    /^week$/gi.test(colName) ||
    /year/gi.test(colName) ||
    /month/gi.test(colName) ||
    /date/gi.test(colName) ||
    /week/gi.test(colName);

  let dateType: DateType = null;
  let parseFormat: string | null = null;
  let dateToUnix = (val: any): number => val;

  if (isDate) {
    // Check column name for date type hints
    if (/^year$/gi.test(colName) || /year/gi.test(colName)) dateType = "year";
    else if (/^month$/gi.test(colName) || /month/gi.test(colName))
      dateType = "month";
    else if (/^week$/gi.test(colName) || /week/gi.test(colName))
      dateType = "week";
    else if (/^date$/gi.test(colName) || /date/gi.test(colName))
      dateType = "date";
    else {
      // If column name doesn't provide hints, check the format of the sample value
      const sampleDate = dayjs(s, dateFormats, true);
      if (sampleDate.isValid()) {
        if (sampleDate.format("HH:mm:ss") !== "00:00:00") {
          dateType = "datetime";
        } else {
          dateType = "date";
        }
      }
    }

    for (let i = 0; i < rows.length; i++) {
      let val = rows[i][colIdx];
      if (!val) continue;

      if (!isNumber(val) && dateType !== "month") {
        // force set dateType to "date" so dayjs can auto detect in the below switch stmt
        // EXCEPT when it is a month. months might be month names. we have some extra parsing below for it
        dateType = "date";
      }

      // Set up parsing based on determined date type
      switch (dateType) {
        case "week":
          dateToUnix = (val: any): number => dayjs().week(+val).unix();
          parseFormat = "W-YYYY";
          break;
        case "year":
          // Existing month logic remains the same
          dateToUnix = (val: any): number =>
            dayjs("1-" + +val, "M-YYYY").unix();
          parseFormat = "M-YYYY";
          break;
        case "month":
          // Existing month logic remains the same
          if (isNumber(val)) {
            dateToUnix = (val: any): number =>
              dayjs(val + "-" + new Date().getFullYear(), "M-YYYY").unix();
            parseFormat = "M-YYYY";
          } else {
            const maybeMonthName = /[a-zA-Z]/.test(val);
            if (maybeMonthName) {
              if (val.length > 3) {
                dateToUnix = (val: any): number => dayjs(val, "MMMM").unix();
                parseFormat = "MMMM";
              } else {
                dateToUnix = (val: any): number => dayjs(val, "MMM").unix();
                parseFormat = "MMM";
              }
            } else {
              dateToUnix = (val: any): number => dayjs(val, dateFormats).unix();
              parseFormat = null; // Let dayjs auto-detect the format
            }
            break;
          }
          break;
        case "date":
        case "datetime":
          dateToUnix = (val: any): number => dayjs(val, dateFormats).unix();
          parseFormat = null; // Let dayjs auto-detect the format
          break;
        default:
          dateToUnix = (val: any): number => val;
          parseFormat = null;
          dateType = null;
          isDate = false;
      }
    }
  }

  return { isDate, dateType, parseFormat, dateToUnix };
}

export function cleanString(s: any): string {
  return String(s).toLowerCase().replace(/ /gi, "-");
}

// change float cols with decimals to 2 decimal places
export function roundColumns(data: any[], columns: ColumnInfo[]): any[] {
  const decimalCols = columns
    ?.filter((d) => d.colType === "decimal")
    .map((d) => d.key);

  // create new data by copying it deeply because we want to plot accurate vals in charts
  const roundedData: any[] = [];
  data?.forEach((d, i) => {
    roundedData.push(Object.assign({}, d));

    decimalCols?.forEach((colName) => {
      let x = roundedData[i][colName];
      // try to convert to a number
      try {
        // round to two decimals if number is greater than 1e-2, if not round to up to 6 decimal places
        if (Math.abs(x) > 1e-2) {
          roundedData[i][colName] = Math.round(x * 1e2) / 1e2;
        } else {
          roundedData[i][colName] = Math.round(x * 1e6) / 1e6;
        }
      } catch (e) {
        // set to null
        console.log(e);
        roundedData[i][colName] = x;
      }
    });
  });

  return roundedData;
}

function isExpontential(input: string): boolean {
  const regex = /^-?(0|[1-9]\d*)?(\.\d+)?([eE][-+]?\d+)?$/;
  return regex.test(input);
}

<<<<<<<< HEAD:lib/components/query-data/queryDataUtils.ts
========
interface InferredColumnType {
  colType: string;
  numeric: boolean;
  variableType: string;
  mean: number;
  simpleTypeOf: string;
  isDate: boolean;
  dateType: string;
  parseFormat: string;
  dateToUnix: any;
}

>>>>>>>> 76466db (make type names less confusing. move functions around to be more obvious.):lib/components/query-data/queryDataUtils.tsx
export function inferColumnType(
  rows: any[],
  colIdx: number,
  colName: string
<<<<<<<< HEAD:lib/components/query-data/queryDataUtils.ts
): ColumnTypeInference {
  // go through rows
  const res: ColumnTypeInference = {
    numeric: false,
    variableType: "quantitative",
  };
========
): InferredColumnType {
  // go through rows
  const res = {} as InferredColumnType;
  res["numeric"] = false;
  res["variableType"] = "quantitative";
>>>>>>>> 76466db (make type names less confusing. move functions around to be more obvious.):lib/components/query-data/queryDataUtils.tsx

  if (
    colName.endsWith("_id") ||
    colName.startsWith("id_") ||
    colName === "id"
  ) {
    res.colType = "string";
    res.variableType = "categorical";
    res.numeric = false;
    res.simpleTypeOf = "string";
    return res;
  } else {
    // look at the first non-null row and guess the type
    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][colIdx];
      if (val === null) continue;

      const dateCheck = checkIfDate(val, colIdx, colName, rows);
      if (dateCheck.isDate) {
        res.colType = "date";
        res.variableType = "categorical";
        res.numeric = false;
        res.parseFormat = dateCheck.parseFormat;
        res.dateToUnix = dateCheck.dateToUnix;
        res.dateType = dateCheck.dateType;
        res.isDate = dateCheck.isDate;
      }
      // is a number and also has a decimal
      else if (isNumber(val) && val.toString().indexOf(".") >= 0) {
        res.colType = "decimal";
        res.numeric = true;
        res.variableType = "quantitative";
        try {
          // get the mean of this column
          res.mean = mean(rows, (d) => d[colIdx]);
        } catch (e) {
          // do nothing
        }
      }
      // if number but no decimal
      // or is exponential value
      else if (isNumber(val) || isExpontential(String(val))) {
        res.colType = "integer";
        res.numeric = true;
        res.variableType = "quantitative";
        // get the mean of this column
        res.mean = mean(rows, (d) => d[colIdx]);
      } else {
        res.colType = typeof val;
        res.numeric = res.colType === "number";
        res.variableType =
          res.colType === "number" ? "quantitative" : "categorical";

        // if it's a number, get the mean
        if (res.numeric) {
          try {
            // get the mean of this column
            res.mean = mean(rows, (d) => d[colIdx]);
          } catch (e) {
            // do nothing
          }
        }
      }

      res.simpleTypeOf = typeof val;
      // just return. so we don't look at any further than the first non-null row
      return res;
    }
  }

  return res;
}

// converts a Map into an Object.
// recursive function that can handle nested Maps as well.
// processValue is a function that can be used to process the value of each value in the resulting object
// hook is a function that can be used to do extra computation before we process a key, value pair
export const mapToObject = <T>(
  map: Map<string, any> = new Map(),
  parentNestLocation: string[] = [],
  processValue: (value: any) => T = (d: any) => d as T,
  // hook will allow you to do extra computation on every recursive call to this function
<<<<<<<< HEAD:lib/components/query-data/queryDataUtils.ts
  hook: (key: string, value: any) => void = () => {}
): Record<string, any> =>
========
  hook = (key: string, value: any) => {}
) =>
>>>>>>>> 76466db (make type names less confusing. move functions around to be more obvious.):lib/components/query-data/queryDataUtils.tsx
  Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => {
      // Create a copy of the value if it's an object, otherwise just use the value
      const valueWithNestLocation =
        typeof value === "object" && value !== null
          ? { ...value, nestLocation: [...parentNestLocation, key] }
          : value;

      if (typeof value === "object" && value !== null) {
        hook(key, valueWithNestLocation);
      } else {
        hook(key, value);
      }

      return value instanceof Map
<<<<<<<< HEAD:lib/components/query-data/queryDataUtils.ts
        ? [key, mapToObject(value, [...parentNestLocation, key], processValue)]
        : [
            key,
            typeof value === "object" && value !== null
              ? processValue(valueWithNestLocation)
              : processValue(value),
          ];
========
        ? // @ts-ignore
          [key, mapToObject(value, value.nestLocation, processValue)]
        : [key, processValue(value)];
>>>>>>>> 76466db (make type names less confusing. move functions around to be more obvious.):lib/components/query-data/queryDataUtils.tsx
    })
  );

export function getColValues(data: any[] = [], columns: string[] = []): any[] {
  if (!columns.length || !data || !data.length) return [];

  // if single column, just return that column value
  // if multiple, join the column values with separator
  const vals = new Set<any>();
  data.forEach((d) => {
    const val = columns.reduce((acc, c, i) => {
      if (i > 0) {
        acc += "-";
      }
      acc += d[c];
      return acc;
    }, "");

    vals.add(val);
  });

  return Array.from(vals);
}

export function processData(
  data: any[],
  columns: ColumnInfo[]
): ProcessDataResult {
  // find if there's a date column
  const dateColumns = columns?.filter((d) => d.colType === "date");
  // date comes in as categorical column, but we use that for the x axis, so filter that out also
  const categoricalColumns = columns?.filter(
    (d) => d?.variableType?.[0] === "c" && d.colType !== "date"
  );

  // y axis columns are only numeric non date columns
  const yAxisColumns = columns?.filter(
    (d) => d?.variableType?.[0] !== "c" && d.colType !== "date"
  );

  const xAxisColumns = columns?.slice();

  // find unique values for each of the x axis columns for the dropdowns
  // this we'll use for "labels" prop for chartjs
  const xAxisColumnValues: Record<string, any[]> = {};
  xAxisColumns?.forEach((c) => {
    xAxisColumnValues[c.key] = getColValues(data, [c.key]);
  });

  const cleanedData = sanitiseData(data, true);

  return {
    xAxisColumns: xAxisColumns ? xAxisColumns : [],
    categoricalColumns: categoricalColumns ? categoricalColumns : [],
    yAxisColumns: yAxisColumns ? yAxisColumns : [],
    dateColumns: dateColumns ? dateColumns : [],
    xAxisColumnValues,
    data: cleanedData,
  };
}

export function isEmpty(obj: Record<string, any>): boolean {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

export function sanitiseColumns(columns: any[]): string[] {
  // check if it's not an array or undefined
  if (!Array.isArray(columns) || !columns) {
    return [];
  }
  // convert all existing columns to strings
  const cleanColumns = columns.map((c) => String(c));
  return cleanColumns;
}

export function sanitiseData(data: any[], chart = false): any[] {
  // check if it's not an array or undefined
  if (!Array.isArray(data) || !data) {
    return [];
  }

  // filter out null elements from data array
  // for the remaining rows, check if the whole row is null
  let cleanData: any[];
  if (!chart) {
    cleanData = data
      .filter((d) => d)
      .filter((d) => !d.every((val) => val === null));
  } else {
    cleanData = data;

    // remove percentage signs from data
    cleanData.forEach((d) => {
      Object.entries(d).forEach(([key, value]) => {
        if (typeof value === "string" && value.endsWith("%")) {
          d[key] = +value.slice(0, -1);
        }
      });
    });
  }
  return cleanData;
}

export function transformToCSV(rows: any[][], columnNames: string[]): string {
  const header = '"' + columnNames.join('","') + '"\n';
  const body = rows.map((d) => '"' + d.join('","') + '"').join("\n");
  return header + body;
}

export const tools: Tool[] = [
  {
    // name: "SQL Aggregator",
    name: "Fetch data",
    description:
      // "Generates SQL queries to get aggregates (with splits on multiple attributes).Good for getting percentiles, summarizing quantities over time, topk rows and outliers based on percentiles, or joining information across tables. Not good at statistical analysis",
      "Fetch data from your database. Good for viewing outliers and subsets of your data. For analysis, try any of the other tools.",
    fn: "sql_aggregator",
  },
  {
    // name: "Summary Statistics",
    name: "Summarize data",
    description:
      // "Generates SQL + python code to sample and estimate summary statistics from a given column. Good for getting mean, std, p25, p50, p75",
      "Good for getting a brief overview of the data using simple statistics like averages, standard deviation, etc.",
    fn: "py_column_summarizer",
  },
  {
    // name: "Correlation Finder",
    name: "Find patterns",
    description:
      // "Generates python code to find correlations in the data. Good for finding correlations and associations between values in different columns. Not good when number of rows is large",
      "Finds patterns and relationships in your data. Note that performance is worse with large datasets.",
    fn: "py_correlator",
  },
  {
    // name: "Time Series Forecaster",
    name: "Predict trends",
    description: "Forecasts future trends in time series data.",
    fn: "py_time_series_forecaster",
  },
];

export const reFormatData = (
  data: any[],
  columns: string[]
): ReformattedData => {
  let newCols: ColumnInfo[];
  let newRows: any[];

  // if inferred typeof column is number, decimal, or integer
  // but simple typeof value is string, means it's a numeric value coming in as string
  // so coerce them to a number
  // store the indexes of such columns
  const numericAsString: number[] = [];
  // deal with columns like "user_id" etc coming in as numbers.
  // if inferred type is numeric but variable Type is "categorical"
  const stringAsNumeric: number[] = [];

  let validData = sanitiseData(data, false);
  let validColumns = sanitiseColumns(columns);

  if (validColumns.length && validData.length) {
    const cols = columns;
    const rows = validData;
    newCols = [];
    newRows = [];
    for (let i = 0; i < cols.length; i++) {
      let inferredColumnType = inferColumnType(rows, i, cols[i]);
      let newCol: ColumnInfo = Object.assign({
        title: cols[i],
        dataIndex: cols[i],
        key: cols[i],
        // simple typeof. if a number is coming in as string, this will be string.
        simpleTypeOf: typeof rows[0][i],
        colType: inferredColumnType.colType as ColumnType,
        variableType: inferredColumnType.variableType,
        numeric: inferredColumnType.numeric,
        sorter:
          rows.length > 0 && typeof rows[0][i] === "number"
            ? (a: any, b: any, dataIndex: string) => a[dataIndex] - b[dataIndex]
            : rows.length > 0 && !isNaN(rows[0][i])
              ? (a: any, b: any, dataIndex: string) =>
                  Number(a[dataIndex]) - Number(b[dataIndex])
              : (a: any, b: any, dataIndex: string) =>
                  String(a[dataIndex]).localeCompare(String(b[dataIndex])),
        render: (value: any) => {
          if (typeof value === "number" || !isNaN(value)) {
            // don't add commas in dates (years can be 2020, 2021 etc.)
            if (inferredColumnType.isDate) {
              return value;
            } else {
              return Number(value).toLocaleString();
            }
          } else {
            return value;
          }
        },
        ...inferredColumnType,
      });

      newCols.push(newCol);
      if (newCols[i].numeric && newCols[i].simpleTypeOf === "string") {
        numericAsString.push(i);
      }
      if (
        newCols[i].numeric &&
        newCols[i].simpleTypeOf === "number" &&
        newCols[i].variableType === "categorical"
      ) {
        stringAsNumeric.push(i);
      }
    }

    for (let i = 0; i < rows.length; i++) {
<<<<<<<< HEAD:lib/components/query-data/queryDataUtils.ts
      let row: Record<string, any> = {};
========
      let row = {} as any;
>>>>>>>> 76466db (make type names less confusing. move functions around to be more obvious.):lib/components/query-data/queryDataUtils.tsx
      row["key"] = i;
      row["index"] = i;
      row.unixDateValues = {};

      for (let j = 0; j < cols.length; j++) {
        if (numericAsString.indexOf(j) >= 0) {
          row[cols[j]] = rows[i][j];
        } else if (stringAsNumeric.indexOf(j) >= 0) {
          row[cols[j]] = "" + rows[i][j];
        } else row[cols[j]] = rows[i][j];

        // if this is a date column, parse the date using dateToUnix returned by inferColumnType
        // and keep for future use in charts.
        if (newCols[j].isDate) {
          try {
            row.unixDateValues = {
              ...row.unixDateValues,
              [cols[j]]: newCols[j].dateToUnix?.(rows[i][j]),
            };
          } catch (e) {
            // just store normal value
            row.unixDateValues = {
              ...row.unixDateValues,
              [cols[j]]: rows[i][j],
            };
          }
        }
      }
      newRows.push(row);
    }

    // push an index column
    newCols.push({
      title: "index",
      dataIndex: "index",
      key: "index",
      sorter: (a: any, b: any, dataIndex: string) => a["index"] - b["index"],
      colType: "integer",
      variableType: "quantitative",
      numeric: true,
      simpleTypeOf: "number",
      mean: (newRows?.length + 1) / 2 || null,
      render: (value: any) => value,
    });
  } else if (validColumns.length) {
    newCols = validColumns.map((c) => ({
      title: c,
      dataIndex: c,
      key: c,
      simpleTypeOf: "string",
      colType: "string",
      variableType: "categorical",
      numeric: false,
      sorter: (a: any, b: any, dataIndex: string) =>
        String(a[dataIndex]).localeCompare(String(b[dataIndex])),
      render: (value: any) => value,
    }));
    newRows = [];
  } else {
    newCols = [];
    newRows = [];
  }

  return { newCols, newRows };
};

export const sentenceCase = (str: string): string => {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1);
};

export const chartNames: Record<string, string> = {
  kmc: "Kaplan-Meier Curves",
  boxplot: "Boxplot",
  heatmap: "Heatmap",
};

/**
 * Returns the analysisId and DOM node of the most visible analysis container in the viewport
 * @param {string[]} analysisIds - Array of analysis IDs to check
 * @returns {{id: string, element: HTMLElement | null}} Object containing ID and DOM node of most visible analysis
 */
export const getMostVisibleAnalysis = (
  analysisIds: string[]
): VisibleAnalysisResult => {
  let maxVisibility = 0;
  let mostVisibleId = analysisIds[0]; // Default to first if none visible
  let mostVisibleElement = document.getElementById(mostVisibleId);

  console.log(analysisIds);

  analysisIds.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const containerRect = element.parentElement!.getBoundingClientRect();

    // Calculate how much of the element is visible relative to container
    const visibleHeight =
      Math.min(rect.bottom, containerRect.bottom) -
      Math.max(rect.top, containerRect.top);
    const visibility = Math.max(0, visibleHeight / containerRect.height);

    if (visibility > maxVisibility) {
      maxVisibility = visibility;
      mostVisibleId = id;
      mostVisibleElement = element;
    }
  });

  console.log(mostVisibleId, mostVisibleElement);

  return {
    id: mostVisibleId,
    element: mostVisibleElement,
  };
};
