import React from "react";
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
import { isNumber } from "../utils/utils";

const dateFormats = [
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DD",
  "YYYY-MM",
  "YYYY-MMM",
];

export function checkIfDate(s, colIdx, colName, rows) {
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

  let dateType, parseFormat;
  let dateToUnix = (val) => val;

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

    // Set up parsing based on determined date type
    switch (dateType) {
      case "week":
        dateToUnix = (val) => dayjs().week(+val).unix();
        parseFormat = "W-YYYY";
        break;
      case "year":
        dateToUnix = (val) => dayjs("1-" + +val, "M-YYYY").unix();
        parseFormat = "M-YYYY";
        break;
      case "month":
        // Existing month logic remains the same
        for (let i = 0; i < rows.length; i++) {
          let val = rows[i][colIdx];
          if (!val) continue;

          if (typeof val === "number") {
            dateToUnix = (val) =>
              dayjs(val + "-" + new Date().getFullYear(), "M-YYYY").unix();
            parseFormat = "M-YYYY";
          } else {
            const maybeMonthName = /[a-zA-Z]/.test(val);
            if (maybeMonthName) {
              if (val.length > 3) {
                dateToUnix = (val) => dayjs(val, "MMMM").unix();
                parseFormat = "MMMM";
              } else {
                dateToUnix = (val) => dayjs(val, "MMM").unix();
                parseFormat = "MMM";
              }
            } else {
              dateToUnix = (val) =>
                dayjs(val + "-" + new Date().getFullYear(), "M-YYYY").unix();
              parseFormat = "M-YYYY";
            }
          }
          break;
        }
        break;
      case "date":
      case "datetime":
        dateToUnix = (val) => dayjs(val, dateFormats).unix();
        parseFormat = null; // Let dayjs auto-detect the format
        break;
      default:
        dateToUnix = (val) => val;
        parseFormat = null;
        dateType = null;
        isDate = false;
    }
  }

  return { isDate, dateType, parseFormat, dateToUnix };
}
export function cleanString(s) {
  return String(s).toLowerCase().replace(/ /gi, "-");
}

// change float cols with decimals to 2 decimal places
export function roundColumns(data, columns) {
  const decimalCols = columns
    ?.filter((d) => d.colType === "decimal")
    .map((d) => d.key);

  // create new data by copying it deeply because we want to plot accurate vals in charts
  const roundedData = [];
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

function isExpontential(input) {
  const regex = /^-?(0|[1-9]\d*)?(\.\d+)?([eE][-+]?\d+)?$/;
  return regex.test(input);
}

export function inferColumnType(rows, colIdx, colName) {
  // go through rows
  const res = {};
  res["numeric"] = false;
  res["variableType"] = "quantitative";

  if (
    colName.endsWith("_id") ||
    colName.startsWith("id_") ||
    colName === "id"
  ) {
    res["colType"] = "string";
    res["variableType"] = "categorical";
    res["numeric"] = false;
    res["simpleTypeOf"] = "string";
    return res;
  } else {
    // look at the first non-null row and guess the type
    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][colIdx];
      if (val === null) continue;

      const dateCheck = checkIfDate(val, colIdx, colName, rows);
      if (dateCheck.isDate) {
        res["colType"] = "date";
        res["variableType"] = "categorical";
        res["numeric"] = false;
        res["parseFormat"] = dateCheck.parseFormat;
        res["dateToUnix"] = dateCheck.dateToUnix;
        res["dateType"] = dateCheck.dateType;
        res["isDate"] = dateCheck.isDate;
      }
      // is a number and also has a decimal
      else if (isNumber(val) && val.toString().indexOf(".") >= 0) {
        res["colType"] = "decimal";
        res["numeric"] = true;
        res["variableType"] = "quantitative";
        try {
          // get the mean of this column
          res["mean"] = mean(rows, (d) => d[colIdx]);
        } catch (e) {
          // do nothing
        }
      }
      // if number but no decimal
      // or is exponential value
      else if (isNumber(val) || isExpontential(val)) {
        res["colType"] = "integer";
        res["numeric"] = true;
        res["variableType"] = "quantitative";
        // get the mean of this column
        res["mean"] = mean(rows, (d) => d[colIdx]);
      } else {
        res["colType"] = typeof val;
        res["numeric"] = res["colType"] === "number";
        res["variableType"] =
          res["colType"] === "number" ? "quantitative" : "categorical";

        // if it's a number, get the mean
        if (res["numeric"]) {
          try {
            // get the mean of this column
            res["mean"] = mean(rows, (d) => d[colIdx]);
          } catch (e) {
            // do nothing
          }
        }
      }

      res["simpleTypeOf"] = typeof val;
      // just return. so we don't look at any further than the first non-null row
      return res;
    }
  }
}

// converts a Map into an Object.
// recursive function that can handle nested Maps as well.
// processValue is a function that can be used to process the value of each value in the resulting object
// hook is a function that can be used to do extra computation before we process a key, value pair
export const mapToObject = (
  map = new Map(),
  parentNestLocation = [],
  processValue = (d) => d,
  // hook will allow you to do extra computation on every recursive call to this function
  hook = () => {}
) =>
  Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => {
      // also store nestLocation for all of the deepest children
      value.nestLocation = parentNestLocation.slice();
      value.nestLocation.push(key);
      hook(key, value);

      return value instanceof Map
        ? [key, mapToObject(value, value.nestLocation, processValue)]
        : [key, processValue(value)];
    })
  );

export function getColValues(data = [], columns = []) {
  if (!columns.length || !data || !data.length) return [];

  // if single column, just return that column value
  // if multiple, join the column values with separator
  const vals = new Set();
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

export function processData(data, columns) {
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
  const xAxisColumnValues = {};
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

export function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

export function sanitiseColumns(columns) {
  // check if it's not an array or undefined
  if (!Array.isArray(columns) || !columns) {
    return [];
  }
  // convert all existing columns to strings
  const cleanColumns = columns.map((c) => String(c));
  return cleanColumns;
}

export function sanitiseData(data, chart = false) {
  // check if it's not an array or undefined
  if (!Array.isArray(data) || !data) {
    return [];
  }

  // filter out null elements from data array
  // for the remaining rows, check if the whole row is null
  let cleanData;
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

export function transformToCSV(rows, columnNames) {
  const header = '"' + columnNames.join('","') + '"\n';
  const body = rows.map((d) => '"' + d.join('","') + '"').join("\n");
  return header + body;
}

// https://stackoverflow.com/questions/24898044/is-possible-to-save-javascript-variable-as-file
export function download_csv(csvString) {
  var hiddenElement = document.createElement("a");

  hiddenElement.href = "data:attachment/text," + encodeURI(csvString);
  hiddenElement.target = "_blank";
  hiddenElement.download = `data-${new Date().toISOString().slice(0, -5)}.csv`;
  hiddenElement.click();
  hiddenElement.remove();
}

export const tools = [
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

export const reFormatData = (data, columns) => {
  let newCols;
  let newRows;

  // if inferred typeof column is number, decimal, or integer
  // but simple typeof value is string, means it's a numeric value coming in as string
  // so coerce them to a number
  // store the indexes of such columns
  const numericAsString = [];
  // deal with columns like "user_id" etc coming in as numbers.
  // if inferred type is numeric but variable Type is "categorical"
  const stringAsNumeric = [];

  let validData = sanitiseData(data, false);
  let validColumns = sanitiseColumns(columns);

  if (validColumns.length && validData.length) {
    const cols = columns;
    const rows = validData;
    newCols = [];
    newRows = [];
    for (let i = 0; i < cols.length; i++) {
      let inferredColumnType = inferColumnType(rows, i, cols[i]);
      let newCol = Object.assign({
        title: cols[i],
        dataIndex: cols[i],
        key: cols[i],
        // simple typeof. if a number is coming in as string, this will be string.
        simpleTypeOf: typeof rows[0][i],
        sorter:
          rows.length > 0 && typeof rows[0][i] === "number"
            ? (a, b, dataIndex) => a[dataIndex] - b[dataIndex]
            : rows.length > 0 && !isNaN(rows[0][i])
              ? (a, b, dataIndex) => Number(a[dataIndex]) - Number(b[dataIndex])
              : (a, b, dataIndex) =>
                  String(a[dataIndex]).localeCompare(String(b[dataIndex])),
        render: (value) => {
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
      let row = {};
      row["key"] = i;
      row["index"] = i;

      for (let j = 0; j < cols.length; j++) {
        if (numericAsString.indexOf(j) >= 0) {
          row[cols[j]] = rows[i][j];
        } else if (stringAsNumeric.indexOf(j) >= 0) {
          row[cols[j]] = "" + rows[i][j];
        } else row[cols[j]] = rows[i][j];
      }
      newRows.push(row);
    }

    // push an index column
    newCols.push({
      title: "index",
      dataIndex: "index",
      key: "index",
      sorter: (a, b, dataIndex) => a["index"] - b["index"],
      colType: "integer",
      variableType: "integer",
      numeric: true,
      simpleTypeOf: "number",
      mean: (newRows?.length + 1) / 2 || null,
    });
  } else {
    newCols = [];
    newRows = [];
  }

  return { newCols, newRows };
};

export const sentenceCase = (str) => {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1);
};

export const chartNames = {
  kmc: "Kaplan-Meier Curves",
  boxplot: "Boxplot",
  heatmap: "Heatmap",
};
