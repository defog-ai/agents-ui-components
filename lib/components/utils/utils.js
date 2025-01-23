import { random, contrast } from "chroma-js";
import setupBaseUrl from "./setupBaseUrl";
import { Annotation, EditorState, Transaction } from "@codemirror/state";
import { csvParse } from "d3";
import { useEffect, useState } from "react";
import { reFormatData } from "../agent/agentUtils";
import Papa from "papaparse";
import { cleanColumnNameForSqlite } from "./sqlite";
import { read, utils } from "xlsx";

export const getAnalysis = async (analysisId, apiEndpoint) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "get_analysis",
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
        analysis_id: analysisId,
      }),
    });
  } catch (e) {
    return { success: false, error_message: e };
  }
  const json = await response.json();
  return json;
};

export const createAnalysis = async (
  token,
  keyName,
  apiEndpoint,
  customId,
  bodyData = {}
) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "create_analysis",
    apiEndpoint: apiEndpoint,
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
        custom_id: customId,
        token: token,
        key_name: keyName,
        ...bodyData,
      }),
    });
  } catch (e) {
    return { success: false, error_message: e };
  }
  const json = await response.json();
  return json;
};

export const getAllDocs = async (token, keyName, apiEndpoint) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "get_docs",
    apiEndpoint: apiEndpoint,
  });
  let response;
  try {
    response = await fetch(urlToConnect, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        key_name: keyName,
      }),
    });
    return response.json();
  } catch (e) {
    return { success: false, error_message: e };
  }
};

export const getAllDashboards = getAllDocs;

export const getAllAnalyses = async (keyName, apiEndpoint) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "get_analyses",
    apiEndpoint: apiEndpoint,
  });
  let response;
  try {
    response = await fetch(urlToConnect, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key_name: keyName,
      }),
    });
    return response.json();
  } catch (e) {
    return { success: false, error_message: e };
  }
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

export const deleteDoc = async (docId, apiEndpoint) => {
  const url = setupBaseUrl({
    protocol: "http",
    path: "delete_doc",
    apiEndpoint: apiEndpoint,
  });
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doc_id: docId,
      }),
    });
    return response.json();
  } catch (e) {
    return { success: false, error_message: e };
  }
};

export const toolDisplayNames = {
  data_fetcher_and_aggregator: "Fetch data from db",
  global_dict_data_fetcher_and_aggregator: "Query data",
  line_plot: "Line Plot",
  kaplan_meier_curve: "Kaplan Meier Curve",
  hazard_ratio: "Hazard Ratio",
  t_test: "T Test",
  anova_test: "ANOVA Test",
  wilcoxon_test: "Wilcoxon Test",
  boxplot: "Boxplot",
  heatmap: "Heatmap",
  fold_change: "Fold Change",
};

export const toolShortNames = {
  data_fetcher_and_aggregator: "SQL ",
  global_dict_data_fetcher_and_aggregator: "Query ",
  line_plot: "Line",
  kaplan_meier_curve: "KM Curve",
  hazard_ratio: "Hazard Ratio",
  t_test: "T Test",
  anova_test: "ANOVA Test",
  wilcoxon_test: "Wilcoxon Test",
  boxplot: "Boxplot",
  heatmap: "Heatmap",
  fold_change: "Fold Change",
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

export function createInitialToolInputs(tools, toolName, parentIds) {
  let initialInputs = {};

  // if there's a pandas dataframe type in the inputs, default that to the parent's output
  Object.values(tools[toolName].input_metadata).forEach((inp) => {
    if (inp.type === "pandas.core.frame.DataFrame") {
      try {
        initialInputs[inp.name] = "global_dict." + parentIds?.[0];
      } catch (e) {
        console.log(e);
      }
    } else {
      // cannot be undefined and has to be null
      // undefined stuff doesn't get sent to the backend at all.
      // null goes as None
      initialInputs[inp.name] =
        (Array.isArray(inp.default) ? inp.default[0] : inp.default) || null;
    }
  });
  return initialInputs;
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

export const addTool = async (
  {
    tool_name,
    function_name,
    description,
    code,
    input_metadata,
    output_metadata,
    no_code = false,
  },
  apiEndpoint
) => {
  const addToolEndpoint = setupBaseUrl({
    protocol: "http",
    path: "add_tool",
    apiEndpoint: apiEndpoint,
  });
  const payload = {
    tool_name,
    function_name,
    description,
    code,
    input_metadata,
    output_metadata,
    no_code: no_code,
  };
  try {
    const res = await fetch(addToolEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Failed to add tool");
    }

    const json = await res.json();
    return json;
  } catch (e) {
    console.error(e);
    return { success: false, error_message: e };
  }
};

export const deleteSteps = async (analysisId, stepIds, apiEndpoint) => {
  const deleteStepsEndpoint = setupBaseUrl({
    protocol: "http",
    path: "delete_steps",
    apiEndpoint: apiEndpoint,
  });
  try {
    const res = await fetch(deleteStepsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysis_id: analysisId,
        step_ids: stepIds,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to delete tool run ids");
    }

    const json = res.json();

    return json;
  } catch (e) {
    console.error(e);
    return { success: false, error_message: e };
  }
};

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

export function parseCsvFile(file, cb) {
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

      let rows = results.data;

      rows.forEach((row, i) => {
        row.key = i;
      });

      cb({ file, rows, columns });
    },
  });
}

export async function parseExcelFile(file, cb) {
  const arrayBuf = await file.arrayBuffer();
  const d = read(arrayBuf);
  // go through all sheets, and stream to csvs
  const sheetCsvs = {};

  d.SheetNames.forEach((sheetName) => {
    const rows = utils.sheet_to_json(d.Sheets[sheetName], { defval: null });
    const columns = Object.keys(rows[0]).map((d) => ({
      title: d,
      dataIndex: d,
      key: d,
    }));

    sheetCsvs[sheetName] = { rows, columns };
  });

  cb({ file, sheetCsvs });
}

// key_name = "Manufacturing"
// metadata = [{"column_name": "id", "data_type": "INT"}, {"column_name": "name", "data_type": "TEXT"}]
// table_name = "temp_table"

// r = requests.post("https://demo.defog.ai/generate_column_descriptions_for_csv", json={"key_name": key_name, "metadata": metadata, "table_name": table_name})
// metadata = r.json()

/**
 *
 * @param {object} params
 * @param {string} params.apiEndpoint - Api endpoint
 * @param {string} params.keyName - Api key name
 * @param {Array<{ column_name: string, data_type: string }>} params.metadata - Metadata of the columns
 * @param {string} params.tableName - Name of the table
 * @returns {Promise<{ success: boolean, error_message?: string, descriptions?: Array<{ column_name: string, data_type: string, column_description: string }> }>}
 */
export async function getColumnDescriptionsForCsv({
  apiEndpoint,
  keyName,
  metadata,
  tableName,
}) {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "generate_column_descriptions_for_csv",
    apiEndpoint,
  });

  let response;
  try {
    response = await fetch(urlToConnect, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key_name: keyName,
        metadata: metadata.map((d) => ({
          data_type: d.data_type,
          column_name: d.column_name,
        })),
        table_name: tableName,
      }),
    });

    const json = await response.json();

    if (json.error) {
      throw new Error(json.error);
    }

    return { success: true, descriptions: json };
  } catch (e) {
    return { success: false, error_message: e };
  }
}

// const res = await fetch("https://api.defog.ai/generate_query_csv", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify({
//     question,
//     key_name: keyName,
//     db_type: "sqlite",
//     metadata: metadata,
//   }),
// }).then((res) => res.json());

/**
 * @param {object} params
 * @param {string} params.question - Question to generate query
 * @param {string} params.keyName - API Key name
 * @param {?Array<{ column_name: string, data_type: string, table_name: string }>} params.metadata - Metadata of the columns
 * @param {string} params.apiEndpoint - API endpoint
 * @param {PreviousContext} params.previousContext - Previous context
 *
 * @returns {Promise<{ success: boolean, error_message?: string, sql?: string }>}
 */
export const generateQueryForCsv = async ({
  question,
  keyName,
  metadata,
  apiEndpoint,
  previousContext = [],
}) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "generate_query_csv",
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
        key_name: keyName,
        db_type: "sqlite",
        metadata,
        previous_context: previousContext,
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
}) => {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "retry_query_csv",
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
        key_name: keyName,
        db_type: "sqlite",
        metadata,
        previous_query: previousQuery,
        error: error,
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
        color_by_str: colorByIsDate
          ? row[colorBy]
          : `${colorBy ? row[colorBy] : ""}`,
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
 * @param {string} stepId
 *
 * @returns {JSON} returns the latest cache at the time of deletion
 */
export function deleteStepAnalysisFromLocalStorage(stepId) {
  let cached = localStorage.getItem("analyseDataResults");
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
 * @param {string} stepId
 * @param {string} analysis
 *
 * @returns {JSON} The latest cache at the time of saving
 */
export function addStepAnalysisToLocalStorage(stepId, analysis) {
  // cast to string
  analysis = String(analysis);
  // try to set local storage
  // we re-get local storage here because the above request could have taken a long time, and
  // other steps elsewhere might have triggered analyse_data already and they would also try to set the local storage
  let cached = localStorage.getItem("analyseDataResults");
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
 * @param {?string} token
 * @param {string} keyName
 * @param {?string} apiEndpoint
 * @param {string} question
 *
 * @returns {Promise<{question_type: QuestionType, default_open_tab: "table" | "chart", follow_on_analysis_index: number}>}
 */

export async function getQuestionType(token, keyName, apiEndpoint, question) {
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
      key_name: keyName,
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
