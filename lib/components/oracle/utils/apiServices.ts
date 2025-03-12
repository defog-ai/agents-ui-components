// apiServices.ts
import setupBaseUrl from "../../utils/setupBaseUrl";
import {
  OracleReportComment,
  ReportData,
  ListReportResponse,
  ClarificationObject,
  SourceItem,
  OracleAnalysis,
} from "./types";
import { parseMDX } from "./mdxParser";

/**
 * Generate a new analysis
 */
export const generateNewAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  analysisId: string,
  recommendationIdx: number,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Delete an analysis
 */
export const deleteAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  analysisId: string,
  recommendationIdx: number | null,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Get report analysis IDs
 */
export const getReportAnalysisIds = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        db_name: projectName,
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

/**
 * Get a specific report analysis
 */
export const getReportAnalysis = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
  token: string,
  analysisId: string
): Promise<{
  analysis_id: string;
  analysis_json?: OracleAnalysis;
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
        db_name: projectName,
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

/**
 * Get report MDX content
 */
export const getReportMDX = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Update report MDX content
 */
export const updateReportMDX = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Get a report image
 */
export const getReportImage = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        image_file_name: imageFileName,
        db_name: projectName,
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

/**
 * Get report analyses MDX content
 */
export const getReportAnalysesMdx = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Get report comments
 */
export const getReportComments = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Update report comments
 */
export const updateReportComments = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Submit a report for revision
 */
export const submitForRevision = async (
  apiEndpoint: string,
  reportId: string,
  projectName: string,
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
        mode: "no-cors",
      },
      body: JSON.stringify({
        db_name: projectName,
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

/**
 * Fetch and parse report data
 */
export async function fetchAndParseReportData(
  apiEndpoint: string,
  reportId: string,
  projectName: string,
  token: string
): Promise<ReportData> {
  const { mdx, analyses } = await getReportMDX(
    apiEndpoint,
    reportId,
    projectName,
    token
  );

  let parsed = parseMDX(mdx);
  let fetchedComments = await getReportComments(
    apiEndpoint,
    reportId,
    projectName,
    token
  );

  return {
    parsed,
    analyses: analyses,
    comments: fetchedComments,
  };
}

/**
 * Fetch all reports
 */
export const fetchReports = async (
  apiEndpoint: string,
  token: string,
  projectName: string
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
        body: JSON.stringify({ token, db_name: projectName }),
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

/**
 * Delete a report
 */
export const deleteReport = async (
  apiEndpoint: string,
  reportId: string,
  token: string,
  projectName: string
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
          db_name: projectName,
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

/**
 * Generate a new report
 */
export const generateReport = async (
  apiEndpoint: string,
  token: string,
  projectName: string,
  reportId: string,
  userQuestion: string,
  clarifications = [],
  useWebsearch: boolean = true
): Promise<void> => {
  if (!token) throw new Error("No token");
  if (!userQuestion) throw new Error("No user question");
  if (!projectName) throw new Error("No project name");

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
        db_name: projectName,
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

/**
 * Get clarifications for a question
 */
export const getClarifications = async (
  apiEndpoint: string,
  token: string,
  projectName: string,
  userQuestion: string
): Promise<{
  clarifications: ClarificationObject[];
  report_id: string;
  new_db_info?: ProjectDbInfo;
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
        db_name: projectName,
        token,
        user_question: userQuestion,
      }),
    }
  );

  if (!res.ok) {
    throw new Error((await res.text()) || "Failed to get clarifications");
  }

  const data = await res.json();
  return data;
};

/**
 * Get web sources for a user question
 */
export const getSources = async (
  apiEndpoint: string,
  token: string,
  projectName: string,
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
          db_name: projectName,
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
