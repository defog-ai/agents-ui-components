import {
  createAnalysis,
  generateQueryForCsv,
  retryQueryForCsv,
  getAnalysis,
  escapeStringForCsv,
  parseData,
} from "@utils/utils";
import { runQueryOnDb } from "../../utils/sqlite";
import setupBaseUrl from "../..//utils/setupBaseUrl";
import {
  ChartManager,
  createChartManager,
} from "../../observable-charts/ChartManagerContext";

// the name of the prop where the data is stored for each stage
const propNames: Record<string, string> = {
  clarify: "clarification_questions",
  gen_approaches: "approaches",
  gen_steps: "steps",
};

const agentRequestTypes: string[] = ["clarification_questions", "output"];

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

export interface Inputs {
  question: string;
  hard_filters: string[];
  db_name: string;
  previous_context: PreviousContext;
}

export interface AnalysisData {
  db_name: string;
  error: string;
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
}

export interface Analysis {
  analysis_id: string;
  timestamp: string;
  db_name: string;
  currentStage: string;
  nextStage: string;
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
    existingData?: AnalysisData | null;
    sqliteConn?: any;
  }) => Promise<{ analysisData?: AnalysisData }>;
  wasNewAnalysisCreated: boolean;
  analysisData: AnalysisData;
  getAnalysisData: () => AnalysisData | null;
  subscribeToDataChanges: (callback: () => void) => () => void;
  getAnalysisBusy: () => boolean;
  subscribeToAnalysisBusyChanges: (
    callback: (busy: boolean) => void
  ) => () => void;
  setAnalysisBusy: (busy: boolean) => void;
  submit: (query: string, stageInput?: Record<string, any>) => Promise<void>;
  reRun: (stepId: string, sqliteConn?: any) => Promise<void>;
  destroy: () => void;
  setOnNewDataCallback: (callback: (data: AnalysisData) => void) => void;
  didInit: boolean;
  reRunningSteps: string[];
}

export interface AnalysisManagerConfig {
  analysisId: string;
  rootAnalysisId?: string;
  apiEndpoint: string;
  token: string | null;
  keyName: string;
  devMode: boolean;
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
  previousContext?: PreviousContext;
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
  keyName,
  devMode,
  metadata,
  isTemp,
  sqlOnly = false,
  extraTools = [],
  plannerQuestionSuffix = "",
  previousContext = [],
  onNewData = (...args: any[]) => {},
  onManagerDestroyed = (...args: any[]) => {},
  onAbortError = (...args: any[]) => {},
  createAnalysisRequestBody = {},
}: AnalysisManagerConfig): AnalysisManager {
  let analysis: Analysis | null = null;
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
    path: "query-data/rerun_step",
    apiEndpoint: apiEndpoint,
  });

  function getAnalysisData(): AnalysisData | null {
    return analysis ? analysis?.data : null;
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

  function setAnalysisData(newData: AnalysisData | null): void {
    if (!newData) return;

    const newAnalysis = { ...analysis, data: newData };

    newAnalysis.data["currentStage"] = getCurrentStage();
    newAnalysis.data["nextStage"] = getNextStage();

    // reparse outputs
    if (newAnalysis.data.output) {
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
    sqliteConn,
  }: {
    question: string;
    existingData?: Analysis | null;
    sqliteConn?: any;
  }): Promise<Analysis | null> {
    didInit = true;

    // console.log("Analysis Manager init");
    // get analysis data
    let fetchedAnalysis: Analysis | null = null;
    let newAnalysisCreated = false;

    if (existingData) {
      fetchedAnalysis = existingData;
      newAnalysisCreated = false;
    }

    // if this is sql only, and is temp, then we don't want to fetch the analysis data from the backend
    // we will send a request to api.defog.ai/query_csv route
    // and get back the sql query to run on the sqlite database
    // run the sql on the sqlite database
    // then create analysis data object with the required format
    // or if it's an error, then tool_run_details = {error_message: error}
    else if (sqlOnly && isTemp) {
      const step = await generateStepForCsv(question, sqliteConn, token);

      console.log(step);

      fetchedAnalysis = {
        analysis_id: analysisId,
        timestamp: new Date().toISOString(),
        db_name: keyName,
        user_question: question,
        currentStage: "gen_steps",
        nextStage: null,
        is_root_analysis:
          createAnalysisRequestBody.initialisation_details.is_root_analysis,
        root_analysis_id:
          createAnalysisRequestBody.initialisation_details.root_analysis_id,
        direct_parent_id:
          createAnalysisRequestBody.initialisation_details.direct_parent_id,
      };
    } else {
      const res = await getAnalysis(analysisId, token, apiEndpoint);
      if (!res) {
        // create a new analysis
        fetchedAnalysis = await createAnalysis(
          token,
          keyName,
          apiEndpoint,
          analysisId,
          createAnalysisRequestBody
        );

        newAnalysisCreated = true;
      } else {
        fetchedAnalysis = res.analysis_data;
      }

      wasNewAnalysisCreated = newAnalysisCreated;
    }
    analysis = fetchedAnalysis;

    // update the analysis data
    setAnalysisData(fetchedAnalysis.data);

    return fetchedAnalysis;
  }

  function getCurrentStage(): string | undefined {
    const lastExistingStage = Object.keys(analysis.data || {})
      .filter((d) => agentRequestTypes.includes(d))
      .sort(
        (a, b) => agentRequestTypes.indexOf(a) - agentRequestTypes.indexOf(b)
      )
      .pop();

    return lastExistingStage;
  }

  function getNextStage(): string {
    const currentStage = getCurrentStage();
    const nextStageIndex =
      (currentStage ? agentRequestTypes.indexOf(currentStage) : -1) + 1;

    return agentRequestTypes[nextStageIndex];
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
      } else if (nextStage === "gen_steps") {
        endpoint = generateAnalysisEndpoint;
      }

      if (!analysisData) return;

      // set empty prop as next stage so that current stage changes
      setAnalysisData({
        ...analysisData,
        [nextStage!]: {
          success: true,
          [propNames[nextStage!]]: [],
        },
      });

      const body = {
        ...stageInput,
        request_type: nextStage,
        analysis_id: analysisId,
        user_question: query,
        sql_only: sqlOnly,
        token: token,
        temp: isTemp,
        db_name: keyName,
        db_creds: null,
        dev: devMode,
        previous_context: previousContext,
        root_analysis_id: rootAnalysisId,
        extra_tools: extraTools,
        planner_question_suffix: plannerQuestionSuffix,
      };

      console.groupCollapsed("Analysis Manager submitting");
      console.log("Analysis data:", analysisData);
      console.log("Request body", body);

      if (!endpoint) {
        throw new Error("Endpoint not found");
      }

      let res;

      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify(body),
        }).then((d) => d.json());
      } catch {
        // if the fetch fails, manually construct a res so that we can handle
        // whatever the new analysis data will be
        res = {
          error_message: "Request timed out. Please try again.",
        };
      }

      console.log(res);
      console.groupEnd();

      if (!res || !res.success) {
        res = {
          error_message: (res && res.error_message) || "Could not fetch data",
        };
      }

      mergeNewDataToAnalysis(query, res, nextStage!);
    } catch (e) {
      setAnalysisBusy(false);
      console.log(e);
      onAbortError(e);
    }
  }

  function mergeNewDataToAnalysis(
    query: string,
    response: any,
    requestType: string
  ): boolean {
    let newAnalysisData = { ...analysisData };
    if (!newAnalysisData) return true;

    newAnalysisData["user_question"] = query;
    let prop: string;

    try {
      // if there was an error, throw it
      // the catch block handles what to do with the anlaysis data in case of an error
      // and sends it back to the front end
      if (response.error_message) {
        throw new Error(response.error_message);
      }

      prop = propNames[requestType];

      const nextStage =
        agentRequestTypes[agentRequestTypes.indexOf(requestType) + 1];

      if (nextStage) {
        // if any of the stages including and after nextStage exists
        // remove all data from those stages (to mimic what happens on the backend)
        let idx = agentRequestTypes.indexOf(nextStage) + 1;
        if (idx < agentRequestTypes.length) {
          while (idx < agentRequestTypes.length) {
            delete newAnalysisData[agentRequestTypes[idx]];
            idx++;
          }
        }
      }

      if (response && response.success && response[prop]) {
        newAnalysisData = { ...newAnalysisData, [requestType]: response };
      }
    } catch (e) {
      console.log(e);
      response = { error_message: e };

      // if we have an error, remove the current stage data
      delete newAnalysisData[newAnalysisData.currentStage];
    } finally {
      setAnalysisBusy(false);
      setAnalysisData(newAnalysisData);
      if (_onNewData && typeof _onNewData === "function") {
        _onNewData(response, newAnalysisData);
      }
    }
  }

  function runQueryOnCsvAndGetOutput(query: string, sqliteConn: any) {
    // run query on sqlite
    const { columns, rows, error } = runQueryOnDb({
      conn: sqliteConn,
      query: query,
    });

    // convert rows to csv
    const csvStr =
      columns.join(",") +
      "\n" +
      rows
        .map((d) => d.map((cell) => `"${escapeStringForCsv(cell)}"`).join(","))
        .join("\n");

    return { columns, rows, csvStr, error };
  }

  async function generateStepForCsv(
    question: string,
    sqliteConn: any,
    token: string | null
  ): Promise<Step> {
    const res = await generateQueryForCsv({
      question: question,
      metadata:
        metadata &&
        metadata.map((d) => ({
          column_name: d.column_name || "",
          data_type: d.data_type || "",
          column_description: d.column_description || "",
          table_name: d.table_name,
        })),
      keyName: keyName,
      apiEndpoint: apiEndpoint,
      previousContext: previousContext,
      token,
    });

    const stepId = crypto.randomUUID();

    let answerCsv: string;
    let answerSql: string;

    if (!res.sql) {
      throw new Error("No SQL generated.");
    }
    const { csvStr, error } = runQueryOnCsvAndGetOutput(res.sql, sqliteConn);

    if (error) {
      console.error("There was an error running this query");
      console.error(res.sql);
      console.error(error);
    }

    const previousError = error;

    if (error) {
      console.info("Retrying the query");
      const retryRes = await retryQueryForCsv({
        question: question,
        metadata:
          metadata &&
          metadata.map((d) => ({
            column_name: d.column_name || "",
            data_type: d.data_type || "",
            column_description: d.column_description || "",
            table_name: d.table_name,
          })),
        keyName: keyName,
        apiEndpoint: apiEndpoint,
        previousQuery: res.sql,
        error: previousError,
        token,
      });

      if (retryRes.error_message || !retryRes.success) {
        throw new Error(retryRes.error_message || "Something went wrong.");
      }

      if (!retryRes.sql) {
        throw new Error("No SQL generated.");
      }

      const { csvStr, error } = runQueryOnCsvAndGetOutput(
        retryRes.sql,
        sqliteConn
      );

      if (error) {
        throw new Error(error);
      }

      answerCsv = csvStr;
      answerSql = retryRes.sql;
    } else {
      answerCsv = csvStr;
      answerSql = res.sql;
    }

    const step: Step = {
      description: question,
      tool_name: "data_fetcher_and_aggregator",
      inputs: {
        question: question,
        global_dict: {
          dev: devMode,
          temp: isTemp,
        },
      },
      outputs_storage_keys: ["answer"],
      id: stepId,
      error_message: null,
      input_metadata: {
        question: {
          name: "question",
          type: "str",
          default: null,
          description: question,
        },
      },
      model_generated_inputs: {
        question: question,
        global_dict: {
          dev: devMode,
          temp: isTemp,
        },
      },
      sql: answerSql,
      outputs: {
        answer: { data: answerCsv },
      },
      code_str: "",
      instructions_used: "",
      reference_queries: [],
      parsedOutputs: {},
    };

    return step;
  }

  async function reRunCsv(sqliteConn: any): Promise<void> {
    if (!analysisData) return;
    const newAnalysisData = { ...analysisData };
    if (!newAnalysisData || !newAnalysisData.gen_steps?.steps) return;

    // empty the steps that we show a loader on the frontend
    const tempAnalysisData = { ...analysisData };
    delete tempAnalysisData.gen_steps;
    delete tempAnalysisData.clarify;

    setAnalysisData(tempAnalysisData);

    // we can only have one step in this
    // if the question has changed, we will generate a completely new step
    // if the sql has changed, we will just run that sql and update the step accordingly
    const currentStep = newAnalysisData.gen_steps.steps[0];
    const currentQuestion = currentStep.inputs.question;
    const sql = currentStep.sql;

    const originalQuestion = currentStep.model_generated_inputs.question;

    console.log(currentQuestion, originalQuestion);

    if (currentQuestion !== originalQuestion) {
      // generate a new step
      const newStep = await generateStepForCsv(
        currentQuestion,
        sqliteConn,
        token
      );
      newAnalysisData.gen_steps.steps = [newStep];
      setAnalysisData(newAnalysisData);
    } else {
      if (!sql) {
        throw new Error("No SQL generated.");
      }

      // re run the sql and update the step
      const { csvStr } = runQueryOnCsvAndGetOutput(sql, sqliteConn);

      const newStep = { ...currentStep };
      newStep.outputs = {
        answer: { data: csvStr },
      };
      newStep.sql = sql;

      newAnalysisData.gen_steps.steps = [newStep];
      setAnalysisData(newAnalysisData);
    }
  }

  async function reRun(stepId: string, sqliteConn: any): Promise<void> {
    if (!analysisData?.gen_steps?.steps) {
      throw new Error("No steps found in analysis data");
    }

    try {
      if (isTemp && sqlOnly) {
        reRunCsv(sqliteConn);
        return;
      }
      setAnalysisBusy(true);

      // find the edited step in analysisData.gen_steps.steps
      const editedStep = analysisData.gen_steps.steps.find(
        (d) => d.id === stepId
      );

      if (!editedStep) {
        throw new Error("Step not found");
      }

      const body = {
        token: token,
        db_name: keyName,
        analysis_id: analysisId,
        step_id: stepId,
        edited_step: editedStep,
        planner_question_suffix: plannerQuestionSuffix,
        extra_tools: extraTools,
      };

      const res = await fetch(reRunEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log(res);

      if (!res.ok) {
        throw new Error("Could not rerun step");
      }

      const data = await res.json();

      setAnalysisData(data);
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
    getAnalysisData,
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
