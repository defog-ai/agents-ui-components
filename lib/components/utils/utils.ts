import { random, contrast } from "chroma-js";
import setupBaseUrl from "./setupBaseUrl";
import { Annotation, EditorState, Transaction } from "@codemirror/state";
import { csvParse } from "d3";
import { useEffect, useState } from "react";
import { reFormatData } from "../agent/agentUtils";
import Papa from "papaparse";
import { cleanColumnNameForSqlite } from "./sqlite";
import { read, utils } from "xlsx";

export const getAnalysis = async (
  analysisId: string,
  token: string,
  apiEndpoint: string
) => {
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
  keyName: string,
  apiEndpoint: string,
  customId: string,
  bodyData = {}
) => {
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
      db_name: keyName,
      ...bodyData,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create analysis");
  }

  const json = await response.json();
  return json;
};

// something that looks good against black text
export const getCursorColor = function () {
  // start with a random color
  const black = "#000";
  let color = random().hex();
  let cont = contrast(color, black);
  while (cont < 9) {
    // keep regenerating until we get a good contrast
    color = random().hex();
    cont = contrast(color, black);
  }

  return color;
};

export const aiBlocks = ["analysis", "table-chart"];

export const roundNumber = function (number) {
  if (number === null || number === undefined) {
    return null;
  }
  if (number < 1 && number > -1) {
    // exponential
    return number.toExponential(2);
  }
  if (number > 100000 || number < -100000) {
    // exponential
    return number.toExponential(2);
  }
  // rounded to 2 decimals
  return Math.round(number * 100) / 100;
};

export const isNullOrUndefined = function (val) {
  return val === null || val === undefined;
};

export const toolDisplayNames = {
  data_fetcher_and_aggregator: "Fetch data from db",
};

export const easyToolInputTypes = {
  DBColumn: "Column name",
  DBColumnList: "List of column names",
  "pandas.core.frame.DataFrame": "Dataframe",
  str: "String",
  int: "Integer",
  float: "Float",
  bool: "Boolean",
  "list[str]": "List of strings",
  list: "List",
  DropdownSingleSelect: "String",
};

export const trimStringToLength = (str, length) => {
  if (str.length > length) {
    return str.substring(0, length) + "...";
  }
  return str;
};

export const kebabCase = (str) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};

export const snakeCase = (str) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
};

export const sentenceCase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// https://discuss.codemirror.net/t/how-to-make-certain-ranges-readonly-in-codemirror6/3400/5
export function createReadOnlyTransactionFilter(readonlyRangeSet) {
  return () => {
    return EditorState.transactionFilter.of((tr) => {
      if (
        readonlyRangeSet &&
        tr.docChanged &&
        !tr.annotation(Transaction.remote)
      ) {
        let block = false;
        tr.changes.iterChangedRanges((chFrom, chTo) => {
          readonlyRangeSet.between(chFrom, chTo, (roFrom, roTo) => {
            if (chTo > roFrom && chFrom < roTo) block = true;
          });
        });
        if (block) return [];
      }
      return tr;
    });
  };
}

export const forcedAnnotation = Annotation.define();

// from: https://github.com/andrebnassis/codemirror-readonly-ranges/blob/master/src/lib/index.ts
export const preventModifyTargetRanges = (getReadOnlyRanges) =>
  // code mirror extension that
  // takes a function that returns read only ranges
  // and prevents modification on them
  EditorState.transactionFilter.of((tr) => {
    let readonlyRangeSet = getReadOnlyRanges(tr.startState);

    if (
      readonlyRangeSet &&
      tr.docChanged &&
      !tr.annotation(forcedAnnotation) &&
      !tr.annotation(Transaction.remote)
    ) {
      let block = false;
      tr.changes.iterChangedRanges((chFrom, chTo) => {
        readonlyRangeSet.between(chFrom, chTo, (roFrom, roTo) => {
          if (
            (chTo > roFrom && chFrom < roTo) ||
            // also prevent adding at the start or end of a readonly range
            chFrom === roTo ||
            chTo === roFrom
          )
            block = true;
        });
      });
      if (block) return [];
    }
    return tr;
  });

// breaks new lines, and split to max of maxLength characters
// first split on newlines
// then split on spaces
export function breakLinesPretty(str, maxLength = 60, indent = 1) {
  return str
    .split("\n")
    .map((line) => {
      return line
        .split(" ")
        .reduce((acc, word) => {
          if (
            acc.length &&
            acc[acc.length - 1].length + word.length < maxLength
          ) {
            acc[acc.length - 1] += " " + word;
          } else {
            acc.push(word);
          }
          return acc;
        }, [])
        .join("\n" + "  ".repeat(indent));
    })
    .join("\n" + "  ".repeat(indent));
}

export function createPythonFunctionInputString(inputDict, indent = 2) {
  return (
    "  ".repeat(indent) +
    inputDict.name +
    (inputDict.type ? ": " + inputDict.type : "") +
    "," +
    (inputDict.description ? " # " + inputDict.description : "")
  );
}

export function arrayOfObjectsToObject(arr, key, includeKeys = null) {
  return arr.reduce((acc, obj) => {
    acc[obj[key]] = Object.keys(obj).reduce((acc2, k) => {
      if (Array.isArray(includeKeys) && !includeKeys.includes(k)) {
        return acc2;
      }

      acc2[k] = obj[k];
      return acc2;
    }, {});

    return acc;
  }, {});
}

export function useGhostImage() {
  const [ghostImage, setGhostImage] = useState(null);

  useEffect(() => {
    var img = document.createElement("img");
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    setGhostImage(img);
  }, []);

  return ghostImage;
}

/**
 *
 * @param {any | null} cell
 */
export function escapeStringForCsv(cell) {
  if (!cell) return cell;

  let escaped = cell;

  if (typeof escaped !== "string") {
    escaped = `${escaped}`;
  }

  // https://stackoverflow.com/questions/17808511/how-to-properly-escape-a-double-quote-in-csv
  return escaped.replace(/"/g, '""');
}

export function parseData(data_csv) {
  const data = csvParse(data_csv);
  const colNames = data.columns;
  const rows = data.map((d) => Object.values(d));

  const r = reFormatData(rows, colNames);

  // make sure we correctly render quantitative columns
  // if a column has numeric: true
  // convert all entires in all rows to number
  r.newCols.forEach((col, i) => {
    if (col.numeric) {
      r.newRows.forEach((row) => {
        row[col.title] = Number(row?.[col.title]);
      });
    }
  });

  return {
    columns: r.newCols,
    data: r.newRows,
  };
}

export const FILE_TYPES = {
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  OLD_EXCEL: "application/vnd.ms-excel",
  CSV: "text/csv",
};

/**
 * Simple function to check if given gile type exists in the FILE_TYPES object
 */
export function isValidFileType(fileType) {
  return Object.values(FILE_TYPES).includes(fileType);
}

export function parseCsvFile(
  file: File,
  cb: ({
    file,
    rows,
    columns,
  }: {
    file: File;
    rows: any[];
    columns: any[];
  }) => void = (...args) => {}
) {
  // if file type is not csv, error
  if (file.type !== "text/csv") {
    throw new Error("File type must be CSV");
  }

  Papa.parse(file, {
    dynamicTyping: true,
    skipEmptyLines: true,
    header: true,
    transformHeader: (header) => {
      return cleanColumnNameForSqlite(header);
    },
    complete: (results) => {
      const columns = results.meta.fields.map((f) => {
        return {
          title: f,
          dataIndex: f,
          key: f,
        };
      });

      let rows: any = results.data;

      rows.forEach((row, i) => {
        row.key = i;
      });

      cb({ file, rows, columns });
    },
  });
}

export async function parseExcelFile(
  file: File,
  cb: ({
    file,
    sheets,
  }: {
    file: File;
    sheets: { [sheetName: string]: { rows: any[]; columns: any[] } };
  }) => void = (...args) => {}
) {
  const arrayBuf = await file.arrayBuffer();
  const d = read(arrayBuf);
  // go through all sheets, and stream to csvs
  const sheets = {};

  d.SheetNames.forEach((sheetName) => {
    const rows = utils.sheet_to_json(d.Sheets[sheetName], { defval: null });
    const columns = Object.keys(rows[0]).map((d) => ({
      title: d,
      dataIndex: d,
      key: d,
    }));

    sheets[sheetName] = { rows, columns };
  });

  cb({ file, sheets });
}

/**
 * @param {object} params
 * @param {string} params.question - Question to generate query
 * @param {string} params.keyName - API Key name
 * @param {?Array<{ column_name: string, data_type: string, table_name: string }>} params.metadata - Metadata of the columns
 * @param {string} params.apiEndpoint - API endpoint
 * @param {PreviousContext} params.previousContext - Previous context
 * @param {string} params.token - Token
 *
 * @returns {Promise<{ success: boolean, error_message?: string, sql?: string }>}
 */
export const generateQueryForCsv = async ({
  question,
  keyName,
  metadata,
  apiEndpoint,
  previousContext = [],
  token,
}) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "query-data/generate_query_csv",
    apiEndpoint,
  });

  let response;
  try {
    response = await fetch(urlToConnect, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        db_name: keyName,
        db_type: "sqlite",
        metadata,
        previous_context: previousContext,
        token,
      }),
    });

    const json = await response.json();

    if (json.error || !json.sql) {
      throw new Error(json.error || "Failed to generate query");
    }

    return {
      success: true,
      sql: json.sql,
    };
  } catch (e) {
    return { success: false, error_message: e };
  }
};

/**
 * @param {object} params
 * @param {string} params.question - Question to generate query
 * @param {string} params.keyName - API Key name
 * @param {?Array<{ column_name: string, data_type: string, table_name: string }>} params.metadata - Metadata of the columns
 * @param {string} params.apiEndpoint - API endpoint
 * @param {string} params.previousQuery - Previous query
 * @param {string|null} params.error - Error message
 * @param {string|null} params.token - Token
 *
 * @returns {Promise<{ success: boolean, error_message?: string, sql?: string }>}
 */
export const retryQueryForCsv = async ({
  question,
  keyName,
  metadata,
  apiEndpoint,
  previousQuery,
  error,
  token,
}) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "query-data/retry_query_csv",
    apiEndpoint,
  });

  console.log(error);

  let response;
  try {
    response = await fetch(urlToConnect, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        db_name: keyName,
        db_type: "sqlite",
        metadata,
        previous_query: previousQuery,
        error: error,
        token,
      }),
    });

    const json = await response.json();

    if (json.error || !json.sql) {
      throw new Error(json.error || "Failed to generate query");
    }

    return {
      success: true,
      sql: json.sql,
    };
  } catch (e) {
    return { success: false, error_message: e };
  }
};

// sigh. sometimes model returns numbers as strings for some reason.
// so use regex instead of typeof
// from here: https://stackoverflow.com/questions/2811031/decimal-or-numeric-values-in-regular-expression-validation
export function isNumber(input) {
  // This regex matches a string that is a valid number with an optional % sign at the end.
  const regex = /^-?(0|[1-9]\d*)?(\.\d+)?%?$/;

  // Check if the input ends with a digit or a % sign, ensuring it's a number or a percentage
  const endsWithDigitOrPercent = /\d%?$/.test(input);

  return regex.test(input) && endsWithDigitOrPercent;
}

// if the selectedChart is bar, then we want to transform the data from a long format to a wide format
// this is because bar chart expects the data to be in wide format
export function convertWideToLong(
  wideArray,
  xColumn,
  yColumns,
  colorBy,
  colorByIsDate,
  facetColumn = null
) {
  const longArray = [];

  // track indexes within each x "facet" for fallback case
  const naiveIndexesWithinXFacet = {};

  wideArray.forEach((row) => {
    yColumns.forEach((yColumn) => {
      const xVal = row[xColumn];

      // Fallback to original indexing logic
      const naiveIndex = naiveIndexesWithinXFacet[xVal] || 0;
      naiveIndexesWithinXFacet[xVal] = naiveIndex + 1;

      longArray.push({
        [xColumn]: xVal,
        value: row[yColumn],
        label: yColumn,
        ...row,
        key_str: `${row["key"]}`,
        index_str: `${row["index"]}`,
        naive_index_within_facet: `${naiveIndex}`,
        naive_index_within_facet_str: `${naiveIndex}`,
        colorBy: colorBy,
        // If we have a facet column, use that value for the facet
        ...(facetColumn && { [facetColumn]: row[facetColumn] }),
      });
    });
  });

  return longArray;
}

/**
 * Tries to delete a specific step's analysis from local storage. Is stored in an object called analyseDataResults.
 *
 * returns the latest cache at the time of deletion
 */
export function deleteStepAnalysisFromLocalStorage(stepId: string): JSON {
  let cached: any = localStorage.getItem("analyseDataResults");
  try {
    if (!cached) {
      cached = {};
    }
    cached = JSON.parse(cached);

    if (cached && cached?.[stepId]) {
      delete cached[stepId];
      localStorage.setItem("analyseDataResults", JSON.stringify(cached));
    }
  } catch (e) {
    // fail silently
  }

  return cached;
}

/**
 * Tries to save a step's analysis to local storage. Is stored in a property called analyseDataResults.
 * The latest cache at the time of saving
 */
export function addStepAnalysisToLocalStorage(
  stepId: string,
  analysis: string
): JSON {
  // cast to string
  analysis = String(analysis);
  // try to set local storage
  // we re-get local storage here because the above request could have taken a long time, and
  // other steps elsewhere might have triggered analyse_data already and they would also try to set the local storage
  let cached: any = localStorage.getItem("analyseDataResults");
  try {
    if (!cached) {
      cached = {};
    }
    // try to parse
    cached = JSON.parse(cached);
  } catch (e) {
    // fail and set cached to empty object
    cached = {};
  } finally {
    // set this stepId's analysis
    // if analyseDataResults is not an object, make it an object
    cached[stepId] = analysis;
    localStorage.setItem("analyseDataResults", JSON.stringify(cached));
  }

  return cached;
}

/**
 * Tries to get a step's analysis from local storage. Is stored in an object called analyseDataResults.
 * @param {string} stepId
 * @returns {string | null}
 */
export function getStepAnalysisFromLocalStorage(stepId) {
  let analysis;

  let cached = localStorage.getItem("analyseDataResults");
  try {
    // try to parse
    cached = JSON.parse(cached);

    // try to find in local storage
    if (cached && cached?.[stepId]) {
      analysis = cached?.[stepId] || undefined;
    }
  } catch (e) {
    analysis = undefined;
    // fail silently
  }

  return analysis;
}

/**
 * Gets the question type being asked.
 */
export async function getQuestionType(
  token: string | null,
  keyName: string,
  apiEndpoint: string | null,
  question: string
): Promise<{
  question_type: QuestionType;
  default_open_tab: "table" | "chart";
  follow_on_analysis_index: number;
}> {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "get_question_type",
    apiEndpoint: apiEndpoint,
  });
  let response;
  response = await fetch(urlToConnect, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      db_name: keyName,
      question,
    }),
  });

  if (!response.ok) {
    throw new Error("Error getting question type");
  } else {
    const responseJson = await response.json();
    return responseJson;
  }
}

export const raf = (fn) => {
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(fn);
  } else {
    window.setTimeout(fn, 16);
  }
};

export const getApiKeyNames = async (apiEndpoint: string, token: string) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "get_db_names",
    apiEndpoint: apiEndpoint,
  });

  const res = await fetch(urlToConnect, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
    }),
  });
  if (!res.ok) {
    throw new Error(
      "Failed to get api key names - are you sure your network is working?"
    );
  }
  const data = await res.json();
  return data.db_names;
};

interface UserFile {
  rows: { [key: string]: any }[];
  columns: { title: string }[];
}

export const uploadFile = async (
  apiEndpoint: string,
  token: string,
  fileName: string,
  tables: { [key: string]: UserFile }
): Promise<string> => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "upload_file_as_db",
    apiEndpoint: apiEndpoint,
  });

  const res = await fetch(urlToConnect, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
      file_name: fileName,
      tables,
    }),
  });

  if (!res.ok) {
    throw new Error(
      "Failed to create new api key name - are you sure your network is working?"
    );
  }
  const data = await res.json();
  return data.db_name;
};
