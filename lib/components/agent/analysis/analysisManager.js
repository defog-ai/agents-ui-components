import { v4 } from "uuid";
import {
  createAnalysis,
  deleteSteps,
  generateQueryForCsv,
  getAnalysis,
} from "../../utils/utils";
import { runQueryOnDb } from "../../utils/sqlite";
import setupBaseUrl from "../..//utils/setupBaseUrl";

// the name of the prop where the data is stored for each stage
const propNames = {
  clarify: "clarification_questions",
  gen_approaches: "approaches",
  gen_steps: "steps",
};

const agentRequestTypes = ["clarify", "gen_steps"];

/**
 * @typedef {object} AnalysisManager
 * @property {function} init - Initializes the analysis manager
 * @property {boolean} wasNewAnalysisCreated - If the analysis was newly created
 * @property {object} analysisData - The analysis data
 * @property {function} getAnalysisData - Returns the analysis data
 * @property {function} subscribeToDataChanges - Subscribes to data changes
 * @property {function} updateStepData - Updates the data for a particular step
 * @property {function} getAnalysisBusy - Returns the analysis busy state
 * @property {function} subscribeToAnalysisBusyChanges - Subscribes to analysis busy changes
 * @property {function} setAnalysisBusy - Sets the analysis busy state
 * @property {function} submit - Submits a query
 * @property {function} reRun - Reruns a step
 * @property {function} deleteSteps - Deletes steps
 * @property {function} destroy - Destroys the analysis manager
 * @property {function} setOnNewDataCallback - Sets the new data callback
 * @property {boolean} didInit - If the analysis manager has been initialized
 */

/**
 * @typedef {object} AnalysisManagerConfig - The configuration object for the AnalysisManager
 * @property {string} config.analysisId - The id of the analysis
 * @property {string} config.apiEndpoint - The endpoint for the api
 * @property {function} config.onNewData - Callback for new data
 * @property {function} config.onManagerDestroyed - Callback for when the manager is destroyed
 * @property {function} config.onError - Callback for errors
 * @property {string} config.token - token for verficiation with defog servers
 * @property {string} config.keyName - api key name
 * @property {boolean} config.devMode - dev mode
 * @property {object} config.metadata - metadata for the database
 * @property {boolean} config.isTemp - is this a temporary database (sqlite + csv)
 * @property {object} config.createAnalysisRequestBody - request body for creating an analysis. This will be sent to the backend
 * @property {boolean} config.sqlOnly - if this is a sql only analysis
 */

/**
 * Manages a single analysis. Will submit/receive different stages of the analysis, updates the data of the analysis as we receive new info from the server.
 * Provides subscribe functions for subscribing to analysis data updates.
 * Includes functions for sqlite querying in case needed.
 * @param {AnalysisManagerConfig} config - The configuration object for the AnalysisManager
 * @returns {AnalysisManager} - The Analysis Manager
 */
function AnalysisManager({
  analysisId,
  apiEndpoint,
  token,
  keyName,
  devMode,
  metadata,
  isTemp,
  sqlOnly = false,
  onNewData = (...args) => {},
  onManagerDestroyed = (...args) => {},
  onError = (...args) => {},
  createAnalysisRequestBody = {},
}) {
  let analysisData = null;
  let analysisBusy;
  let reRunningSteps = [];
  let wasNewAnalysisCreated = false;
  let listeners = [];
  let analysisBusyListeners = [];
  let destroyed = false;
  let retries = 0;
  let didInit = false;
  let _onNewData = onNewData;

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

  function getAnalysisData() {
    return analysisData;
  }

  function getAnalysisBusy() {
    return analysisBusy;
  }

  function destroy() {
    console.groupCollapsed("Destroying. Open for trace");
    console.log("Destroying");
    console.trace();
    console.groupEnd();
    destroyed = true;
    onManagerDestroyed(this, analysisId);
  }

  function setAnalysisData(newVal, stageDone = true) {
    analysisData = newVal;
    analysisData["currentStage"] = getCurrentStage();
    analysisData["nextStage"] = getNextStage();

    emitDataChange();
  }

  function setAnalysisBusy(newVal) {
    analysisBusy = newVal;
    emitBusyChange();
  }

  async function init({ question, existingData = null, sqliteConn }) {
    didInit = true;

    if (analysisData) return;

    // console.log("Analysis Manager init");
    // get analysis data
    let fetchedAnalysisData = null;
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
    // update existingAnalysisData with the created analysisData
    else if (sqlOnly && isTemp) {
      // not the greatest way.
      const sqliteTableName = metadata[0].table_name;

      const res = await generateQueryForCsv({
        question: question,
        metadata: metadata.map((d) => ({
          column_name: d.column_name || "",
          data_type: d.data_type || "",
          column_description: d.column_description || "",
          table_name: sqliteTableName,
        })),
        keyName: keyName,
        apiEndpoint: apiEndpoint,
      });

      if (res.error_message || !res.success) {
        throw new Error(res.error_message || "Something went wrong.");
      }

      const stepId = v4();

      // run query on sqlite
      const [columns, rows] = runQueryOnDb({
        conn: sqliteConn,
        query: res.sql,
      });

      // console.log(columns, rows);

      const csvStr =
        columns.join(",") +
        "\n" +
        rows.map((d) => d.map((cell) => `"${cell}"`).join(",")).join("\n");
      
      // we want only a single fetch step
      // ugly way to construct the step and the analysis data
      const step = {
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
        sql: res.sql,
        outputs: {
          "answer": { "data": csvStr },
        }
      };

      fetchedAnalysisData = {
        analysis_id: analysisId,
        user_question: question,
        currentStage: "gen_steps",
        nextStage: null,
        is_root_analysis: createAnalysisRequestBody.other_data.is_root_analysis,
        root_analysis_id: createAnalysisRequestBody.other_data.root_analysis_id,
        direct_parent_id: createAnalysisRequestBody.other_data.direct_parent_id,
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

  function getCurrentStage() {
    const lastExistingStage = Object.keys(analysisData)
      .filter((d) => agentRequestTypes.includes(d))
      .sort(
        (a, b) => agentRequestTypes.indexOf(a) - agentRequestTypes.indexOf(b)
      )
      .pop();

    return lastExistingStage;
  }

  function getNextStage() {
    const currentStage = getCurrentStage();
    const nextStageIndex = agentRequestTypes.indexOf(currentStage) + 1;

    return agentRequestTypes[nextStageIndex];
  }

  async function deleteStepsWrapper(stepIds) {
    const res = await deleteSteps(analysisId, stepIds, apiEndpoint);

    if (res.success && res.new_steps) {
      let newAnalysisData = { ...analysisData };
      // if new steps are empty, delete the gen_steps key
      // else update the steps
      if (res.new_steps.length === 0) {
        delete newAnalysisData.gen_steps;
        // if clarification is also empty, destroy
        if (!newAnalysisData?.clarify?.clarification_questions?.length) {
          destroy();
        }
      } else {
        newAnalysisData = {
          ...newAnalysisData,
          gen_steps: {
            ...newAnalysisData.gen_steps,
            steps: res.new_steps,
          },
        };
      }
      setAnalysisData(newAnalysisData);
    } else {
      throw new Error(
        res.error_message || "Something went wrong while deleting steps."
      );
    }
  }

  async function submit(query, stageInput = {}) {
    try {
      if (destroyed) {
        throw new Error("Analysis Manager already destroyed.");
      }

      setAnalysisBusy(true);

      let nextStage = getNextStage();
      let endpoint;

      if (nextStage === "clarify" && !sqlOnly) {
        endpoint = clarifyEndpoint;
      } else if (nextStage === "gen_steps" || sqlOnly) {
        nextStage = "gen_steps";
        endpoint = getStepEndpoint;
      }

      // set empty prop as next stage so that current stage changes
      setAnalysisData(
        {
          ...analysisData,
          [nextStage]: {
            success: true,
            [propNames[nextStage]]: [],
          },
        },
        false
      );

      let done = false;

      while (!done) {
        const body = {
          ...stageInput,
          request_type: nextStage,
          analysis_id: analysisId,
          user_question: query,
          skip_intro: true,
          skip_conclusion: true,
          max_approaches: 1,
          skip_extra_approaches: true,
          skip_text_gen: true,
          sql_only: sqlOnly,
          token: token,
          temp: isTemp,
          key_name: keyName,
          db_creds: null,
          dev: devMode,
        };

        console.groupCollapsed("Analysis Manager submitting");
        console.log("Analysis data:", analysisData);
        console.log("Request body", body);
        console.groupEnd();

        if (!endpoint) {
          throw new Error("Endpoint not found");
        }

        let res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify(body),
        }).then((d) => d.json());

        console.log(res);

        if (!res || !res.success) {
          res = {
            error_message: (res && res.error_message) || "Could not fetch data",
          };
        }
        if (res.error_message) {
          throw new Error(res.error_message);
        }

        done = mergeNewDataToAnalysis(query, res, nextStage);

        console.log("Done: ", done);
      }
    } catch (e) {
      setAnalysisBusy(false);
      console.log(e);
      onError(e);
    }
  }

  /**
   *
   * @param {{stepId: {}}} update
   */
  function updateStepData(update) {
    const newAnalysisData = { ...analysisData };
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

  function mergeNewDataToAnalysis(query, response, requestType) {
    let newAnalysisData = { ...analysisData };
    newAnalysisData["user_question"] = query;
    let prop;
    let skip = false;
    let done = true;

    try {
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
            response[prop].forEach(async (res) => {
              const idx = newAnalysisData[requestType][prop].findIndex(
                (d) => d[overwrite_key] === res[overwrite_key]
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
            ].concat(response[prop]);
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

  async function reRun(stepId) {
    if (!analysisData.gen_steps || !analysisData.gen_steps.steps) {
      throw new Error("No steps found in analysis data");
    }
    try {
      setAnalysisBusy(true);

      // find the edited step in analysisData.gen_steps.steps

      const editedStep = analysisData.gen_steps.steps.find(
        (d) => d.id === stepId
      );

      if (!editedStep) {
        throw new Error("Step not found");
      }

      console.log(editedStep);

      const body = {
        key_name: keyName,
        analysis_id: analysisId,
        step_id: stepId,
        edited_step: editedStep,
        toolboxes: [],
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
      newAnalysisData.gen_steps.steps = res.steps;
      setAnalysisData(newAnalysisData);
    } catch (e) {
      throw new Error(e);
    } finally {
      setAnalysisBusy(false);
    }
  }

  function subscribeToDataChanges(listener) {
    listeners = [...listeners, listener];

    return function unsubscribe() {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function emitDataChange() {
    listeners.forEach((l) => l());
  }

  function subscribeToAnalysisBusyChanges(listener) {
    analysisBusyListeners = [...analysisBusyListeners, listener];

    return function unsubscribe() {
      analysisBusyListeners = analysisBusyListeners.filter(
        (l) => l !== listener
      );
    };
  }

  function emitBusyChange() {
    analysisBusyListeners.forEach((l) => l());
  }

  function setOnNewDataCallback(callback) {
    _onNewData = callback;
  }

  return {
    init,
    get wasNewAnalysisCreated() {
      return wasNewAnalysisCreated;
    },
    set wasNewAnalysisCreated(val) {
      wasNewAnalysisCreated = val;
    },
    get analysisData() {
      return Object.assign({}, analysisData);
    },
    set analysisData(val) {
      analysisData = val;
    },
    get reRunningSteps() {
      return reRunningSteps.slice();
    },
    set reRunningSteps(val) {
      reRunningSteps = val;
    },
    getAnalysisData,
    subscribeToDataChanges,
    updateStepData,
    getAnalysisBusy,
    subscribeToAnalysisBusyChanges,
    setAnalysisBusy,
    submit,
    reRun,
    deleteSteps: deleteStepsWrapper,
    destroy,
    setOnNewDataCallback,
    get didInit() {
      return didInit;
    },
  };
}

export default AnalysisManager;
