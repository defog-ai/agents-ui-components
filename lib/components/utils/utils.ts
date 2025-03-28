import { random, contrast } from "chroma-js";
import setupBaseUrl from "./setupBaseUrl";
import { Annotation, EditorState, Transaction } from "@codemirror/state";
import { csvParse } from "d3";
import { useEffect, useState } from "react";
import { reFormatData } from "../query-data/queryDataUtils";

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

export const PDF_FILE_TYPE = { PDF: "application/pdf" };

/**
 * Simple function to check if given gile type exists in the FILE_TYPES object
 */
export function isValidFileType(fileType: string, includePdf = false) {
  if (!includePdf) {
    return Object.values(FILE_TYPES).includes(fileType);
  } else {
    return Object.values({ ...FILE_TYPES, ...PDF_FILE_TYPE }).includes(
      fileType
    );
  }
}

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
  projectName: string,
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
      db_name: projectName,
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

export const getProjectNames = async (apiEndpoint: string, token: string) => {
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
      "Failed to get db names - are you sure your network is working?"
    );
  }
  const data = await res.json();
  return data.db_names;
};

interface UserFile {
  rows: { [key: string]: any }[];
  columns: { title: string }[];
}

/**
 * Uploads multiple files to create a database
 */
export const createProjectFromFiles = async (
  apiEndpoint: string,
  token: string,
  files: File[],
  dbName?: string
): Promise<{ projectName: string; dbInfo: ProjectDbInfo }> => {
  console.time("utils:createProjectFromFiles:setup");
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "upload_files",
    apiEndpoint: apiEndpoint,
  });

  const form = new FormData();
  form.append("token", token);
  // Include db_name if provided
  if (dbName) {
    form.append("db_name", dbName);
  }
  for (const file of files) {
    form.append("files", file);
  }
  console.timeEnd("utils:createProjectFromFiles:setup");

  console.time("utils:createProjectFromFiles:fetchRequest");

  // Use XMLHttpRequest instead of fetch to track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener("load", async () => {
      console.timeEnd("utils:createProjectFromFiles:fetchRequest");
      console.time("utils:createProjectFromFiles:processResponse");

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.timeEnd("utils:createProjectFromFiles:processResponse");
          resolve({ projectName: data.db_name, dbInfo: data.db_info });
        } catch (error) {
          reject(new Error("Failed to parse response"));
        }
      } else {
        reject(
          new Error(
            xhr.responseText ||
              "Failed to create new db name - are you sure your network is working?"
          )
        );
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error occurred"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("POST", urlToConnect);
    xhr.send(form);
  });
};

export async function getMetadata(apiEndpoint, token, projectName) {
  const urlToConnect = setupBaseUrl({
    protocol: "http",
    path: "integration/get_metadata",
    apiEndpoint,
  });
  const res = await fetch(urlToConnect, {
    signal: AbortSignal.timeout(60000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      token: token,
      db_name: projectName,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get metadata");
  }

  const data = await res.json();

  return data.metadata;
}

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Generate a UUID v4 with fallback for environments where crypto.randomUUID is not available
 * @param sliceLength Optional parameter to slice the UUID to a specific length (e.g. 8 characters)
 * @returns A UUID string
 */
export function generateUUID(sliceLength?: number): string {
  try {
    // Try to use the native crypto.randomUUID method
    const uuid = crypto.randomUUID();
    return sliceLength ? uuid.slice(0, sliceLength) : uuid;
  } catch (error) {
    // Fallback implementation for environments where crypto.randomUUID is not available
    // This implementation follows the UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).slice(0, sliceLength);
  }
}
