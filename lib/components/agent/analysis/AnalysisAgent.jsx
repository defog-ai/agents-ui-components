import React, {
  useEffect,
  useRef,
  useState,
  Fragment,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import AgentLoader from "../../common/AgentLoader";
// import LoadingLottie from "../../svg/loader.json";
import StepsDag from "./StepsDag";
import {
  sentenceCase,
  toolShortNames,
  trimStringToLength,
} from "../../utils/utils";
import Clarify from "./Clarify";
import AnalysisManager from "./analysisManager";
import setupBaseUrl from "../../utils/setupBaseUrl";
import { AnalysisFeedback } from "../feedback/AnalysisFeedback";
import {
  breakpoints,
  Collapse,
  Input,
  MessageManagerContext,
  SpinningLoader,
  useWindowSize,
} from "@ui-components";
import { twMerge } from "tailwind-merge";
import {
  AgentConfigContext,
  ReactiveVariablesContext,
} from "../../context/AgentContext";
import ErrorBoundary from "../../common/ErrorBoundary";
import { StopCircleIcon } from "@heroicons/react/20/solid";
import { StepResults } from "./tool-results/StepResults";

/**
 *
 * @typedef {Object} AnalysisAgentProps
 * @property {string} analysisId - Analysis ID.
 * @property {string} keyName - Api Key name.
 * @property {boolean} isTemp - Whether this is a temp analysis. Used in CSVs.
 * @property {Object} metadata - Metadata for this database.
 * @property {boolean} sqlOnly - Whether this is a sql only analysis.
 * @property {string} rootClassNames - Root class names.
 * @property {Object} createAnalysisRequestBody - Object that will be sent as the body of the fetch request to create_analysis.
 * @property {boolean} initiateAutoSubmit - Whether to initiate auto submit.
 * @property {boolean} hasExternalSearchBar - Whether this is being controlled by an external search bar.
 * @property {Function} setGlobalLoading - Global loading. Useful if you are handling multiple analysis..
 * @property {Function} onManagerCreated - Callback when analysis manager is created.
 * @property {Function} onManagerDestroyed - Callback when analysis manager is destroyed.
 * @property {{analysisManager?: Object}} initialConfig - Initial config if any.
 */

/**
 * Analysis Agent
 * @param {AnalysisAgentProps} props
 * */
export const AnalysisAgent = ({
  analysisId,
  keyName,
  isTemp = false,
  metadata = null,
  sqlOnly = false,
  rootClassNames = "",
  createAnalysisRequestBody = {},
  initiateAutoSubmit = false,
  hasExternalSearchBar = null,
  setGlobalLoading = (...args) => {},
  onManagerCreated = (...args) => {},
  onManagerDestroyed = (...args) => {},
  initialConfig = {
    analysisManager: null,
  },
}) => {
  const agentConfigContext = useContext(AgentConfigContext);
  const {
    devMode,
    apiEndpoint,
    token,
    mainManager,
    reRunManager,
    toolSocketManager,
  } = agentConfigContext.val;

  const getToolsEndpoint = setupBaseUrl({
    protocol: "http",
    path: "get_user_tools",
    apiEndpoint: apiEndpoint,
  });

  // console.log("Key name", keyName);
  // console.log("Did upload file", isTemp);
  const [pendingToolRunUpdates, setPendingToolRunUpdates] = useState({});
  const [reRunningSteps, setRerunningSteps] = useState([]);
  const reactiveContext = useContext(ReactiveVariablesContext);
  const [activeNode, setActiveNodePrivate] = useState(null);
  const [dag, setDag] = useState(null);
  const [dagLinks, setDagLinks] = useState([]);

  const windowSize = useWindowSize();

  // in case this isn't called from analysis tree viewer (which has a central singular search bar)
  // we will have an independent search bar for each analysis as well
  const independentAnalysisSearchRef = useRef();

  const [tools, setTools] = useState({});

  const ctr = useRef(null);

  const messageManager = useContext(MessageManagerContext);

  function onMainSocketMessage(response, newAnalysisData) {
    try {
      if (response.error_message) {
        // messageManager.error(response.error_message);
        throw new Error(response.error_message);
      }

      if (response && response?.done) {
        // setAnalysisBusy(false);
        setGlobalLoading(false);
      }

      if (newAnalysisData) {
        // if current stage is clarify
        // but clarification steps length is 0
        // submit again
        if (
          newAnalysisData.currentStage === "clarify" &&
          !newAnalysisData?.clarify?.clarification_questions?.length
        ) {
          handleSubmit(
            newAnalysisData.user_question,
            { clarification_questions: [] },
            null
          );
        }
      }
    } catch (e) {
      messageManager.error(e);
      console.log(e);

      // setAnalysisBusy(false);
      setGlobalLoading(false);

      // if the current stage is null, just destroy this analysis
      if (!newAnalysisData.currentStage) {
        analysisManager.removeEventListeners();
        analysisManager.destroy();
      }
    }
  }

  const onReRunMessage = useCallback(
    (response) => {
      try {
        setRerunningSteps(analysisManager.reRunningSteps);
        // remove all pending updates for this id
        // because all new data is already there in the received response
        setPendingToolRunUpdates((prev) => {
          const newUpdates = { ...prev };
          delete newUpdates[response.id];
          return newUpdates;
        });

        // and set active node to this one
        const parentNodes = [...dag.nodes()].filter(
          (d) =>
            d.data.isOutput && d.data.parentIds.find((p) => p === response.id)
        );
        if (parentNodes.length) {
          setActiveNodePrivate(parentNodes[0]);
        }

        if (response.error_message) {
          // messageManager.error(response.error_message);
          throw new Error(response.error_message);
        }

        // update reactive context
        Object.keys(response?.tool_run_data?.outputs || {}).forEach((k, i) => {
          if (!response?.tool_run_data?.outputs?.[k]?.reactive_vars) return;
          const runId = response.id;
          reactiveContext.update((prev) => {
            return {
              ...prev,
              [runId]: {
                ...prev[runId],
                [k]: response?.tool_run_data?.outputs?.[k]?.reactive_vars,
              },
            };
          });
        });
      } catch (e) {
        messageManager.error(e);
        console.log(e.stack);
      } finally {
        // setAnalysisBusy(false);
        setGlobalLoading(false);
      }
    },
    [dag]
  );

  const analysisManager = useMemo(() => {
    return (
      initialConfig.analysisManager ||
      AnalysisManager({
        analysisId,
        apiEndpoint,
        token,
        keyName,
        devMode,
        metadata,
        isTemp,
        sqlOnly,
        onNewData: onMainSocketMessage,
        onReRunData: onReRunMessage,
        onManagerDestroyed: onManagerDestroyed,
        createAnalysisRequestBody,
        mainSocket: null, // Add mainSocket property
        rerunSocket: null, // Add rerunSocket property
      })
    );
  }, [analysisId, messageManager]);

  analysisManager.setOnReRunDataCallback(onReRunMessage);

  const analysisBusy = useSyncExternalStore(
    analysisManager.subscribeToAnalysisBusyChanges,
    analysisManager.getAnalysisBiusy
  );

  const analysisData = useSyncExternalStore(
    analysisManager.subscribeToDataChanges,
    analysisManager.getAnalysisData
  );

  const toolRunDataCache = useSyncExternalStore(
    analysisManager.subscribeToToolRunDataCacheChanges,
    analysisManager.getToolRunDataCache
  );

  useEffect(() => {
    // update context
    agentConfigContext.update({
      ...agentConfigContext.val,
      analysisDataCache: {
        ...agentConfigContext.val.analysisDataCache,
        [analysisId]: analysisData,
      },
    });

    // if stage is done, also set busy to false
    if (analysisData && analysisData.stageDone) {
      // setAnalysisBusy(false);
      setGlobalLoading(false);
    }
  }, [analysisData]);

  console.log(analysisData);

  function setActiveNode(node) {
    setActiveNodePrivate(node);
    // if update_prop is "sql" or "code_str" or "analysis", update tool_run_details
    // if update_prop is inputs, update step.inputs
    // update in context
    Object.keys(pendingToolRunUpdates).forEach((stepId) => {
      const updateProps = Object.keys(pendingToolRunUpdates[stepId]);
      const toolRunData = toolRunDataCache[stepId]?.tool_run_data;
      if (!toolRunData) return;

      updateProps.forEach((updateProp) => {
        if (updateProp === "sql" || updateProp === "code_str") {
          // update tool_run_details
          toolRunData.tool_run_details[updateProp] =
            pendingToolRunUpdates[stepId][updateProp];
        } else if (updateProp === "inputs") {
          // update step.inputs
          toolRunData.step.inputs = pendingToolRunUpdates[stepId][updateProp];
        }
      });
      toolRunData.edited = true;

      // update the cache
      analysisManager.setToolRunDataCache((prev) => {
        return {
          ...prev,
          [stepId]: {
            ...prev[stepId],
            tool_run_data: toolRunData,
          },
        };
      });
    });

    setPendingToolRunUpdates({});
  }

  useEffect(() => {
    if (analysisManager.didInit) return;

    async function initialiseAnalysis() {
      try {
        const { analysisData = {}, toolRunDataCacheUpdates = {} } =
          await analysisManager.init({
            question: createAnalysisRequestBody?.other_data?.user_question,
            existingData:
              agentConfigContext?.val?.analysisDataCache?.[analysisId] || null,
            sqliteConn: agentConfigContext?.val?.sqliteConn,
          });

        const response = await fetch(getToolsEndpoint, {
          method: "POST",
          signal: AbortSignal.timeout(10000),
        });

        const tools = (await response.json())["tools"];
        setTools(tools);

        if (
          initiateAutoSubmit &&
          !analysisManager?.analysisData?.currentStage
        ) {
          handleSubmit(analysisManager?.analysisData?.user_question, {}, null);
        } else {
          // setAnalysisBusy(false);
        }

        if (analysisManager.wasNewAnalysisCreated) {
          // also have to set agentConfigContext in this case
          agentConfigContext.update({
            ...agentConfigContext.val,
            analyses: [...agentConfigContext.val.analyses, analysisId],
            analysisDataCache: {
              ...agentConfigContext.val.analysisDataCache,
              [analysisId]: analysisData,
            },
          });
        }
      } catch (e) {
        messageManager.error(e.message);
        console.log(e.stack);
        analysisManager.removeEventListeners();
        analysisManager.destroy();
      }
    }

    initialiseAnalysis();
  }, []);

  useEffect(() => {
    if (analysisManager) {
      onManagerCreated(analysisManager, analysisId, ctr.current);
      if (mainManager && reRunManager) {
        analysisManager.setMainSocket(mainManager);
        analysisManager.setReRunSocket(reRunManager);

        analysisManager.addEventListeners();
      }
    }
  }, [analysisManager, mainManager, reRunManager]);

  const handleSubmit = useCallback(
    (query, stageInput = {}, submitStage = null) => {
      try {
        if (!query) throw new Error("Query is empty");
        // setAnalysisBusy(true);
        setGlobalLoading(true);
        analysisManager.submit(query, { ...stageInput }, submitStage);
      } catch (e) {
        messageManager.error(e);
        console.log(e.stack);

        // setAnalysisBusy(false);
        setGlobalLoading(false);

        // if the current stage is null, and there is an external search bar, just destroy this analysis
        if (submitStage === null && hasExternalSearchBar) {
          analysisManager.removeEventListeners();
          analysisManager.destroy();
        }
      }
    },
    [analysisManager, setGlobalLoading, messageManager, sqlOnly]
  );

  const handleReRun = useCallback(
    (stepId, preRunActions = {}) => {
      if (
        !stepId ||
        !dag ||
        !analysisId ||
        !reRunManager ||
        !reRunManager.send ||
        !activeNode
      ) {
        console.log(stepId, dag, analysisId, reRunManager, activeNode);
        return;
      }

      try {
        analysisManager.initiateReRun(stepId, preRunActions);
      } catch (e) {
        messageManager.error(e);
        console.log(e.stack);
      }
    },
    [analysisId, activeNode, reRunManager, dag, analysisManager]
  );

  const titleDiv = (
    <div className="flex flex-row flex-wrap gap-4 p-6 items-center lg:items-start">
      <h1 className="font-bold text-xl text-gray-700 basis-0 grow min-w-[50%]">
        {sentenceCase(
          analysisData?.user_question ||
            createAnalysisRequestBody.user_question ||
            ""
        )}
      </h1>
      {!analysisBusy &&
      analysisData &&
      !(
        !analysisData ||
        (!analysisData.currentStage && hasExternalSearchBar)
      ) ? (
        <div className="basis-0 text-nowrap whitespace-nowrap">
          <AnalysisFeedback
            analysisSteps={analysisData?.gen_steps?.steps || []}
            analysisId={analysisId}
            user_question={analysisData?.user_question}
            apiEndpoint={apiEndpoint}
            token={token}
            keyName={keyName}
          />
        </div>
      ) : (
        <div className="basis-0 text-nowrap whitespace-nowrap group cursor-pointer">
          <StopCircleIcon
            className="w-6 h-6 text-rose-300 group-hover:text-rose-500"
            onClick={() => {
              setGlobalLoading(false);
              // setAnalysisBusy(false);
              analysisManager.removeEventListeners();
              analysisManager.destroy();
            }}
          ></StopCircleIcon>
        </div>
      )}
    </div>
  );

  const activestepId = useMemo(() => {
    if (!activeNode) return null;

    const toolRun = activeNode?.data?.isTool
      ? activeNode
      : [...activeNode?.parents()][0];

    return toolRun?.data?.step?.id;
  }, [activeNode]);

  console.log(activeNode);

  console.log(analysisData);

  return (
    <ErrorBoundary>
      <div
        ref={ctr}
        className={twMerge(
          "analysis-agent-container h-max min-h-20 relative grow outline-none focus:outline-none rounded-3xl border border-gray-300 bg-white",
          independentAnalysisSearchRef ? "bg-gray-50" : "max-w-full",
          rootClassNames
        )}
      >
        {/* if we don't have anlaysis data, and current stage is null, and we DO have a search ref */}
        {/* means tis is being externally initialised using analysis viewer and initateautosubmit is true */}
        {!analysisData ||
        (!analysisData.currentStage && hasExternalSearchBar) ? (
          <div className="transition-all w-full bg-gray-50 rounded-3xl">
            {titleDiv}
            <AgentLoader
              message={
                !analysisData
                  ? sqlOnly
                    ? "Fetching data..."
                    : "Setting up..."
                  : "Thinking..."
              }
              // lottieData={LoadingLottie}
              classNames={"m-0 h-full bg-transparent"}
            />
          </div>
        ) : (
          <>
            {!hasExternalSearchBar && !analysisData.currentStage ? (
              <div className="w-10/12 mx-auto relative top-6">
                <Input
                  ref={independentAnalysisSearchRef}
                  onPressEnter={(ev) => {
                    handleSubmit(ev.target.value);
                  }}
                  placeholder="Ask a question"
                  disabled={analysisBusy}
                  inputClassNames="w-full mx-auto shadow-custom hover:border-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <></>
            )}
            {analysisData.currentStage === "clarify" ? (
              <div className="transition-all w-full bg-gray-50 rounded-3xl">
                {titleDiv}
                <Clarify
                  data={analysisData.clarify}
                  handleSubmit={(stageInput, submitStage) => {
                    handleSubmit(
                      analysisData?.user_question,
                      stageInput,
                      submitStage
                    );
                  }}
                  globalLoading={analysisBusy}
                  stageDone={
                    analysisData.currentStage === "clarify"
                      ? !analysisBusy
                      : true
                  }
                  isCurrentStage={analysisData.currentStage === "clarify"}
                />
              </div>
            ) : (
              <></>
            )}

            {analysisData.currentStage === "gen_steps" ? (
              <div className="analysis-content w-full flex flex-col-reverse lg:flex-row h-full">
                <div className="analysis-results min-w-0 grow flex flex-col relative border-r">
                  {titleDiv}
                  <ErrorBoundary>
                    {analysisData?.gen_steps?.steps.length ? (
                      <>
                        <div className="grow px-6 rounded-b-3xl lg:rounded-br-none w-full bg-gray-50">
                          {/* {activestepId &&
                            // if this is sqlonly, we will wait for tool run data to be updated before showing anything
                            // because in the normal case, the tool run data can be fetched from the servers
                            // but in sql only case, we only have a local copy
                            (!isTemp ||
                              (isTemp &&
                                toolRunDataCache[activestepId])) && (
                              <StepResults
                                analysisId={analysisId}
                                activeNode={activeNode}
                                analysisData={analysisData}
                                step={null}
                                toolSocketManager={toolSocketManager}
                                apiEndpoint={apiEndpoint}
                                dag={dag}
                                setActiveNode={setActiveNode}
                                handleReRun={handleReRun}
                                reRunningSteps={reRunningSteps}
                                setPendingToolRunUpdates={
                                  setPendingToolRunUpdates
                                }
                                tools={tools}
                                analysisBusy={analysisBusy}
                                handleDeleteSteps={async (stepIds) => {
                                  try {
                                    await analysisManager.deleteSteps(
                                      stepIds
                                    );
                                  } catch (e) {
                                    messageManager.error(e);
                                    console.log(e.stack);
                                  }
                                }}
                              ></StepResults>
                            )} */}
                        </div>
                      </>
                    ) : (
                      analysisBusy && (
                        <div className="bg-gray-50 h-full flex items-center justify-center w-full rounded-3xl">
                          <AgentLoader
                            message={"Fetching data..."}
                            // lottieData={LoadingLottie}
                            classNames={"m-0 h-40 bg-transparent"}
                          />
                        </div>
                      )
                    )}
                  </ErrorBoundary>
                </div>
                {analysisData?.gen_steps?.steps && (
                  <div className="border-b border-b-gray-300 sm:border-b-0 lg:border-b-none  analysis-steps flex-initial rounded-t-3xl lg:rounded-r-3xl lg:rounded-tl-none bg-gray-50">
                    <Collapse
                      rootClassNames="mb-0 bg-gray-50 w-full rounded-t-3xl lg:rounded-r-3xl lg:rounded-tl-none lg:h-full"
                      title={
                        <div className="">
                          <span className="font-light lg:font-bold text-sm">
                            Steps
                          </span>
                          {analysisData.currentStage === "gen_steps" &&
                          analysisBusy ? (
                            <SpinningLoader classNames="ml-2 w-3 h-3 text-gray-400"></SpinningLoader>
                          ) : (
                            ""
                          )}
                        </div>
                      }
                      headerClassNames="lg:hidden flex flex-row items-center pl-5 lg:pointer-events-none lg:cursor-default"
                      iconClassNames="lg:hidden"
                      collapsed={windowSize[0] < breakpoints.lg}
                      alwaysOpen={windowSize[0] >= breakpoints.lg}
                    >
                      <StepsDag
                        steps={analysisData?.gen_steps?.steps || []}
                        nodeSize={[40, 10]}
                        nodeGap={[30, 50]}
                        setActiveNode={setActiveNode}
                        reRunningSteps={reRunningSteps}
                        activeNode={activeNode}
                        stageDone={
                          analysisData.currentStage === "gen_steps"
                            ? !analysisBusy
                            : true
                        }
                        dag={dag}
                        setDag={setDag}
                        dagLinks={dagLinks}
                        setDagLinks={setDagLinks}
                        extraNodeClasses={(node) => {
                          return node.data.isTool
                            ? `rounded-md px-1 text-center`
                            : "";
                        }}
                        toolIcon={(node) => {
                          return (
                            <p className="text-sm truncate m-0">
                              {trimStringToLength(
                                toolShortNames[node?.data?.step?.tool_name] ||
                                  tools[node?.data?.step?.tool_name][
                                    "tool_name"
                                  ] ||
                                  node?.data?.step?.tool_name,
                                15
                              )}
                            </p>
                          );
                        }}
                      />
                    </Collapse>
                  </div>
                )}
              </div>
            ) : (
              <></>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
