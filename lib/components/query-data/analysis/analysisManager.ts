import setupBaseUrl from "../../utils/setupBaseUrl";
import {
  ChartManager,
  createChartManager,
} from "../../observable-charts/ChartManagerContext";
import {
  createAnalysis,
  fetchAnalysis,
  fetchPDFSearchResults,
} from "../queryDataUtils";
import { parseData } from "@agent";

type Stage = "clarify" | "generate_analysis";

/**
 * Raw outputs of a step.
 */
export interface OutputData {
  data?: string;
  reactive_vars?: {
    title?: string;
    [key: string]: any;
  };
  chart_images?: any;
  analysis?: any;
}

/**
 * Parsed output of a step.
 */
export interface ParsedOutput {
  csvString?: string;
  data: any;
  /** The chart manager for this output */
  chartManager: ChartManager;
  reactive_vars: {
    title?: string;
    [key: string]: any;
  };
  chart_images: any;
  analysis: any;
}

function parseOutput(csvString: string): ParsedOutput {
  const parsedOutput = {} as ParsedOutput;

  parsedOutput.csvString = csvString;
  parsedOutput.data = parseData(csvString);
  parsedOutput.chartManager = createChartManager({
    data: parsedOutput.data.data,
    availableColumns: parsedOutput.data.columns,
  });

  return parsedOutput;
}

export interface PlainText {
  text: string;
  type: "text";
}

export interface Citation {
  cited_text: string;
  document_index: number;
  document_title: string;
  end_page_number: number;
  start_page_number: number;
  type: string;
}

export interface CitedText {
  citations: Citation[];
  text: string;
  type: "text";
}

export type PDFSearchResults = (PlainText | CitedText)[];

export interface Inputs {
  question: string;
  hard_filters: string[];
  db_name: string;
  previous_context: PreviousContext;
}

export interface AnalysisData {
  db_name: string;
  error: string;
  instructions_used?: string;
  initial_question?: string;
  tool_name?: string;
  inputs?: Inputs;
  assignment_understanding?: string | null;
  clarification_questions?: {
    question: string;
    response: string;
    response_formatted: string;
  }[];
  sql?: string;
  output?: string;
  parsedOutput?: ParsedOutput;
  pdf_search_results?: PDFSearchResults | string;
}

export interface AnalysisRowFromBackend {
  analysis_id: string;
  timestamp: string;
  db_name: string;
  user_question?: string;
  follow_up_analyses?: string[] | null;
  parent_analyses?: string[] | null;
  is_root_analysis?: boolean;
  root_analysis_id?: string | null;
  direct_parent_id?: string | null;
  data?: AnalysisData | null;
}

export interface AnalysisManager {
  init: (params: {
    question: string;
    existingData?: AnalysisRowFromBackend | null;
  }) => Promise<void>;
  analysis: AnalysisRowFromBackend | null;
  wasNewAnalysisCreated: boolean;
  getAnalysis: () => AnalysisRowFromBackend | null;
  subscribeToDataChanges: (callback: () => void) => () => void;
  getAnalysisBusy: () => boolean;
  subscribeToAnalysisBusyChanges: (
    callback: (busy: boolean) => void
  ) => () => void;
  setAnalysisBusy: (busy: boolean) => void;
  submit: (query: string, stageInput?: Record<string, any>) => Promise<void>;
  reRun: (editedInputs: EditedInputs) => Promise<void>;
  destroy: () => void;
  setOnNewDataCallback: (callback: (data: AnalysisData) => void) => void;
  didInit: boolean;
}

export interface AnalysisManagerConfig {
  analysisId: string;
  rootAnalysisId?: string;
  apiEndpoint: string;
  token: string | null;
  projectName: string;
  metadata: ColumnMetadata[] | null;
  isTemp: boolean;
  sqlOnly?: boolean;
  extraTools?: Array<{
    code: string;
    tool_name: string;
    tool_description: string;
    input_metadata: any;
    output_metadata: any;
  }>;
  plannerQuestionSuffix?: string | null;
  previousContextCreator?: () => PreviousContext;
  onNewData?: (...args: any[]) => void;
  onManagerDestroyed?: (...args: any[]) => void;
  onAbortError?: (...args: any[]) => void;
  createAnalysisRequestBody?: any;
}

function createAnalysisManager({
  analysisId,
  rootAnalysisId,
  apiEndpoint,
  token,
  projectName,
  metadata,
  isTemp,
  sqlOnly = false,
  extraTools = [],
  plannerQuestionSuffix = "",
  previousContextCreator = () => [],
  onNewData = (...args: any[]) => {},
  onManagerDestroyed = (...args: any[]) => {},
  onAbortError = (...args: any[]) => {},
  createAnalysisRequestBody = {},
}: AnalysisManagerConfig): AnalysisManager {
  let analysis: AnalysisRowFromBackend | null = null;
  let wasNewAnalysisCreated = false;
  let listeners: (() => void)[] = [];
  let destroyed = false;
  let retries = 0;
  let didInit = false;
  let _onNewData = onNewData;
  let analysisBusy = false;
  let analysisBusyListeners: ((busy: boolean) => void)[] = [];

  const clarifyEndpoint = setupBaseUrl({
    protocol: "http",
    path: "query-data/clarify",
    apiEndpoint: apiEndpoint,
  });

  const generateAnalysisEndpoint = setupBaseUrl({
    protocol: "http",
    path: "query-data/generate_analysis",
    apiEndpoint: apiEndpoint,
  });

  const reRunEndpoint = setupBaseUrl({
    protocol: "http",
    path: "query-data/rerun",
    apiEndpoint: apiEndpoint,
  });

  function getAnalysis(): AnalysisRowFromBackend | null {
    return analysis || null;
  }

  function getAnalysisBusy(): boolean {
    return analysisBusy;
  }

  function destroy(): void {
    if (destroyed) console.warn("Already destroyed");

    console.groupCollapsed("Destroying. Open for trace");
    console.log("Destroying");
    console.trace();
    console.groupEnd();
    destroyed = true;
    onManagerDestroyed();
  }

  function updateAnalysis(newAnalysis: AnalysisRowFromBackend | null): void {
    if (!newAnalysis) return;

    // reparse outputs
    if (newAnalysis?.data?.output) {
      newAnalysis.data.parsedOutput = parseOutput(newAnalysis.data.output!);
    }

    analysis = newAnalysis;

    emitDataChange();
  }

  function setAnalysisBusy(busy: boolean): void {
    analysisBusy = busy;
    emitBusyChange();
  }

  async function init({
    question,
    existingData = null,
  }: {
    question: string;
    existingData?: AnalysisRowFromBackend | null;
  }): Promise<void> {
    didInit = true;

    // console.log("Analysis Manager init");
    // get analysis data
    let fetchedAnalysis: AnalysisRowFromBackend | null = null;
    let newAnalysisCreated = false;

    if (existingData) {
      fetchedAnalysis = existingData;
      newAnalysisCreated = false;
    } else {
      const res = await fetchAnalysis(analysisId, token, apiEndpoint);
      if (!res) {
        // create a new analysis
        fetchedAnalysis = await createAnalysis(
          token,
          projectName,
          apiEndpoint,
          analysisId,
          createAnalysisRequestBody
        );

        newAnalysisCreated = true;
      } else {
        fetchedAnalysis = res;
      }

      wasNewAnalysisCreated = newAnalysisCreated;
    }

    // update the analysis data
    updateAnalysis(fetchedAnalysis);
  }

  function getNextStage(): Stage {
    if (!analysis?.data?.clarification_questions) return "clarify";
    else return "generate_analysis";
  }

  async function submit(
    query: string,
    stageInput: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (destroyed) {
        throw new Error("Analysis Manager already destroyed.");
      }

      setAnalysisBusy(true);

      let nextStage = getNextStage();
      let endpoint: string | URL | Request;

      if (nextStage === "clarify") {
        endpoint = clarifyEndpoint;
      } else if (nextStage === "generate_analysis") {
        endpoint = generateAnalysisEndpoint;
      }

      const body = {
        ...stageInput,
        request_type: nextStage,
        analysis_id: analysisId,
        user_question: query,
        sql_only: sqlOnly,
        token: token,
        temp: isTemp,
        db_name: projectName,
        db_creds: null,
        previous_context: previousContextCreator(),
        root_analysis_id: rootAnalysisId,
        extra_tools: extraTools,
        planner_question_suffix: plannerQuestionSuffix,
      };

      console.groupCollapsed("Analysis Manager submitting");
      // console.log("Analysis data:", analysisData);
      console.log("Request body", body);

      if (!endpoint) {
        throw new Error("Endpoint not found");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to submit.");
      }

      const newAnalysis: AnalysisRowFromBackend = await res.json();

      console.log(newAnalysis);
      console.groupEnd();

      updateAnalysis(newAnalysis);

      // If analysis is successful and has SQL but no PDF search results yet, fetch them
      if (
        newAnalysis?.data?.sql &&
        !newAnalysis?.data?.error &&
        !newAnalysis?.data?.pdf_search_results &&
        analysis
      ) {
        getPdfSearchResults();
      }
    } catch (e) {
      console.log(e);
      onAbortError(e);
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function reRun(editedInputs: EditedInputs): Promise<void> {
    if (!editedInputs) {
      throw new Error("No inputs provided");
    }

    try {
      setAnalysisBusy(true);

      const body = {
        token: token,
        db_name: projectName,
        analysis_id: analysisId,
        edited_inputs: editedInputs,
      };

      const res = await fetch(reRunEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Could not rerun step");
      }

      const data = await res.json();

      updateAnalysis(data);

      // If rerun was successful and has SQL but no PDF search results, fetch them
      if (
        data?.data?.sql &&
        !data?.data?.error &&
        !data?.data?.pdf_search_results &&
        data.analysis_id
      ) {
        getPdfSearchResults();
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAnalysisBusy(false);
    }
  }

  function subscribeToDataChanges(listener: () => void): () => void {
    listeners = [...listeners, listener];

    return function unsubscribe() {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function emitDataChange(): void {
    listeners.forEach((l) => l());
  }

  function subscribeToAnalysisBusyChanges(
    callback: (busy: boolean) => void
  ): () => void {
    analysisBusyListeners = [...analysisBusyListeners, callback];
    return function unsubscribe() {
      analysisBusyListeners = analysisBusyListeners.filter(
        (l) => l !== callback
      );
    };
  }

  function getPdfSearchResults() {
    // Fetch PDF search results without blocking
    // Make sure apiEndpoint doesn't end with a slash
    fetchPDFSearchResults(analysis.analysis_id, apiEndpoint, token)
      .then((results) => {
        if (analysis && analysis.data) {
          updateAnalysis({
            ...analysis,
            data: {
              ...analysis.data,
              pdf_search_results: results,
            },
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching PDF search results:", error);
        if (analysis && analysis.data) {
          updateAnalysis({
            ...analysis,
            data: {
              ...analysis.data,
              pdf_search_results: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          });
        }
      });
  }

  function emitBusyChange(): void {
    analysisBusyListeners.forEach((l) => l(analysisBusy));
  }

  function setOnNewDataCallback(callback: (data: AnalysisData) => void): void {
    _onNewData = callback;
  }

  return {
    init,
    get wasNewAnalysisCreated() {
      return wasNewAnalysisCreated;
    },
    set wasNewAnalysisCreated(val: boolean) {
      wasNewAnalysisCreated = val;
    },
    get didInit() {
      return didInit;
    },
    get analysis() {
      return analysis;
    },
    getAnalysis,
    subscribeToDataChanges,
    getAnalysisBusy,
    subscribeToAnalysisBusyChanges,
    setAnalysisBusy,
    submit,
    reRun,
    destroy,
    setOnNewDataCallback,
  };
}

export default createAnalysisManager;
