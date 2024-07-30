import { v4 } from "uuid";
import {
  createAnalysis,
  deleteToolRunIds,
  generateQueryForCsv,
  getAnalysis,
  getToolRunData,
} from "../../utils/utils";
import { runQueryOnDb } from "../../utils/sqlite";

// the name of the prop where the data is stored for each stage
const propNames = {
  clarify: "clarification_questions",
  gen_approaches: "approaches",
  gen_steps: "steps",
  gen_report: "report_sections",
};

const agentRequestTypes = ["clarify", "gen_steps"];

/**
 * @typedef {object} AnalysisManagerConfig - The configuration object for the AnalysisManager
 * @property {string} config.analysisId - The id of the analysis
 * @property {string} config.apiEndpoint - The endpoint for the api
 * @property {object} config.mainSocket - The main websocket
 * @property {object} config.rerunSocket - The rerun websocket
 * @property {function} config.onNewData - Callback for new data
 * @property {function} config.onReRunData - Callback for rerun data
 * @property {function} config.onManagerDestroyed - Callback for when the manager is destroyed
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
 */
function AnalysisManager({
  analysisId,
  apiEndpoint,
  token,
  keyName,
  devMode,
  metadata,
  isTemp,
  mainSocket = null,
  rerunSocket = null,
  onNewData = (...args) => {},
  onReRunData = (...args) => {},
  onManagerDestroyed = (...args) => {},
  createAnalysisRequestBody = {},
  sqlOnly = false,
}) {
  let analysisData = null;
  let toolRunDataCache = {};
  let reRunningSteps = [];
  let wasNewAnalysisCreated = false;
  let listeners = [];
  let destroyed = false;
  let retries = 0;
  let didInit = false;
  let _onReRunData = onReRunData;
  let _onNewData = onNewData;
  let _metadata = metadata;

  function getAnalysisData() {
    return analysisData;
  }

  function destroy() {
    console.log("destroyed");
    destroyed = true;
    onManagerDestroyed(this, analysisId);
  }

  function setAnalysisData(newVal) {
    analysisData = newVal;
    analysisData["currentStage"] = getCurrentStage();
    analysisData["nextStage"] = getNextStage();
    emitDataChange();
  }

  async function init({ question, existingData = null, sqliteConn }) {
    didInit = true;

    if (analysisData) return;

    // console.log("Analysis Manager init");
    // get report data
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

      const toolRunId = v4();

      // we want only a single fetch step
      // ugly way to construct the step and the analysis data
      const step = {
        description: question,
        tool_name: "data_fetcher_and_aggregator",
        inputs: {
          question: question,
          global_dict: {
            dfg_api_key:
              "b1522a23c3a5dd680dc77e758aa757ba73a36c45deb3c7b3c3dd2cd9b86e898c",
            dev: devMode,
            temp: isTemp,
          },
        },
        outputs_storage_keys: ["answer"],
        done: true,
        tool_run_id: toolRunId,
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
            dfg_api_key:
              "b1522a23c3a5dd680dc77e758aa757ba73a36c45deb3c7b3c3dd2cd9b86e898c",
            dev: devMode,
            temp: isTemp,
          },
        },
      };

      fetchedAnalysisData = {
        report_id: analysisId,
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

      // update the tool run data cache
      toolRunDataCache = {
        ...toolRunDataCache,
        [toolRunId]: {
          success: true,
          tool_run_data: {
            tool_run_id: toolRunId,
            step: step,
            outputs: {
              answer: {
                data: csvStr,
              },
            },
            tool_name: "data_fetcher_and_aggregator",
            tool_run_details: {
              sql: res.sql,
            },
            error_message: null,
            edited: false,
            analysis_id: analysisId,
          },
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

        if (!fetchedAnalysisData.success || !fetchedAnalysisData.report_data) {
          // this is a hacky fix for collaboration on documents.
          // this might be an analysis that has been create already
          // when a user creates an analysis on one doc, the yjs updates before
          // the analysis can be added to the db. so another person on the same doc will get an error if
          // they try to query the db too quickly.
          // So we retry a few times
          // retry after 1 second
          if (retries < 4) {
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
          // stop loading, throw error
          throw new Error(fetchedAnalysisData?.error_message);
        } else {
          fetchedAnalysisData = fetchedAnalysisData.report_data;
        }

        newAnalysisCreated = true;
      } else {
        fetchedAnalysisData = res.report_data;
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

  async function deleteSteps(toolRunIds) {
    const res = await deleteToolRunIds(analysisId, toolRunIds, apiEndpoint);

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

  function submit(query, stageInput = {}, submitSourceStage = null) {
    if (destroyed) {
      throw new Error("Analysis Manager already destroyed.");
    }
    if (!mainSocket || !mainSocket?.isConnected()) {
      mainSocket?.reconnect?.();
      throw new Error(
        "Not connected to servers. Trying to reconnect. Please try again!"
      );
    }

    const nextStage = getNextStage();
    const prop = propNames[nextStage];

    const body = {
      ...stageInput,
      request_type: nextStage,
      report_id: analysisId,
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
    console.log("Submitting", analysisData);
    console.groupEnd();

    mainSocket.send(body);

    const newAnalysisData = { ...analysisData };
    newAnalysisData["user_question"] = query;
    // create empty array if doesn't exist
    if (!newAnalysisData?.[nextStage]) {
      newAnalysisData[nextStage] = { success: true, [prop]: [] };
    }

    setAnalysisData(newAnalysisData);
  }

  function setMainSocket(newSocket) {
    mainSocket = newSocket;
  }

  function setReRunSocket(newSocket) {
    rerunSocket = newSocket;
  }

  function onMainSocketMessage(event) {
    let response;
    let newAnalysisData = { ...analysisData };
    let rType, prop;
    let skip = false;

    // if it's a pong request, skip
    try {
      if (!event.data) {
        console.log("No data in event");
        return;
      }

      response = JSON.parse(event.data);

      if (response.pong) {
        skip = true;
        return;
      }

      // if the response's analysis_id isn't this analysisId, ignore
      if (response?.analysis_id !== analysisId) {
        skip = true;
        return;
      }

      if (response?.error_message) {
        throw new Error(response.error_message);
      }

      rType = response.request_type;
      prop = propNames[rType];

      const nextStage = agentRequestTypes[agentRequestTypes.indexOf(rType) + 1];

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

      if (response.output && response.output.success && response.output[prop]) {
        if (!newAnalysisData[rType]) {
          newAnalysisData = { ...newAnalysisData, [rType]: response.output };
        } else {
          // check if the response has an "overwrite_key"
          // if there's an overwrite_key provided,
          // then go through old data, and the new_data
          // if the overwrite_key is found in the old data, replace it with the elements that exist new_data with the same overwrite_key
          // if it's not found, just append the item to the end
          const overwrite_key = response.overwrite_key;
          if (overwrite_key) {
            const newToolRunDataCache = { ...toolRunDataCache };
            response.output[prop].forEach(async (res) => {
              const idx = newAnalysisData[rType][prop].findIndex(
                (d) => d[overwrite_key] === res[overwrite_key]
              );

              if (idx > -1) {
                newAnalysisData[rType][prop][idx] = res;
                if (rType === "gen_steps" && res.tool_run_id) {
                  // if this is gen_steps, we also need to update the latest tool run data
                  // update it in the cache
                  const updatedData = await getToolRunData(
                    res.tool_run_id,
                    apiEndpoint
                  );
                  if (updatedData.success) {
                    newToolRunDataCache[updatedData.tool_run_id] = updatedData;
                  }
                }
              } else {
                newAnalysisData[rType][prop].push(res);
              }
            });
            toolRunDataCache = newToolRunDataCache;
          } else {
            newAnalysisData[rType][prop] = newAnalysisData[rType][prop].concat(
              response.output[prop]
            );
          }
        }
      }
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
    } finally {
      if (skip) return;

      setAnalysisData(newAnalysisData);
      if (_onNewData && typeof _onNewData === "function") {
        _onNewData(response, newAnalysisData);
      }
    }
  }

  function initiateReRun(toolRunId, preRunActions) {
    if (!rerunSocket.isConnected()) {
      rerunSocket?.reconnect?.();
      console.log("Not connected to servers. Trying to reconnect.");
      return;
    }

    const newAnalysisData = { ...analysisData };

    if (
      preRunActions &&
      preRunActions?.action === "add_step" &&
      preRunActions?.new_step
    ) {
      // add the new step to analysisData
      newAnalysisData.gen_steps.steps.push(preRunActions.new_step);
      // update the analysis data
      analysisData = newAnalysisData;
    }

    if (rerunSocket && rerunSocket.send) {
      rerunSocket.send({
        tool_run_id: toolRunId,
        analysis_id: analysisId,
        dev: devMode,
        temp: isTemp,
        key_name: keyName,
        sql_only: sqlOnly,
      });
    }
  }

  async function onReRunSocketMessage(event) {
    let response;
    let newAnalysisData = { ...analysisData };
    let skip = false;
    try {
      if (!event.data) {
        console.log("No data in event");
        return;
      }
      response = JSON.parse(event.data);

      if (response?.analysis_id !== analysisId) {
        skip = true;
        return;
      }

      console.groupCollapsed("Analysis manager re run");
      console.log(response);

      let newReRunningSteps = reRunningSteps.slice();

      // re run messages can be of two types:
      // 1. which step is GOING TO BE RUN. this won't just be the step that was asked to be re run by the user.
      // this can also be the step's parents and it's children.
      // 2. the result of a re run of a step
      if (response.pre_tool_run_message) {
        // means this is just a notification that this step is going to be re run
        // so add this step to rerunning steps
        // this has better UX: lets us move and click around the dag on
        // any node but the currently rerunning step
        console.log("step re running started: ", response.pre_tool_run_message);

        newReRunningSteps.push({
          tool_run_id: response.pre_tool_run_message,
        });
      } else {
        // regardless of success or not, remove the tool run id from rerunning steps
        newReRunningSteps = newReRunningSteps.filter((d) => {
          return d.tool_run_id !== response.tool_run_id;
        });
      }

      let newToolRunDataCache = { ...toolRunDataCache };
      if (response.success) {
        newToolRunDataCache[response.tool_run_id] = Object.assign({}, response);
      }

      // if this re run has an error_message (or if it doesn't), update the analysisSteps
      const newSteps = newAnalysisData.gen_steps.steps.slice();

      const idx = newSteps.findIndex(
        (d) => d.tool_run_id === response.tool_run_id
      );

      if (idx > -1) {
        newSteps[idx] = {
          ...newSteps[idx],
          error_message:
            response?.tool_run_data?.error_message || response?.error_message,
        };
      }

      newAnalysisData.gen_steps.steps = newSteps;

      reRunningSteps = newReRunningSteps;
      toolRunDataCache = newToolRunDataCache;
    } catch (e) {
      console.log(e);
    } finally {
      if (skip) return;

      setAnalysisData(newAnalysisData);
      console.groupEnd();

      if (_onReRunData && typeof _onReRunData === "function") {
        _onReRunData(response);
      }
    }
  }

  let mainListenerIdx = null;
  let rerunListenerIdx = null;

  function addEventListeners() {
    mainListenerIdx = mainSocket.addEventListener(
      "message",
      onMainSocketMessage
    );
    rerunListenerIdx = rerunSocket.addEventListener(
      "message",
      onReRunSocketMessage
    );
  }

  function removeEventListeners() {
    if (mainSocket && mainSocket.removeEventListener) {
      mainSocket.removeEventListener(
        "message",
        onMainSocketMessage,
        mainListenerIdx
      );
    }
    if (rerunSocket && rerunSocket.removeEventListener) {
      rerunSocket.removeEventListener(
        "message",
        onReRunSocketMessage,
        rerunListenerIdx
      );
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

  function setOnReRunDataCallback(callback) {
    _onReRunData = callback;
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
    get toolRunDataCache() {
      return Object.assign({}, toolRunDataCache);
    },
    set toolRunDataCache(val) {
      toolRunDataCache = val;
    },
    get reRunningSteps() {
      return reRunningSteps.slice();
    },
    set reRunningSteps(val) {
      reRunningSteps = val;
    },
    getAnalysisData,
    subscribeToDataChanges,
    addEventListeners,
    removeEventListeners,
    submit,
    initiateReRun,
    setMainSocket,
    setReRunSocket,
    deleteSteps,
    destroy,
    setOnReRunDataCallback,
    setOnNewDataCallback,
    get didInit() {
      return didInit;
    },
  };
}

export default AnalysisManager;
