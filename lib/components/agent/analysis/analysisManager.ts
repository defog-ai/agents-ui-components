import {
  createAnalysis,
  generateQueryForCsv,
  retryQueryForCsv,
  getAnalysis,
  deleteStepAnalysisFromLocalStorage,
  escapeStringForCsv,
  parseData,
} from "../../utils/utils";
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

const agentRequestTypes: string[] = ["clarify", "gen_steps"];

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

function parseOutputs(
  data: { outputs?: Record<string, OutputData> },
  analysisData: AnalysisData | null
): Record<string, ParsedOutput> {
  let parsedOutputs: Record<string, ParsedOutput> = {};
  // go through data and parse all tables
  Object.keys(data?.outputs || {}).forEach((k) => {
    parsedOutputs[k] = {} as ParsedOutput;
    // check if this has data, reactive_vars and chart_images
    parsedOutputs[k].csvString = data.outputs![k].data;
    if (data.outputs![k].data) {
      parsedOutputs[k].data = parseData(data.outputs![k].data);
      parsedOutputs[k].chartManager = createChartManager({
        data: parsedOutputs[k].data.data,
        availableColumns: parsedOutputs[k].data.columns,
      });
    }
    if (data.outputs![k].reactive_vars) {
      parsedOutputs[k].reactive_vars = data.outputs![k].reactive_vars;

      // check if title is defined
      if (!parsedOutputs[k]?.reactive_vars?.title) {
        Object.defineProperty(parsedOutputs[k].reactive_vars, "title", {
          get() {
            return analysisData?.user_question;
          },
        });
      }
    }
    if (data.outputs![k].chart_images) {
      parsedOutputs[k].chart_images = data.outputs![k].chart_images;
    }
    if (data.outputs![k].analysis) {
      parsedOutputs[k].analysis = data.outputs![k].analysis;
    }
  });
  return parsedOutputs;
}

export interface Step {
  code_str: string;
  description: string;
  done: boolean;
  error_message: string | null;
  id: string;
  instructions_used: string;
  outputs_storage_keys: string[];
  reference_queries: { question: string; sql: string }[];
  sql?: string;
  parent_step?: Step | null;
  tool_name: string | null;
  outputs: Record<string, { data: string }>;
  activeTab?: "chart" | "table" | null;
  input_metadata: Record<
    string,
    {
      default: string | null;
      description: string;
      name: string;
      type: string;
    }
  >;
  inputs: Record<string, any>;
  model_generated_inputs: Record<string, any>;
  parsedOutputs?: { [key: string]: ParsedOutput };
}

export interface AnalysisData {
  analysis_id?: string;
  currentStage?: string | null | undefined;
  direct_parent_id?: string | null;
  follow_up_analyses?: any[];
  gen_steps?: {
    success?: boolean;
    steps: Step[];
  };
  clarify?: {
    success?: boolean;
    clarification_questions?: string[];
  };
  nextStage?: string | null;
  parent_analyses?: string[];
  timestamp?: string;
  user_question?: string;
  success?: boolean;
  analysis_data?: any;
  error_message?: string;
  is_root_analysis?: boolean;
  root_analysis_id?: string;
  [key: string]: any;
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
  updateStepData: (update: Record<string, any>) => void;
  getAnalysisBusy: () => boolean;
  subscribeToAnalysisBusyChanges: (
    callback: (busy: boolean) => void
  ) => () => void;
  setAnalysisBusy: (busy: boolean) => void;
  submit: (query: string, stageInput?: Record<string, any>) => Promise<void>;
  reRun: (stepId: string, sqliteConn?: any) => Promise<void>;
  createNewStep: ({
    tool_name,
    inputs,
    analysis_id,
    outputs_storage_keys,
  }: {
    tool_name: string;
    inputs: Record<string, any>;
    analysis_id: string;
    outputs_storage_keys: string[];
  }) => Promise<void>;
  destroy: () => void;
  setOnNewDataCallback: (callback: (data: AnalysisData) => void) => void;
  didInit: boolean;
  reRunningSteps: string[];
  getActiveStepId: () => string | null;
  setActiveStepId: (stepId: string | null) => void;
  getActiveStep: () => Step | null;
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
  activeTab?: "table" | "chart" | null;
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
  activeTab = "table",
}: AnalysisManagerConfig): AnalysisManager {
  let analysisData: AnalysisData | null = null;
  let reRunningSteps: string[] = [];
  let wasNewAnalysisCreated = false;
  let listeners: (() => void)[] = [];
  let destroyed = false;
  let retries = 0;
  let didInit = false;
  let _onNewData = onNewData;
  let analysisBusy = false;
  let analysisBusyListeners: ((busy: boolean) => void)[] = [];
  let activeStepId: string | null = null;
  let _activeTab = activeTab || "table";

  const clarifyEndpoint = setupBaseUrl({
    protocol: "http",
    path: "clarify",
    apiEndpoint: apiEndpoint,
  });

  const getStepEndpoint = setupBaseUrl({
    protocol: "http",
    path: "generate_step",
    apiEndpoint: apiEndpoint,
  });

  const reRunEndpoint = setupBaseUrl({
    protocol: "http",
    path: "rerun_step",
    apiEndpoint: apiEndpoint,
  });

  const createNewStepEndpoint = setupBaseUrl({
    protocol: "http",
    path: "manually_create_new_step",
    apiEndpoint: apiEndpoint,
  });

  function getAnalysisData(): AnalysisData | null {
    return analysisData;
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

    analysisData = newData;

    analysisData["currentStage"] = getCurrentStage();
    analysisData["nextStage"] = getNextStage();

    // reparse all outputs
    if (analysisData.gen_steps?.steps) {
      analysisData.gen_steps.steps.forEach((stepData) => {
        try {
          stepData.parsedOutputs = parseOutputs(stepData, analysisData);
        } catch (e) {
          console.log("Error parsing outputs", e);
          stepData.parsedOutputs = {};
        }
      });

      if (
        // if this has actual steps, set the activeStepId to the last step
        analysisData.gen_steps.steps.length > 0
      ) {
        const lastStep =
          analysisData.gen_steps.steps[analysisData.gen_steps.steps.length - 1];
        setActiveStepId(lastStep.id);
      } else {
        setActiveStepId(null);
      }
    }

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
    existingData?: AnalysisData | null;
    sqliteConn?: any;
  }): Promise<{ analysisData?: AnalysisData | null }> {
    didInit = true;

    if (analysisData) return {};

    // console.log("Analysis Manager init");
    // get analysis data
    let fetchedAnalysisData: AnalysisData | null = null;
    let newAnalysisCreated = false;

    if (existingData) {
      fetchedAnalysisData = existingData;
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

      fetchedAnalysisData = {
        analysis_id: analysisId,
        user_question: question,
        currentStage: "gen_steps",
        nextStage: null,
        is_root_analysis:
          createAnalysisRequestBody.initialisation_details.is_root_analysis,
        root_analysis_id:
          createAnalysisRequestBody.initialisation_details.root_analysis_id,
        direct_parent_id:
          createAnalysisRequestBody.initialisation_details.direct_parent_id,
        clarify: {
          success: true,
          clarification_questions: [],
        },
        gen_steps: {
          success: true,
          steps: [step],
        },
      };
    } else {
      const res = await getAnalysis(analysisId, apiEndpoint);
      if (!res.success) {
        // create a new analysis
        fetchedAnalysisData = await createAnalysis(
          token,
          keyName,
          apiEndpoint,
          analysisId,
          createAnalysisRequestBody
        );

        if (
          !fetchedAnalysisData.success ||
          !fetchedAnalysisData.analysis_data
        ) {
          // this is a hacky fix for collaboration on documents.
          // this might be an analysis that has been create already
          // when a user creates an analysis on one doc, the yjs updates before
          // the analysis can be added to the db. so another person on the same doc will get an error if
          // they try to query the db too quickly.
          // So we retry a few times
          // retry after 1 second
          if (retries < 2) {
            retries++;
            console.log("Analysis Manager retrying", retries);
            await new Promise((resolve) => setTimeout(resolve, 1000)).then(
              async () => {
                await init({
                  question,
                  existingData,
                  sqliteConn,
                });
              }
            );
          }

          // if more than 4 retries
          // stop loading, send error
          throw new Error(fetchedAnalysisData?.error_message);
        } else {
          fetchedAnalysisData = fetchedAnalysisData.analysis_data;
        }

        newAnalysisCreated = true;
      } else {
        fetchedAnalysisData = res.analysis_data;
      }

      // console.log(analysisId);

      // console.log(fetchedAnalysisData);
      wasNewAnalysisCreated = newAnalysisCreated;
    }

    // if this has steps but steps are empty, delete gen_steps key
    if (
      fetchedAnalysisData?.gen_steps &&
      fetchedAnalysisData.gen_steps.steps.length === 0
    ) {
      delete fetchedAnalysisData.gen_steps;
    }

    // update the analysis data
    setAnalysisData(fetchedAnalysisData);

    return {
      analysisData: fetchedAnalysisData,
    };
  }

  function getCurrentStage(): string | undefined {
    const lastExistingStage = Object.keys(analysisData || {})
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
      let endpoint;

      if (nextStage === "clarify") {
        endpoint = clarifyEndpoint;
      } else if (nextStage === "gen_steps") {
        endpoint = getStepEndpoint;
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

      let done = false;

      while (!done) {
        const body = {
          ...stageInput,
          request_type: nextStage,
          analysis_id: analysisId,
          user_question: query,
          sql_only: sqlOnly,
          token: token,
          temp: isTemp,
          key_name: keyName,
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

        done = mergeNewDataToAnalysis(query, res, nextStage!);
      }
    } catch (e) {
      setAnalysisBusy(false);
      console.log(e);
      onAbortError(e);
    }
  }

  function updateStepData(update: Record<string, any>): void {
    const newAnalysisData = { ...analysisData };
    if (!newAnalysisData) return;

    const stepIds = Object.keys(update);

    stepIds.forEach((stepId) => {
      if (newAnalysisData.gen_steps) {
        const idx = newAnalysisData.gen_steps.steps.findIndex(
          (d) => d.id === stepId
        );

        if (idx > -1) {
          newAnalysisData.gen_steps.steps[idx] = {
            ...newAnalysisData.gen_steps.steps[idx],
            ...update[stepId],
          };
        }
      }
    });

    setAnalysisData(newAnalysisData);
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
    let skip = false;
    let done = true;

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
        if (!newAnalysisData[requestType]) {
          newAnalysisData = { ...newAnalysisData, [requestType]: response };
        } else {
          // check if the response has an "overwrite_key"
          // if there's an overwrite_key provided,
          // then go through old data, and the new_data
          // if the overwrite_key is found in the old data, replace it with the elements that exist new_data with the same overwrite_key
          // if it's not found, just append the item to the end
          const overwrite_key = response.overwrite_key;
          if (overwrite_key) {
            response[prop].forEach(async (res: any) => {
              const idx = newAnalysisData[requestType][prop].findIndex(
                (d: any) => d[overwrite_key] === res[overwrite_key]
              );

              if (idx > -1) {
                newAnalysisData[requestType][prop][idx] = res;
                if (requestType === "gen_steps" && res.id) {
                  // if this is gen_steps, we also need to update the latest tool run data
                  // update it in the cache
                }
              } else {
                newAnalysisData[requestType][prop].push(res);
              }
            });
          } else {
            newAnalysisData[requestType][prop] = newAnalysisData[requestType][
              prop
            ].concat(
              // by default initialise all steps to show the initial active tab we determined when we created the question the first time.
              response[prop].map((d) => ({
                ...d,
                activeTab: _activeTab,
              }))
            );
          }
        }
      }

      done = response.done || false;
    } catch (e) {
      console.log(e);
      response = { error_message: e };

      // if we have an error, and the current stage's data is empty, remove it
      if (
        newAnalysisData &&
        newAnalysisData.currentStage &&
        newAnalysisData?.[newAnalysisData.currentStage]?.[
          propNames[newAnalysisData.currentStage]
        ]?.length === 0
      ) {
        delete newAnalysisData[newAnalysisData.currentStage];
      }

      // set done to true so that we don't send any more requests
      done = true;
      setAnalysisBusy(false);
    } finally {
      if (!skip) {
        if (done) {
          setAnalysisBusy(false);
        }

        setAnalysisData(newAnalysisData);
        if (_onNewData && typeof _onNewData === "function") {
          _onNewData(response, newAnalysisData);
        }
      }
    }

    return done;
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
      done: true,
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
        key_name: keyName,
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
      }).then((d) => d.json());

      console.log(res);

      if (!res.success || !res.steps) {
        throw new Error(res.error_message || "Could not rerun step");
      }

      const newAnalysisData = { ...analysisData };
      if (!newAnalysisData.gen_steps) return;
      newAnalysisData.gen_steps.steps = res.steps;
      // remove this step's analysis from local storage
      // do this before we setAnalysisData as that will trigger a re render
      deleteStepAnalysisFromLocalStorage(stepId);

      setAnalysisData(newAnalysisData);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function createNewStep({
    tool_name,
    inputs,
    analysis_id,
    outputs_storage_keys,
  }: {
    tool_name: string;
    inputs: Record<string, any>;
    analysis_id: string;
    outputs_storage_keys: string[];
  }): Promise<void> {
    const res = await fetch(createNewStepEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool_name,
        inputs,
        analysis_id,
        outputs_storage_keys,
        key_name: keyName,
        planner_question_suffix: plannerQuestionSuffix,
        extra_tools: extraTools,
      }),
    }).then((d) => d.json());

    if (!res.success || !res.new_steps) {
      throw new Error(res.error_message || "Could not create new step");
    }

    const newAnalysisData = { ...analysisData };
    if (!newAnalysisData) return;

    if (!newAnalysisData.gen_steps) {
      newAnalysisData.gen_steps = {
        success: true,
        steps: [],
      };
    }

    newAnalysisData.gen_steps.steps = res.new_steps;
    setAnalysisData(newAnalysisData);
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

  function getActiveStepId(): string | null {
    return activeStepId;
  }

  function setActiveStepId(stepId: string | null): void {
    activeStepId = stepId;
  }

  function getActiveStep(): Step | null {
    if (!activeStepId || !analysisData?.gen_steps?.steps) return null;
    return (
      analysisData.gen_steps.steps.find((s) => s.id === activeStepId) || null
    );
  }

  return {
    init,
    get wasNewAnalysisCreated() {
      return wasNewAnalysisCreated;
    },
    set wasNewAnalysisCreated(val: boolean) {
      wasNewAnalysisCreated = val;
    },
    get analysisData() {
      return Object.assign({}, analysisData);
    },
    set analysisData(val: AnalysisData) {
      analysisData = val;
    },
    get reRunningSteps() {
      return reRunningSteps.slice();
    },
    set reRunningSteps(val: string[]) {
      reRunningSteps = val;
    },
    get didInit() {
      return didInit;
    },
    getAnalysisData,
    subscribeToDataChanges,
    updateStepData,
    getAnalysisBusy,
    subscribeToAnalysisBusyChanges,
    setAnalysisBusy,
    submit,
    reRun,
    createNewStep,
    destroy,
    setOnNewDataCallback,
    getActiveStepId,
    setActiveStepId,
    getActiveStep,
  };
}

export default createAnalysisManager;
