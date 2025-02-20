import React, {
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import AgentLoader from "../../common/AgentLoader";
import { sentenceCase } from "@utils/utils";
import Clarify from "./Clarify";
import type { AnalysisManager } from "./analysisManager";
import { Input, MessageManagerContext } from "@ui-components";
import { twMerge } from "tailwind-merge";
import { EmbedContext } from "../../context/EmbedContext";
import ErrorBoundary from "../../common/ErrorBoundary";
import { CircleStop } from "lucide-react";
import createAnalysisManager from "./analysisManager";
import type {
  AnalysisTreeManager,
  CreateAnalysisRequestBody,
} from "../analysis-tree-viewer/analysisTreeManager";
import { AnalysisResults } from "./step-results/AnalysisResults";

interface Props {
  analysisId: string;

  dbName: string;

  /**
   * Root of this analysis. Is the same as analysisId if this is the root analysis.
   */
  rootAnalysisId: string;
  /**
   * Whether this is a temp analysis. Used in CSVs.
   */
  isTemp?: boolean;
  /**
   * Metadata for this database.
   */
  metadata?: ColumnMetadata[] | null;
  /**
   * Whether this is a sql only analysis.
   */
  sqlOnly?: boolean;
  /**
   * Root class names.
   */
  rootClassNames?: string;
  /**
   * Object that will be sent as the body of the fetch request to create_analysis.
   */
  createAnalysisRequestBody?: Partial<CreateAnalysisRequestBody>;
  /**
   * Which tab (table or chart) to open.
   */
  activeTab?: "table" | "chart";
  /**
   * Callback when active tab changes.
   */
  setActiveTab?: (tab: "table" | "chart") => void;
  /**
   * Whether to initiate auto submit.
   */
  initiateAutoSubmit?: boolean;
  /**
   * Whether this is being controlled by an external search bar.
   */
  hasExternalSearchBar?: boolean;
  /**
   * Placeholder for the internal search bar (useful only if hasExternalSearchBar is false).
   */
  searchBarPlaceholder?: string | null;
  /**
   * if this analysis uses any extra tools. Used in the add tool UI to create a test analysis.
   */
  extraTools?: Array<{
    code: string;
    tool_name: string;
    function_name: string;
    tool_description: string;
    input_metadata: object;
    output_metadata: object;
  }>;
  /**
   * suffix for the planner model's question. Used in the add tool UI to create a test analysis.
   */
  plannerQuestionSuffix?: string | null;
  /**
   * Details about parent questions that the user has asked so far before this analysis. Has to be an array of Objects.
   */
  previousContextCreator?: () => PreviousContext;
  /**
   * Global loading. Useful if you are handling multiple analysis..
   */
  setGlobalLoading?: (loading: boolean) => void;
  /**
   * Callback when analysis manager is created.
   */
  onManagerCreated?: (
    analysisManager: AnalysisManager,
    analysisId: string,
    ctr: HTMLDivElement | null
  ) => void;
  /**
   * Callback when analysis manager is destroyed.
   */
  onManagerDestroyed?: (analysisId: string, ctr: HTMLDivElement | null) => void;
  /**
   * Disable the search bar.
   */
  disabled?: boolean;
  /**
   * Initial config if any.
   */
  initialConfig?: {
    analysisManager?: AnalysisManager | null;
    analysisTreeManager?: AnalysisTreeManager | null;
  };
  submitFollowOn?: (followOnQuestion: string) => void;
  /**
   * Callback when container height changes
   */
  onHeightChange?: (height: number) => void;
}

/**
 * Analysis Agent. Handles a single analysis. Chonker.
 * */
/**
 * AnalysisAgent is a React component that manages the lifecycle and user interactions
 * for a single analysis session. It integrates with an AnalysisManager to handle
 * data processing and updates. The component includes support for various stages
 * of analysis, such as clarification and step generation, and displays relevant
 * UI elements for each stage. It also handles external configurations and contexts
 * to provide a dynamic analysis environment.
 *
 * Props:
 * - analysisId: string - Unique identifier for the analysis.
 * - rootAnalysisId: string - Root identifier for a series of analyses.
 * - dbName: string - Key name used for identification.
 * - isTemp: boolean - Flag to indicate if the analysis is temporary.
 * - metadata: ColumnMetadata[] | null - Metadata associated with the analysis.
 * - sqlOnly: boolean - Indicates if the analysis is SQL-only.
 * - rootClassNames: string - Additional class names for styling.
 * - createAnalysisRequestBody: Partial<CreateAnalysisRequestBody> - Initial request
 *   body for creating the analysis.
 * - initiateAutoSubmit: boolean - Flag to automatically submit initial analysis.
 * - hasExternalSearchBar: boolean - Indicates if an external search bar is used.
 * - searchBarPlaceholder: string | null - Placeholder text for the search bar.
 * - extraTools: Array - Additional tools available for the analysis.
 * - plannerQuestionSuffix: string | null - Suffix for planner questions.
 * - previousContextCreator: PreviousContext - Context from previous analyses.
 * - setGlobalLoading: Function - Callback to set global loading state.
 * - onManagerCreated: Function - Callback when AnalysisManager is created.
 * - onManagerDestroyed: Function - Callback when AnalysisManager is destroyed.
 * - disabled: boolean - Flag to disable the component.
 * - initialConfig: Object - Initial configuration for the analysis.
 * - setCurrentQuestion: Function - Callback to set the current question.
 * - onHeightChange: Function - Callback for height changes of the component.
 */
export const AnalysisAgent = ({
  analysisId,
  rootAnalysisId,
  dbName,
  isTemp = false,
  metadata = null,
  sqlOnly = false,
  rootClassNames = "",
  createAnalysisRequestBody = {},
  initiateAutoSubmit = false,
  hasExternalSearchBar = false,
  searchBarPlaceholder = null,
  extraTools = [],
  plannerQuestionSuffix = null,
  previousContextCreator = () => [],
  setGlobalLoading = (...args) => {},
  onManagerCreated = (...args) => {},
  onManagerDestroyed = (...args) => {},
  disabled = false,
  initialConfig = {
    analysisManager: null,
    analysisTreeManager: null,
  },
  submitFollowOn = (...args) => {},
  onHeightChange = (...args) => {},
}: Props) => {
  const { apiEndpoint, token, sqliteConn, updateConfig, analysisDataCache } =
    useContext(EmbedContext);

  // in case this isn't called from analysis tree viewer (which has a central singular search bar)
  // we will have an independent search bar for each analysis as well
  const independentAnalysisSearchRef = useRef<HTMLInputElement>(null);

  const ctr = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Setup resize observer for container div
  useEffect(() => {
    if (!ctr.current || !onHeightChange) return;

    observerRef.current?.disconnect();

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        onHeightChange(entry.contentRect.height);
      });
    });

    observer.observe(ctr.current);
    observerRef.current = observer;

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [onHeightChange]);

  const messageManager = useContext(MessageManagerContext);

  const analysisManager = useMemo<AnalysisManager>(() => {
    return (
      initialConfig.analysisManager ||
      createAnalysisManager({
        analysisId,
        rootAnalysisId,
        apiEndpoint,
        token,
        dbName,
        metadata,
        isTemp,
        sqlOnly,
        extraTools,
        plannerQuestionSuffix,
        previousContextCreator,
        onAbortError: (e) => {
          messageManager.error(e);
          setGlobalLoading(false);
        },
        onManagerDestroyed: () => onManagerDestroyed(analysisId, ctr.current),
        createAnalysisRequestBody,
      })
    );
  }, [analysisId, messageManager]);

  const analysisBusy = useSyncExternalStore(
    analysisManager.subscribeToAnalysisBusyChanges,
    analysisManager.getAnalysisBusy
  );

  const analysis = useSyncExternalStore(
    analysisManager.subscribeToDataChanges,
    analysisManager.getAnalysis
  );

  useEffect(() => {
    if (
      initiateAutoSubmit &&
      analysis?.data?.initial_question &&
      !analysis?.data?.clarification_questions
    ) {
      handleSubmit(analysis?.data?.initial_question, {}, null);
    }

    // if we got clarification question, and they were empty, and haven't submitted already to get an output, submit the next stage
    // if this was a clarify request, and the clarifier just returns empty array
    // in the clarification_questions, submit the next stage
    if (
      analysis?.data?.clarification_questions &&
      analysis?.data?.clarification_questions.length === 0 &&
      !analysis?.data?.parsedOutput &&
      !analysis?.data?.error
    ) {
      handleSubmit(analysis?.data?.initial_question, {
        clarification_questions: [],
      });
    }

    // update context
    updateConfig({
      analysisDataCache: {
        ...analysisDataCache,
        [analysisId]: analysis,
      },
    });

    // if stage is done, also set busy to false
    setGlobalLoading(false);
  }, [analysis]);

  useEffect(() => {
    if (analysisManager.didInit) return;

    async function initialiseAnalysis() {
      try {
        await analysisManager.init({
          question:
            createAnalysisRequestBody?.initialisation_details?.user_question,
          existingData: analysisDataCache?.[analysisId] || null,
          sqliteConn,
        });

        if (analysisManager.wasNewAnalysisCreated) {
          // also have to set analysisContext in this case
          updateConfig({
            analysisDataCache: {
              ...analysisDataCache,
              [analysisId]: analysis,
            },
          });
        }
      } catch (e: any) {
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

  const handleSubmit = useCallback<{
    (
      query?: string,
      stageInput?: Record<string, any>,
      submitStage?: string | null
    ): void;
  }>(
    (query?: string, stageInput = {}, submitStage = null) => {
      try {
        if (!query) throw new Error("Query is empty");

        setGlobalLoading(true);
        analysisManager.submit(query, { ...stageInput });
      } catch (e: any) {
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
    async (stepId: string) => {
      if (!stepId || !analysisId || !analysisManager) {
        console.log(stepId, analysisId, analysisManager);
        messageManager.error("Invalid step id or analysis data");

        return;
      }

      try {
        await analysisManager.reRun(stepId, sqliteConn);
      } catch (e: any) {
        messageManager.error(e);
        console.log(e.stack);
      }
    },
    [analysisId, analysisManager, sqliteConn, messageManager]
  );

  const titleDiv = (
    <>
      <div className="flex flex-row flex-wrap items-center gap-4 p-6 transition-all duration-200 lg:items-start">
        <h1 className="font-bold text-xl text-gray-700 dark:text-gray-200 basis-0 grow min-w-[50%]">
          {sentenceCase(
            analysis?.user_question ||
              createAnalysisRequestBody.user_question ||
              ""
          )}
        </h1>
        {!analysisBusy &&
        analysis &&
        !(
          !analysis ||
          (!analysis?.data?.clarification_questions && hasExternalSearchBar)
        ) ? null : (
          <div
            className="cursor-pointer basis-0 text-nowrap whitespace-nowrap group"
            onClick={() => {
              console.log("clicked");
              setGlobalLoading(false);

              analysisManager.destroy();
            }}
          >
            <CircleStop className="w-6 h-6 text-rose-300 group-hover:text-rose-500 dark:text-rose-400 dark:group-hover:text-rose-600"></CircleStop>
          </div>
        )}
      </div>
    </>
  );

  if (analysisBusy) {
    return (
      <div className="flex flex-col w-full h-full bg-gray-50 dark:bg-gray-900 rounded-3xl max-h-96 border dark:border-gray-200">
        {titleDiv}
        <AgentLoader
          message={
            !analysis?.data?.clarification_questions
              ? "Thinking about whether I need to clarify the question..."
              : "Fetching data..."
          }
          classNames={"m-0 h-40 bg-transparent"}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        ref={ctr}
        id={analysisId}
        className={twMerge(
          "analysis-agent-container h-max min-h-20 relative grow outline-none focus:outline-none rounded-3xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden",
          independentAnalysisSearchRef
            ? "bg-gray-50 dark:bg-gray-900"
            : "max-w-full",
          rootClassNames
        )}
      >
        <>
          {/* if we don't have external search bar (like in analysistreeviewer), show a search bar of it's own here */}
          {!hasExternalSearchBar && !analysis?.data?.clarification_questions ? (
            <div className="relative w-10/12 mx-auto top-6">
              <Input
                ref={independentAnalysisSearchRef}
                onPressEnter={(ev: any) => {
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

          {/* if we have clarifications, but no output */}
          {analysis?.data?.clarification_questions &&
          !analysis?.data?.output ? (
            <div className="w-full transition-all bg-gray-50 dark:bg-gray-900 rounded-3xl">
              {titleDiv}
              <Clarify
                questions={analysis?.data?.clarification_questions || []}
                handleSubmit={(stageInput: Object, submitStage: string) => {
                  handleSubmit(
                    analysis?.user_question,
                    stageInput,
                    submitStage
                  );
                }}
                globalLoading={analysisBusy}
              />
            </div>
          ) : (
            <></>
          )}

          {/* if we have outputs */}
          {analysis?.data?.output && analysis?.data?.parsedOutput && (
            <div className="flex flex-col-reverse w-full h-full analysis-content lg:flex-row">
              <div className="relative flex flex-col min-w-0 analysis-results grow dark:border-gray-600">
                {titleDiv}
                <ErrorBoundary>
                  {analysis?.data?.parsedOutput && (
                    <AnalysisResults
                      dbName={dbName}
                      analysis={analysis}
                      analysisBusy={analysisBusy}
                      handleReRun={(...args: any[]) => {}}
                      analysisTreeManager={initialConfig?.analysisTreeManager}
                      submitFollowOn={(followOnQuestion: string) => {
                        console.log("clicked follow on", followOnQuestion);
                        submitFollowOn(followOnQuestion);
                      }}
                    />
                  )}
                </ErrorBoundary>
              </div>
            </div>
          )}
        </>
        {/* )} */}
      </div>
    </ErrorBoundary>
  );
};
