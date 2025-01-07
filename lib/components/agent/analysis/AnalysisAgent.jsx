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
import StepsDag from "./StepsDag";
import {
  sentenceCase,
  toolShortNames,
  trimStringToLength,
} from "../../utils/utils";
import Clarify from "./Clarify";
import AnalysisManager from "./analysisManager";
import setupBaseUrl from "../../utils/setupBaseUrl";
// import { AnalysisFeedback } from "../feedback/AnalysisFeedback";
import {
  breakpoints,
  Collapse,
  Input,
  MessageManagerContext,
  SpinningLoader,
  useWindowSize,
} from "@ui-components";
import { twMerge } from "tailwind-merge";
import { AgentConfigContext } from "../../context/AgentContext";
import ErrorBoundary from "../../common/ErrorBoundary";
import { CircleStop } from "lucide-react";
import { StepResults } from "./step-results/StepResults";

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
 * @property {string} searchBarPlaceholder - Placeholder for the internal search bar (useful only if hasExternalSearchBar is false).
 * @property {Array<{code:string, tool_name: string, function_name: string, tool_description: string, input_metadata: object, output_metadata: object}>} extraTools - if this analysis uses any extra tools. Used in the add tool UI.
 * @property {string} plannerQuestionSuffix - suffix for the planner model's question. Used in the add tool UI.
 * @property {Array.<Object>} previousQuestions - Questions that the user has asked so far before this analysis. has to be an array of Objects.
 * @property {Function} setGlobalLoading - Global loading. Useful if you are handling multiple analysis..
 * @property {Function} onManagerCreated - Callback when analysis manager is created.
 * @property {Function} onManagerDestroyed - Callback when analysis manager is destroyed.
 * @property {boolean} disabled - Disable the search bar.
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
  searchBarPlaceholder = null,
  extraTools = [],
  plannerQuestionSuffix = null,
  previousQuestions = [], // questions that the user has asked so far in the analysis
  setGlobalLoading = (...args) => {},
  onManagerCreated = (...args) => {},
  onManagerDestroyed = (...args) => {},
  disabled = false,
  initialConfig = {
    analysisManager: null,
  },
  setCurrentQuestion = (...args) => {},
}) => {
  const agentConfigContext = useContext(AgentConfigContext);
  const { devMode, apiEndpoint, token } = agentConfigContext.val;

  const getToolsEndpoint = setupBaseUrl({
    protocol: "http",
    path: "get_user_tools",
    apiEndpoint: apiEndpoint,
  });

  const [reRunningSteps, setRerunningSteps] = useState([]);
  const [activeNode, setActiveNodePrivate] = useState(null);
  const [dag, setDag] = useState(null);
  const [dagLinks, setDagLinks] = useState([]);

  // we use this to prevent multiple rerender/updates when a user edits the step inputs
  // we flush these pending updates to the actual analysis data when:
  // 1. the active node changes
  // 2. the user submits the step for re running
  const pendingStepUpdates = useRef({});

  const windowSize = useWindowSize();
  const collapsed = useMemo(() => {
    return windowSize[0] < breakpoints.lg;
  }, [windowSize[0] < breakpoints.lg]);

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

      setGlobalLoading(false);

      // if the current stage is null, just destroy this analysis
      if (!newAnalysisData.currentStage) {
        // analysisManager.destroy();
      }
    }
  }

  /**
   * @type {import("./analysisManager").AnalysisManager}
   */
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
        extraTools,
        plannerQuestionSuffix,
        previousQuestions,
        onNewData: onMainSocketMessage,
        onAbortError: (e) => {
          messageManager.error(e);
          setGlobalLoading(false);
        },
        onManagerDestroyed: onManagerDestroyed,
        createAnalysisRequestBody,
        mainSocket: null, // Add mainSocket property
      })
    );
  }, [analysisId, messageManager]);

  const analysisBusy = useSyncExternalStore(
    analysisManager.subscribeToAnalysisBusyChanges,
    analysisManager.getAnalysisBusy
  );

  const analysisData = useSyncExternalStore(
    analysisManager.subscribeToDataChanges,
    analysisManager.getAnalysisData
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
      setGlobalLoading(false);
    }
  }, [analysisData]);

  useEffect(() => {
    if (analysisManager.didInit) return;

    async function initialiseAnalysis() {
      try {
        const { analysisData = {} } = await analysisManager.init({
          question:
            createAnalysisRequestBody?.initialisation_details?.user_question,
          existingData:
            agentConfigContext?.val?.analysisDataCache?.[analysisId] || null,
          sqliteConn: agentConfigContext?.val?.sqliteConn,
        });

        const response = await fetch(getToolsEndpoint, {
          method: "POST",
          signal: AbortSignal.timeout(60000),
        });

        const tools = (await response.json())["tools"];
        setTools(tools);

        if (
          initiateAutoSubmit &&
          !analysisManager?.analysisData?.currentStage
        ) {
          handleSubmit(analysisManager?.analysisData?.user_question, {}, null);
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
        analysisManager.destroy();
      }
    }

    initialiseAnalysis();
  }, []);

  useEffect(() => {
    if (analysisManager) {
      onManagerCreated(analysisManager, analysisId, ctr.current);
    }
  }, [analysisManager]);

  const handleSubmit = useCallback(
    (query, stageInput = {}, submitStage = null) => {
      try {
        if (!query) throw new Error("Query is empty");

        setGlobalLoading(true);
        analysisManager.submit(query, { ...stageInput }, submitStage);
      } catch (e) {
        messageManager.error(e);
        console.log(e.stack);

        setGlobalLoading(false);

        // if the current stage is null, and there is an external search bar, just destroy this analysis
        if (submitStage === null && hasExternalSearchBar) {
          analysisManager.destroy();
        }
      }
    },
    [
      analysisManager,
      setGlobalLoading,
      messageManager,
      sqlOnly,
      hasExternalSearchBar,
    ]
  );

  const handleReRun = useCallback(
    async (stepId) => {
      if (!stepId || !dag || !analysisId || !activeNode || !analysisManager) {
        console.log(stepId, dag, analysisId, activeNode, analysisManager);
        messageManager.error("Invalid step id or analysis data");

        return;
      }

      try {
        // first flush any updates
        analysisManager.updateStepData(pendingStepUpdates.current);
        pendingStepUpdates.current = {};

        await analysisManager.reRun(
          stepId,
          agentConfigContext?.val?.sqliteConn
        );
      } catch (e) {
        messageManager.error(e);
        console.log(e.stack);
      }
    },
    [
      analysisId,
      JSON.stringify(activeNode),
      dag,
      analysisManager,
      agentConfigContext?.val?.sqliteConn,
      activeNode,
      messageManager,
    ]
  );

  const titleDiv = (
    <div className="flex flex-row flex-wrap gap-4 p-6 items-center lg:items-start">
      <h1 className="font-bold text-xl text-gray-700 dark:text-gray-200 basis-0 grow min-w-[50%]">
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
      ) ? null : (
        // <div className="basis-0 text-nowrap whitespace-nowrap">
        //   <AnalysisFeedback
        //     analysisSteps={analysisData?.gen_steps?.steps || []}
        //     analysisId={analysisId}
        //     user_question={analysisData?.user_question}
        //     apiEndpoint={apiEndpoint}
        //     token={token}
        //     keyName={keyName}
        //   />
        // </div>
        <div className="basis-0 text-nowrap whitespace-nowrap group cursor-pointer">
          <CircleStop
            className="w-6 h-6 text-rose-300 group-hover:text-rose-500 dark:text-rose-400 dark:group-hover:text-rose-600"
            onClick={() => {
              setGlobalLoading(false);

              analysisManager.destroy();
            }}
          ></CircleStop>
        </div>
      )}
    </div>
  );

  const setActiveNode = useCallback(
    (node) => {
      setActiveNodePrivate(node);
      analysisManager.setActiveStepId(node?.data?.id || null);
      if (Object.keys(pendingStepUpdates.current).length) {
        analysisManager.updateStepData(pendingStepUpdates.current);
        pendingStepUpdates.current = {};
      }
    },
    [setActiveNodePrivate, analysisManager]
  );

  const activeStep = useMemo(() => {
    if (!activeNode || !analysisData || !analysisData.gen_steps) return null;
    return analysisManager.getActiveStep();
  }, [activeNode, analysisData, analysisManager]);

  return (
    <ErrorBoundary>
      <div
        ref={ctr}
        id={analysisId}
        className={twMerge(
          "analysis-agent-container h-max min-h-20 relative grow outline-none focus:outline-none rounded-3xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
          independentAnalysisSearchRef
            ? "bg-gray-50 dark:bg-gray-900"
            : "max-w-full",
          rootClassNames
        )}
      >
        {/* if we don't have anlaysis data, and current stage is null, and we DO have a search ref */}
        {/* means tis is being externally initialised using analysis viewer and initateautosubmit is true */}
        {!analysisData ||
        (!analysisData.currentStage && hasExternalSearchBar) ? (
          <div className="transition-all w-full bg-gray-50 dark:bg-gray-900 rounded-3xl">
            {titleDiv}
            <AgentLoader
              message={
                sqlOnly
                  ? "Fetching data..."
                  : !analysisData
                    ? "Setting up..."
                    : "Thinking..."
              }
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
                    ev.target.value = "";
                  }}
                  placeholder={searchBarPlaceholder || "Ask a question"}
                  disabled={disabled || analysisBusy}
                  inputClassNames="w-full mx-auto shadow-custom hover:border-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <></>
            )}
            {analysisData.currentStage === "clarify" ? (
              <div className="transition-all w-full bg-gray-50 dark:bg-gray-900 rounded-3xl">
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
                <div className="analysis-results min-w-0 grow flex flex-col relative border-r dark:border-gray-600">
                  {titleDiv}
                  <ErrorBoundary>
                    {analysisData?.gen_steps?.steps.length ? (
                      <>
                        <div className="grow px-6 rounded-b-3xl lg:rounded-br-none w-full bg-gray-50 dark:bg-gray-900">
                          {activeStep && (
                            // if this is sqlonly, we will wait for tool run data to be updated before showing anything
                            // because in the normal case, the tool run data can be fetched from the servers
                            // but in sql only case, we only have a local copy
                            <StepResults
                              analysisId={analysisId}
                              activeNode={activeNode}
                              analysisData={analysisData}
                              step={activeStep}
                              apiEndpoint={apiEndpoint}
                              dag={dag}
                              setActiveNode={setActiveNode}
                              handleReRun={handleReRun}
                              reRunningSteps={reRunningSteps}
                              keyName={keyName}
                              token={token}
                              onCreateNewStep={async function ({
                                tool_name,
                                inputs,
                                analysis_id,
                                outputs_storage_keys,
                              }) {
                                await analysisManager.createNewStep({
                                  tool_name,
                                  inputs,
                                  analysis_id,
                                  outputs_storage_keys,
                                });
                              }}
                              updateStepData={(stepId, updates) => {
                                if (!analysisManager) return;
                                if (analysisBusy) return;

                                pendingStepUpdates.current = {
                                  ...pendingStepUpdates.current,
                                  [stepId]: Object.assign(
                                    {},
                                    pendingStepUpdates.current[stepId],
                                    updates
                                  ),
                                };
                              }}
                              tools={tools}
                              analysisBusy={analysisBusy}
                              handleDeleteSteps={async (stepIds) => {
                                try {
                                  await analysisManager.deleteSteps(stepIds);
                                } catch (e) {
                                  messageManager.error(e);
                                  console.log(e.stack);
                                }
                              }}
                              setCurrentQuestion={setCurrentQuestion}
                            ></StepResults>
                          )}
                        </div>
                      </>
                    ) : (
                      analysisBusy && (
                        <div className="bg-gray-50 dark:bg-gray-900 h-full flex items-center justify-center w-full rounded-3xl">
                          <AgentLoader
                            message={"Fetching data..."}
                            classNames={"m-0 h-40 bg-transparent"}
                          />
                        </div>
                      )
                    )}
                  </ErrorBoundary>
                </div>
                {analysisData?.gen_steps?.steps && (
                  <div className="border-b border-b-gray-300 dark:border-b-gray-600 sm:border-b-0 lg:border-b-none analysis-steps flex-initial rounded-t-3xl lg:rounded-r-3xl lg:rounded-tl-none bg-gray-50 dark:bg-gray-900">
                    <Collapse
                      rootClassNames="mb-0 bg-gray-50 dark:bg-gray-900 w-full rounded-t-3xl lg:rounded-r-3xl lg:rounded-tl-none lg:h-full"
                      title={
                        <div className="">
                          <span className="font-light lg:font-bold text-sm dark:text-gray-300">
                            Steps
                          </span>
                          {analysisData.currentStage === "gen_steps" &&
                          analysisBusy ? (
                            <SpinningLoader classNames="ml-2 w-3 h-3 text-gray-400 dark:text-gray-500"></SpinningLoader>
                          ) : (
                            ""
                          )}
                        </div>
                      }
                      headerClassNames="lg:hidden flex flex-row items-center pl-5 lg:pointer-events-none lg:cursor-default"
                      iconClassNames="lg:hidden"
                      collapsed={collapsed}
                      alwaysOpen={!collapsed}
                    >
                      <StepsDag
                        steps={analysisData?.gen_steps?.steps || []}
                        nodeSize={[40, 10]}
                        nodeGap={[30, 50]}
                        setActiveNode={setActiveNode}
                        skipAddStepNode={isTemp}
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
                            <p className="text-sm truncate m-0 dark:text-gray-300">
                              {trimStringToLength(
                                toolShortNames[node?.data?.step?.tool_name] ||
                                  tools[node?.data?.step?.tool_name]?.[
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
