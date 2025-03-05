import { parseData } from "@agent";
import type {
  Analysis,
  OracleReportComment,
  Summary,
  OracleAnalysis,
} from "./OracleReportContext";

import { OracleReportMultiTableExtension } from "./reports/tiptap-extensions/OracleReportMultiTable";
import StarterKit from "@tiptap/starter-kit";
import { OracleReportImageExtension } from "./reports/tiptap-extensions/OracleReportImage";
import { Markdown } from "tiptap-markdown";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { OracleCommentHandlerExtension } from "./reports/tiptap-extensions/comments/OracleCommentHandler";
import CommentExtension from "@sereneinserenade/tiptap-comment-extension";
import debounce from "lodash.debounce";
import { Editor } from "@tiptap/core";
import setupBaseUrl from "../utils/setupBaseUrl";
import { ClarificationObject } from "./reports/report-creation/ClarificationItem";
import { marked } from "marked";

// Custom hook for comment management
const debouncedSendUpdates = debounce(
  async (
    apiEndpoint: string,
    editor: Editor,
    reportId: string,
    dbName: string,
    token: string,
    updatedComments: OracleReportComment[]
  ) => {
    if (!reportId || !dbName) return;

    try {
      await Promise.all([
        updateReportComments(
          apiEndpoint,
          reportId,
          dbName,
          token,
          updatedComments
        ),
        updateReportMDX(
          apiEndpoint,
          reportId,
          dbName,
          token,
          editor?.storage.markdown.getMarkdown()
        ),
      ]);
    } catch (error) {
      console.error("Error updating comments:", error);
    }
  },
  500
);

export const sendCommentUpdates = (
  apiEndpoint: string,
  editor: Editor,
  reportId: string,
  dbName: string,
  token: string,
  newComments: OracleReportComment[]
) => {
  editor.storage["oracle-comment-handler"].comments = newComments;
  debouncedSendUpdates(
    apiEndpoint,
    editor,
    reportId,
    dbName,
    token,
    newComments
  );
};

export interface CommentManager {
  subscribeToCommentUpdates: (listener: () => void) => () => void;
  getComments: () => OracleReportComment[];
  updateComments: (
    editor: Editor,
    updatedComments: OracleReportComment[]
  ) => void;
}

export const commentManager = ({
  apiEndpoint,
  reportId,
  dbName,
  token,
  initialComments,
}: {
  apiEndpoint: string;
  reportId: string;
  dbName: string;
  token: string;
  initialComments: OracleReportComment[];
}) => {
  let comments = initialComments;

  let commentListeners: (() => void)[] = [];

  const subscribeToCommentUpdates = (listener: () => void) => {
    commentListeners.push(listener);

    return function unsubscribe() {
      commentListeners = commentListeners.filter((l) => l !== listener);
    };
  };

  const getComments = () => {
    return comments;
  };

  const updateComments = (
    editor: Editor,
    updatedComments: OracleReportComment[]
  ) => {
    comments = updatedComments;
    sendCommentUpdates(apiEndpoint, editor, reportId, dbName, token, comments);

    commentListeners.forEach((listener) => listener());
  };

  return {
    subscribeToCommentUpdates,
    getComments,
    updateComments,
  };
};

export const extensions = [
  StarterKit,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  OracleCommentHandlerExtension,
  CommentExtension.configure({
    HTMLAttributes: {
      class: "oracle-report-comment",
    },
  }),
  Markdown,
];

export const analysisExtensions = [
  StarterKit,
  OracleReportMultiTableExtension,
  OracleReportImageExtension,
];
export const revisionExtensions = [
  StarterKit,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  OracleReportMultiTableExtension,
  OracleReportImageExtension,
  CommentExtension.configure({
    HTMLAttributes: {
      class: "oracle-report-comment",
    },
  }),
  Markdown,
];

/**
 * Parses HTML-like tags from a string and extracts their attributes and content.
 * @param text - The input text to search for tags
 * @param tag - The tag name to search for
 * @returns Array of objects containing the full text, attributes, and inner content of each tag
 */
function findTag(
  text: string,
  tag: string
): {
  fullText: string;
  attributes: { [key: string]: string };
  innerContent: string;
}[] {
  const results: {
    fullText: string;
    attributes: { [key: string]: string };
    innerContent: string;
  }[] = []; // array of objects to store the results, each object has the key "fullText", "attributes", and "innerContent"

  // DO NOT USE REGEX, USE DOM PARSE

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const tags = doc.querySelectorAll(tag);

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const fullText = tag.outerHTML;
    const attributes = {};
    for (let j = 0; j < tag.attributes.length; j++) {
      const attr = tag.attributes[j];
      attributes[attr.name] = attr.value;
    }
    const innerContent = tag.innerHTML;
    results.push({ fullText, attributes, innerContent });
  }

  return results;
}

/**
 *
 * Parse tables from an mdx string.
 * For example:
 * ```jsx
 * <MultiTable>
 *  <Table id={TABLE_ID} />
 *  <Table id={xxx} />
 * </MultiTable>
 * ```
 * Or just:
 * ```jsx
 * <Table id={TABLE_ID} custom-attr={TT} />
 * ```
 *
 * 1. First look for table tags. Parse all data in them.
 * 2. Replace those table tags with oracle-table tags. Keep storing the parsed data with the table id inside a dict.
 * 3. Then look for multi-table tags. For each multi-table tag, replace it with an oracle-multi-table tag.
 * 4. Store the table ids within each multi table tag inside a dict.
 * 5. Replace all content inside a multi table tag with nothing.
 *
 */
export function parseTables(
  mdx: string,
  table_csv?: string,
  sql?: string,
  generated_qn?: string
) {
  const parsed = {
    tables: {},
    multiTables: {},
  };

  const tables = findTag(mdx, "table");

  // replace tables with oracle-tables
  for (const table of tables) {
    const id = crypto.randomUUID();
    mdx = mdx.replace(
      table.fullText,
      `<oracle-table id="${id}"></oracle-table>`
    );
    const { columns, data } = parseData(table.attributes.csv);
    parsed.tables[id] = { columns, data, ...table };
    parsed.tables[id].attributes = {
      ...parsed.tables[id].attributes,
      generated_qn: generated_qn,
    };
  }
  // find multi tables
  const multiTables = findTag(mdx, "multitable");

  // replace multiTables with oracle-multi-tables
  for (const multiTable of multiTables) {
    const id = crypto.randomUUID();
    //   find table ids
    const tables = findTag(multiTable.fullText, "oracle-table");

    mdx = mdx.replace(
      multiTable.fullText,
      `<oracle-multi-table id="${id}"></oracle-multi-table>`
    );

    parsed.multiTables[id] = {
      tableIds: tables.map((t) => t.attributes.id),
      ...multiTable,
    };
  }

  // if no multitables, add one with all tables
  if (Object.keys(parsed.multiTables).length === 0 && table_csv && sql) {
    const { columns, data } = parseData(table_csv);
    parsed.tables["default-table"] = {
      columns,
      data,
      attributes: {
        sql: sql,
        csv: table_csv,
        generated_qn: generated_qn,
        type: "fetched_table_csv",
      },
    };

    parsed.multiTables["default-multi-table"] = {
      tableIds: ["default-table"],
      attributes: {},
      fullText:
        '<multitable><oracle-table id="default-table"></oracle-table></multitable>',
      innerText: '<oracle-table id="default-table"></oracle-table>',
    };
    mdx += `<oracle-multi-table id="default-multi-table"><oracle-table id="default-table"></oracle-table></oracle-multi-table>`;
  }

  return { mdx: mdx, ...parsed };
}

/**
 *
 * Parse images from an mdx string.
 *
 * Looks for `<Image src={SRC} alt={ALT_TEXT} />`
 */
export function parseImages(mdx: string) {
  // parse images
  const parsed = {
    images: {},
  };
  const images = findTag(mdx, "image");

  // replace images with oracle-images
  for (const image of images) {
    const id = crypto.randomUUID();
    mdx = mdx.replace(
      image.fullText,
      `<oracle-image id="${id}"></oracle-image>`
    );
    parsed.images[id] = image;
  }

  return { mdx: mdx, ...parsed };
}

export const TABLE_TYPE_TO_NAME = {
  table_csv: "Aggregated data",
  fetched_table_csv: "Fetched data",
  anomalies_csv: "Anomalies data",
};

class MDX {
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
  table_csv: string;
  sql: string;
  generated_qn: string;

  constructor(
    mdx: string,
    table_csv?: string,
    sql?: string,
    generated_qn?: string
  ) {
    this.mdx = mdx;
    this.tables = {};
    this.multiTables = {};
    this.images = {};
    this.table_csv = table_csv || "";
    this.sql = sql || "";
    this.generated_qn = generated_qn || "";
  }

  parseTables = () => {
    let parsed = parseTables(
      this.mdx,
      this.table_csv,
      this.sql,
      this.generated_qn
    );
    this.tables = parsed.tables;
    this.multiTables = parsed.multiTables;
    this.mdx = parsed.mdx;

    return this;
  };

  parseImages = () => {
    let parsed = parseImages(this.mdx);
    this.images = parsed.images;
    this.mdx = parsed.mdx;

    return this;
  };

  cleanup = () => {
    // if there is any oracle-comment-handler tags, remove all of them
    // we will add one manually at the end
    const commentHandlers = findTag(this.mdx, "oracle-comment-handler");
    if (commentHandlers.length > 0) {
      for (const commentHandler of commentHandlers) {
        this.mdx = this.mdx.replace(commentHandler.fullText, "");
      }
    }

    this.mdx = this.mdx + "\n\n<oracle-comment-handler/>";

    return this;
  };

  getParsed = () => {
    return Object.assign(
      {},
      {
        mdx: this.mdx,
        tables: Object.assign({}, this.tables),
        multiTables: Object.assign({}, this.multiTables),
        images: Object.assign({}, this.images),
      }
    );
  };
}

/**
 *
 * Parse an mdx string
 *
 */
export const parseMDX = (
  mdx: string,
  table_csv?: string,
  sql?: string,
  generated_qn?: string
): ReturnType<MDX["getParsed"]> => {
  let parsed = new MDX(mdx, table_csv, sql, generated_qn);

  parsed.parseTables().parseImages().cleanup();

  const t = parsed.getParsed();

  return t;
};

export const generateNewAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  analysisId: string,
  recommendationIdx: number,
  dbName: string,
  token: string,
  question: string,
  previousAnalysisIds: string[]
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/generate_analysis`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        analysis_id: analysisId,
        new_analysis_question: question,
        previous_analysis_ids: previousAnalysisIds,
        recommendation_idx: recommendationIdx,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to generate new analysis");
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export const deleteAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  analysisId: string,
  recommendationIdx: number | null,
  dbName: string,
  token: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/delete_analysis`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        analysis_id: analysisId,
        recommendation_idx: recommendationIdx,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete analysis");
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }
};

export const getReportAnalysisIds = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string
): Promise<string[]> => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_analysis_ids`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch analyses");
  }

  const data = await res.json();

  if (!data.analyses) {
    throw new Error("No analyses found");
  }

  return data.analyses;
};

export const getReportAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string,
  analysisId: string
): Promise<{
  analysis_id: string;
  analysis_json?: Analysis;
  status?: string;
  mdx?: string;
}> => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_analysis`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        analysis_id: analysisId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch analysis");
  }

  const data = await res.json();

  return data;
};

export const getReportMDX = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_mdx`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch mdx");
  }

  const data = await res.json();
  return data;
};

export const updateReportMDX = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string,
  tiptapMdx: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/update_report_mdx`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        tiptap_mdx: tiptapMdx,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update mdx");
  }
};

export const getReportImage = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string,
  imageFileName: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_image`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        image_file_name: imageFileName,
        db_name: dbName,
        report_id: reportId,
        token: token,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch image");
  }

  const data = await res.json();

  if (!data.encoded) {
    throw new Error("Error fetching image");
  }

  return data.encoded;
};

export const getReportAnalysesMdx = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_analyses_mdx`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch analyses mdx");
  }

  const data = await res.json();

  return data.analyses_mdx;
};

export const getReportComments = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string
): Promise<OracleReportComment[]> => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_comments`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch comments");
  }

  const data = await res.json();

  return data.comments || [];
};

export const updateReportComments = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string,
  comments: OracleReportComment[]
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/update_report_comments`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        comments: comments,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update comments");
  }
};

export const submitForRevision = async (
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string,
  generalComments: string,
  commentsWithRelevantText: {
    relevant_text: string;
    comment_text: string;
  }[]
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/revise_report`,
      apiEndpoint,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // disable cors for the download
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: dbName,
        token: token,
        report_id: reportId,
        general_comments: generalComments,
        comments_with_relevant_text: commentsWithRelevantText,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.message || "Failed to submit for revision");
  }

  return data;
};

export interface ReportData {
  parsed: ReturnType<MDX["getParsed"]> | null;
  summary: Summary;
  analyses: OracleAnalysis[];
  comments: OracleReportComment[];
}

export async function fetchAndParseReportData(
  apiEndpoint: string,
  reportId: string,
  dbName: string,
  token: string
): Promise<ReportData> {
  const { mdx, analyses } = await getReportMDX(
    apiEndpoint,
    reportId,
    dbName,
    token
  );

  let parsed: ReturnType<MDX["getParsed"]> = null;
  let sum: Summary = null;
  let fetchedComments: OracleReportComment[] = [];

  parsed = parseMDX(mdx);

  fetchedComments = await getReportComments(
    apiEndpoint,
    reportId,
    dbName,
    token
  );

  return {
    parsed,
    summary: sum,
    analyses: analyses,
    comments: fetchedComments,
  };
}

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

export const fetchReports = async (
  apiEndpoint: string,
  token: string,
  dbName: string
): Promise<ListReportResponse | null> => {
  try {
    const res = await fetch(
      setupBaseUrl({
        apiEndpoint,
        protocol: "http",
        path: "oracle/list_reports",
      }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, db_name: dbName }),
      }
    );

    if (!res.ok) throw new Error("Failed to fetch reports");
    const data = await res.json();

    return data.reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return null;
  }
};

export const deleteReport = async (
  apiEndpoint: string,
  reportId: string,
  token: string,
  dbName: string
) => {
  try {
    const res = await fetch(
      setupBaseUrl({
        apiEndpoint,
        protocol: "http",
        path: "oracle/delete_report",
      }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_name: dbName,
          report_id: reportId,
          token,
        }),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("Error deleting report:", error);
    return false;
  }
};

interface GenerateReportResponse {
  report_id: string;
  status: string;
}

export const generateReport = async (
  apiEndpoint: string,
  token: string,
  dbName: string,
  reportId: string,
  userQuestion: string,
  clarifications = [],
  useWebsearch: boolean = true
): Promise<void> => {
  if (!token) throw new Error("No token");
  if (!userQuestion) throw new Error("No user question");
  if (!dbName) throw new Error("No db name");

  const res = await fetch(
    setupBaseUrl({
      apiEndpoint,
      protocol: "http",
      path: "oracle/generate_report",
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Using a longer timeout to ensure requests have time to reach the server
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        db_name: dbName,
        token,
        // jic text area has changed.
        // if it's been emptied, use the original question
        user_question: userQuestion,
        task_type: "exploration",
        clarifications,
        report_id: reportId,
        use_websearch: useWebsearch,
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to generate report");
};

export const getClarifications = async (
  apiEndpoint: string,
  token: string,
  dbName: string,
  userQuestion: string,
  pdfFiles: { file_name: string; base64_content: string }[],
  dataFiles: { file_name: string; base64_content: string }[]
): Promise<{
  clarifications: ClarificationObject[];
  report_id: string;
  new_db_info?: DbInfo;
  new_db_name?: string;
}> => {
  if (!token) throw new Error("No token");
  const res = await fetch(
    setupBaseUrl({
      apiEndpoint,
      protocol: "http",
      path: "oracle/clarify_question",
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        db_name: dbName,
        token,
        user_question: userQuestion,
        pdf_files: pdfFiles,
        data_files: dataFiles,
      }),
    }
  );
  if (!res.ok) {
    throw new Error((await res.text()) || "Failed to get clarifications");
  }
  const data = await res.json();
  return data;
};

export interface SourceItem {
  link: string;
  position: number;
  q: string;
  snippet: string;
  title: string;
}

/**
 * Gets web sources for a user question. We never error from this route. returning an empty array is fine.
 */
export const getSources = async (
  apiEndpoint: string,
  token: string,
  dbName: string,
  userQuestion: string
): Promise<SourceItem[]> => {
  try {
    if (!token) throw new Error("No token");

    const res = await fetch(
      setupBaseUrl({
        apiEndpoint,
        protocol: "http",
        path: "oracle/suggest_web_sources",
      }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_name: dbName,
          token,
          user_question: userQuestion,
        }),
      }
    );

    if (!res.ok) throw new Error("Failed to get sources");
    const data: { num_results: number; organic: SourceItem[] } =
      await res.json();
    return data.organic;
  } catch (e) {
    console.error(e);
    return [];
  }
};

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

/**
 * Returns a string representation of the timestamp passed. (defaults to Date.now())
 * in the same format that the backend creates for reports
 * Sample format: "2025-02-11T08:13:28.761375",
 * Note: This returns the timestamp in UTC
 */
export const oracleReportTimestamp = (dateObj: Date = new Date()) =>
  dateObj.toISOString().replace("Z", "");

/**
 * Converts the MDX content to Markdown format
 *
 * @param mdx - The MDX content to convert
 * @returns Clean Markdown content
 */
export const convertMdxToMarkdown = (mdx: string): string => {
  // Replace oracle-specific components with their markdown equivalents
  let markdown = mdx;

  // Remove oracle-table tags
  markdown = markdown.replace(/<oracle-table[^>]*><\/oracle-table>/g, "");

  // Remove oracle-multi-table tags
  markdown = markdown.replace(
    /<oracle-multi-table[^>]*><\/oracle-multi-table>/g,
    ""
  );

  // Remove oracle-image tags
  markdown = markdown.replace(/<oracle-image[^>]*><\/oracle-image>/g, "");

  // Remove oracle-comment-handler tag
  markdown = markdown.replace(/<oracle-comment-handler\/>/g, "");

  // Clean up any other oracle-specific tags or formatting
  markdown = markdown.replace(/<oracle-[^>]*>/g, "");
  markdown = markdown.replace(/<\/oracle-[^>]*>/g, "");

  return markdown;
};

/**
 * Downloads content as a file
 *
 * @param content - The content to download
 * @param fileName - The name of the file
 * @param contentType - The content type of the file
 */
export const downloadFile = (
  content: string,
  fileName: string,
  contentType: string
): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports the report content as a Markdown file
 *
 * @param mdx - The MDX content to export
 * @param fileName - The name of the file (defaults to 'report.md')
 */
export const exportAsMarkdown = (
  mdx: string,
  fileName: string = "report.md"
): void => {
  const markdown = convertMdxToMarkdown(mdx);
  downloadFile(markdown, fileName, "text/markdown");
};

/**
 * Prepares the report content for PDF export
 *
 * @param mdx - The MDX content to export
 * @returns HTML content ready for PDF generation
 */
export const prepareHtmlForPdf = (mdx: string): string => {
  const markdown = convertMdxToMarkdown(mdx);

  // Use the marked library to convert markdown to HTML
  const html = marked.parse(markdown);

  // Add styling for proper PDF rendering
  return `
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.25em; }
          p { margin: 1em 0; }
          ul, ol { padding-left: 2em; }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 1em;
            color: #666;
            margin: 1em 0;
          }
          code {
            font-family: Menlo, Monaco, 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
          }
          pre {
            background-color: #f5f5f5;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
          }
          pre code {
            background-color: transparent;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }
          th, td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f5f5f5;
            font-weight: 600;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
};

/**
 * Uses html2canvas and jsPDF to export MDX content as PDF
 *
 * This function needs to be called in a browser environment where
 * both html2canvas and jsPDF are available. You'll need to import
 * and load these libraries before using this function.
 *
 * @param htmlNode - The HTML node to convert to PDF
 * @param fileName - The name of the PDF file (defaults to 'report.pdf')
 */
export const exportAsPdf = async (
  mdx: string,
  fileName: string = "report.pdf"
): Promise<void> => {
  // Convert MDX to HTML
  const markdown = convertMdxToMarkdown(mdx);
  const html = await marked.parse(markdown);

  // Create a temporary container to render the HTML
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "800px";
  container.classList.add("prose", "prose-base");

  // Add the container to the document
  document.body.appendChild(container);

  try {
    // Use the print function to generate a PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Could not open print window");
    }

    const printDocument = printWindow.document;
    printDocument.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            p { margin: 1em 0; }
            ul, ol { padding-left: 2em; }
            blockquote {
              border-left: 4px solid #ddd;
              padding-left: 1em;
              color: #666;
              margin: 1em 0;
            }
            code {
              font-family: Menlo, Monaco, 'Courier New', monospace;
              background-color: #f5f5f5;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-size: 0.9em;
            }
            pre {
              background-color: #f5f5f5;
              padding: 1em;
              border-radius: 5px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              text-align: left;
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: 600;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #0366d6;
              text-decoration: none;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);

    printDocument.close();

    // Allow some time for resources to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } finally {
    // Clean up the temporary container
    document.body.removeChild(container);
  }
};
