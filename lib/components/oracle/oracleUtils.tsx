import { parseData } from "@agent";
import type {
  Analysis,
  OracleReportComment,
  Summary,
} from "./OracleReportContext";

import { OracleReportMultiTableExtension } from "./reports/tiptap-extensions/OracleReportMultiTable";
import { RecommendationTitle } from "./reports/tiptap-extensions/OracleReportRecommendationTitle";
import StarterKit from "@tiptap/starter-kit";
import { OracleReportImageExtension } from "./reports/tiptap-extensions/OracleReportImage";
import { Markdown } from "tiptap-markdown";
import { OracleCommentHandlerExtension } from "./reports/tiptap-extensions/comments/OracleCommentHandler";
import CommentExtension from "@sereneinserenade/tiptap-comment-extension";
import debounce from "lodash.debounce";
import { Editor } from "@tiptap/core";
import setupBaseUrl from "../utils/setupBaseUrl";
import { useEffect, useRef, useState } from "react";

// Custom hook for comment management
const debouncedSendUpdates = debounce(
  async (
    apiEndpoint: string,
    editor: Editor,
    reportId: string,
    keyName: string,
    token: string,
    updatedComments: OracleReportComment[]
  ) => {
    if (!reportId || !keyName) return;

    try {
      await Promise.all([
        updateReportComments(
          apiEndpoint,
          reportId,
          keyName,
          token,
          updatedComments
        ),
        updateReportMDX(
          apiEndpoint,
          reportId,
          keyName,
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
  keyName: string,
  token: string,
  newComments: OracleReportComment[]
) => {
  editor.storage["oracle-comment-handler"].comments = newComments;
  debouncedSendUpdates(
    apiEndpoint,
    editor,
    reportId,
    keyName,
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
  keyName,
  token,
  initialComments,
}: {
  apiEndpoint: string;
  reportId: string;
  keyName: string;
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
    sendCommentUpdates(apiEndpoint, editor, reportId, keyName, token, comments);

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
  RecommendationTitle,
  OracleReportMultiTableExtension,
  OracleReportImageExtension,
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
  Markdown,
];
export const revisionExtensions = [
  StarterKit,
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
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch mdx");
  }

  const data = await res.json();

  return data.tiptap_mdx || data.mdx;
};

export const updateReportMDX = async (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
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
        key_name: keyName,
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

export const getReportExecutiveSummary = async (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
  token: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_summary`,
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
        key_name: keyName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch executive summary");
  }

  const data = await res.json();

  return data.executive_summary;
};

export const getReportImage = async (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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

export const getAnalysisStatus = async (
  apiEndpoint: string,
  reportId: string,
  analysisId: string,
  keyName: string,
  token: string
): Promise<string> => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_analysis_status`,
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
        key_name: keyName,
        token: token,
        report_id: reportId,
        analysis_id: analysisId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch analysis status");
  }

  const data = await res.json();

  return data.status + "";
};

export const ANALYSIS_STATUS = {
  DONE: "DONE",
  ERROR: "ERROR",
};

export const getReportComments = async (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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
  keyName: string,
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
        key_name: keyName,
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

export const getReportStatus = async (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
  token: string
) => {
  const res = await fetch(
    setupBaseUrl({
      protocol: "http",
      path: `oracle/get_report_status`,
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
        key_name: keyName,
        token: token,
        report_id: reportId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch report status");
  }

  const data = await res.json();

  return data.status;
};

export interface ReportData {
  parsed: ReturnType<MDX["getParsed"]> | null;
  summary: Summary;
  analysisIds: string[];
  comments: OracleReportComment[];
}

export async function fetchAndParseReportData(
  apiEndpoint: string,
  reportId: string,
  keyName: string,
  token: string
): Promise<ReportData> {
  const mdx = await getReportMDX(apiEndpoint, reportId, keyName, token);

  let parsed: ReturnType<MDX["getParsed"]> = null;
  let sum: Summary = null;
  let analysisIds: string[] = [];
  let fetchedComments: OracleReportComment[] = [];

  parsed = parseMDX(mdx);

  sum = await getReportExecutiveSummary(apiEndpoint, reportId, keyName, token);

  // add ids to each recommendation
  sum.recommendations = sum.recommendations.map((rec) => ({
    id: crypto.randomUUID(),
    ...rec,
  }));

  analysisIds = await getReportAnalysisIds(
    apiEndpoint,
    reportId,
    keyName,
    token
  );

  fetchedComments = await getReportComments(
    apiEndpoint,
    reportId,
    keyName,
    token
  );

  return {
    parsed,
    summary: sum,
    analysisIds: analysisIds,
    comments: fetchedComments,
  };
}

export interface ReportListItem {
  report_id: string;
  report_name: string;
  data?: ReportData;
  date_created: string;
  inputs?: Record<string, any>;
  is_being_revised?: boolean;
  is_revision?: boolean;
  status?: string;
}

export type ReportList = ReportListItem[];

export const fetchReports = async (
  apiEndpoint: string,
  token: string,
  apiKeyName: string
): Promise<ReportList | null> => {
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
        body: JSON.stringify({ token, key_name: apiKeyName }),
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
  apiKeyName: string
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
          key_name: apiKeyName,
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

export const useReportStatus = (
  apiEndpoint: string,
  reportId: string,
  keyName: string,
  token: string
) => {
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>("loading");

  const stopPolling = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }
  };

  const startPolling = () => {
    // Clear existing interval if any
    stopPolling();

    const fetchStatus = async () => {
      try {
        const currentStatus = await getReportStatus(
          apiEndpoint,
          reportId,
          keyName,
          token
        );

        setPrevStatus((oldStatus) => {
          // // Check if status changed from revision to done/error
          // if (
          //   oldStatus &&
          //   oldStatus.startsWith("Revision in progress") &&
          //   (currentStatus === "done" || currentStatus === "error")
          // ) {
          //   window.location.reload();
          // }
          // Only update prevStatus if current status is different
          if (oldStatus !== currentStatus) {
            return currentStatus;
          }
          return oldStatus;
        });
        setStatus(currentStatus);
        if (currentStatus === "done" || currentStatus === "error") {
          stopPolling();
        }
        return currentStatus;
      } catch (error) {
        console.error("Error fetching report status:", error);
        return null;
      }
    };

    // Fetch immediately
    fetchStatus();

    // Set up polling every 5 seconds
    intervalIdRef.current = setInterval(async () => {
      const currentStatus = await fetchStatus();
      // stop polling if status is "done" or "error"
      if (currentStatus === "done" || currentStatus === "error") {
        stopPolling();
      }
    }, 5000);
  };

  useEffect(() => {
    startPolling();
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [reportId, keyName, token]);

  return {
    prevStatus,
    status,
    setStatus,
    startPolling,
    stopPolling,
  };
};

interface GenerateReportResponse {
  report_id: string;
  status: string;
}

export const generateReport = async (
  apiEndpoint: string,
  token: string,
  apiKeyName: string,
  userQuestion: string,
  sources: string[] = [],
  clarifications = []
): Promise<GenerateReportResponse> => {
  if (!token) throw new Error("No token");
  if (!userQuestion) throw new Error("No user question");
  if (!apiKeyName) throw new Error("No api key name");

  const res = await fetch(
    setupBaseUrl({
      apiEndpoint,
      protocol: "http",
      path: "oracle/begin_generation",
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key_name: apiKeyName,
        token,
        // jic text area has changed.
        // if it's been emptied, use the original question
        user_question: userQuestion,
        sources: sources,
        task_type: "exploration",
        clarifications,
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to generate report");

  return await res.json();
};

export const getClarifications = async (
  apiEndpoint: string,
  token: string,
  apiKeyName: string,
  userQuestion: string
) => {
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
        key_name: apiKeyName,
        token,
        user_question: userQuestion,
        task_type: "exploration",
        answered_clarifications: [],
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to get clarifications");
  const data = await res.json();
  return data.clarifications;
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
  apiKeyName: string,
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
          key_name: apiKeyName,
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

/**
 * Returns a string representation of the timestamp passed. (defaults to Date.now())
 * in the same format that the backend creates for reports
 * Sample format: "2025-02-11T08:13:28.761375",
 */
export const oracleReportTimestamp = (dateObj: Date = new Date()) =>
  dateObj.toISOString().replace("Z", "");
