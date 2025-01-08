import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnalysisAgent } from "../analysis/AnalysisAgent";
import { AnalysisTreeItem } from "./AnalysisTreeItem";
import { PlusIcon } from "lucide-react";
import { getQuestionType, sentenceCase } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import { Sidebar, MessageManagerContext, breakpoints } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { AnalysisTreeViewerLinks } from "./AnalysisTreeViewerLinks";
import { AgentConfigContext } from "../../context/AgentContext";
import { DraggableInput } from "./DraggableInput";
import { getMostVisibleAnalysis } from "../agentUtils";
import setupBaseUrl from "../../utils/setupBaseUrl";

/**
 *
 * Analysis tree viewer component
 * @param {Object} props
 * @param {ReturnType<import('./analysisTreeManager').AnalysisTreeManager>} props.analysisTreeManager
 *
 */
export function AnalysisTreeViewer({
  analysisTreeManager,
  keyName,
  isTemp = false,
  forceSqlOnly = false,
  metadata = null,
  // array of strings
  // each string is a question
  predefinedQuestions = [],
  autoScroll = true,
  sideBarClasses = "",
  searchBarClasses = "",
  searchBarDraggable = true,
  defaultSidebarOpen = false,
  showToggle = true,
  onTreeChange = () => {},
}) {
  const messageManager = useContext(MessageManagerContext);

  const analysisDomRefs = useRef({});

  const [sqlOnly, setSqlOnly] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");

  const { token, apiEndpoint } = useContext(AgentConfigContext).val;

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);

  const analysisTree = useSyncExternalStore(
    analysisTreeManager.subscribeToDataChanges,
    analysisTreeManager.getTree
  );

  // reverse chronological sorted tree
  // grouped into today, yesterday, previous week, past month, and then earlier
  // based on the timestamp property of root analysis
  const analysisIdsGrouped = useMemo(() => {
    try {
      const sorted = Object.keys(analysisTree).sort((a, b) => {
        return (
          (analysisTree?.[b]?.root?.timestamp || 0) -
          (analysisTree?.[a]?.root?.timestamp || 0)
        );
      });

      const grouped = {
        Today: [],
        Yesterday: [],
        "Past week": [],
        "Past month": [],
        Earlier: [],
      };

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const week = new Date();
      week.setDate(week.getDate() - 7);
      const month = new Date();
      month.setMonth(month.getMonth() - 1);

      sorted.forEach((id) => {
        const root = analysisTree[id].root;
        const timestamp = root.timestamp;
        const date = new Date(timestamp);

        if (date.toDateString() === today.toDateString()) {
          grouped["Today"].push(id);
        } else if (date.toDateString() === yesterday.toDateString()) {
          grouped["Yesterday"].push(id);
        } else if (date >= week) {
          grouped["Past week"].push(id);
        } else if (date >= month) {
          grouped["Past month"].push(id);
        } else {
          grouped["Earlier"].push(id);
        }
      });

      // sort within each group
      Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => {
          return (
            (analysisTree?.[b]?.root?.timestamp || 0) -
            (analysisTree?.[a]?.root?.timestamp || 0)
          );
        });
      });

      return grouped;
    } catch (e) {
      console.warn("Error in sorting keys. Returning as is.");
      return {
        Earlier: Object.keys(analysisTree),
      };
    }
  }, [analysisTree]);

  const allAnalyses = useSyncExternalStore(
    analysisTreeManager.subscribeToDataChanges,
    analysisTreeManager.getAll
  );

  const activeAnalysisId = useSyncExternalStore(
    analysisTreeManager.subscribeToActiveAnalysisIdChanges,
    analysisTreeManager.getActiveAnalysisId
  );

  const activeRootAnalysisId = useSyncExternalStore(
    analysisTreeManager.subscribeToActiveAnalysisIdChanges,
    analysisTreeManager.getActiveRootAnalysisId
  );

  useEffect(() => {
    analysisDomRefs.current = {};
  }, [analysisTreeManager]);

  useEffect(() => {
    // don't store isTemp histories because currently the keyName of temp dbs is
    // just the first keyName
    // this will cause an overwrite of the history
    if (isTemp) return;
    onTreeChange(keyName, analysisTree);
  }, [onTreeChange, keyName, analysisTree, isTemp]);

  const handleSubmit = useCallback(
    async function (
      question,
      rootAnalysisId = null,
      isRoot = false,
      directParentId = null
    ) {
      try {
        if (!analysisTreeManager)
          throw new Error("Analysis tree manager not found");

        const allAnalyses = analysisTreeManager.getAll();

        let questionType = "analysis";

        if (allAnalyses.length > 0) {
          // find question type if some analyses exist
          questionType = await getQuestionType(
            token,
            keyName,
            apiEndpoint,
            question
          );
        }

        if (questionType.question_type === "chart") {
          const mostVisibleElement = getMostVisibleAnalysis(
            Object.keys(allAnalyses)
          );
          const visibleAnalysis = allAnalyses[mostVisibleElement.id];

          if (!visibleAnalysis?.analysisManager?.getAnalysisData?.()) {
            messageManager.error("No visible analysis found to edit chart");
            return;
          }
          const activeStep = visibleAnalysis.analysisManager.getActiveStep();

          const stepOutputs = Object.values(activeStep.parsedOutputs);
          if (stepOutputs.length === 0) {
            messageManager.error("No outputs found in the visible analysis");
            return;
          }

          const stepOutput = stepOutputs[0];

          if (!stepOutput?.chartManager?.config) {
            messageManager.error("No chart found in the visible analysis");
            return;
          }

          try {
            await stepOutput.chartManager.editChart(question, chartEditUrl, {
              onError: (e) => {
                messageManager.error(e.message);
                console.error(e);
              },
            });
          } catch (e) {
            messageManager.error(e.message);
            console.error(e);
          }

          return;
        }

        const newId = "analysis-" + crypto.randomUUID();

        const { newAnalysis } = await analysisTreeManager.submit({
          question,
          analysisId: newId,
          rootAnalysisId: isRoot ? newId : rootAnalysisId,
          keyName,
          isRoot,
          directParentId,
          sqlOnly: forceSqlOnly || sqlOnly,
          isTemp,
        });

        // if we have an active root analysis, we're appending to that
        // otherwise we're starting a new root analysis
        // if no root analysis id, means this is meant to be a new root analysis
        if (!rootAnalysisId) {
          analysisTreeManager.setActiveRootAnalysisId(newAnalysis.analysisId);
        }

        analysisTreeManager.setActiveAnalysisId(newAnalysis.analysisId);
        analysisTreeManager.setActiveRootAnalysisId(newAnalysis.rootAnalysisId);
      } catch (e) {
        messageManager.error("Failed to create analysis");
        console.log(e.stack);
      }
    },
    [analysisTreeManager, forceSqlOnly, sqlOnly, isTemp, keyName, metadata]
  );

  function scrollTo(id) {
    if (!analysisDomRefs.current?.[id]?.ctr) return;

    analysisDomRefs.current[id].ctr.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  const activeAnalysisList = useMemo(() => {
    return (
      (activeRootAnalysisId &&
        analysisTree?.[activeRootAnalysisId]?.analysisList &&
        analysisTree[activeRootAnalysisId].analysisList) ||
      null
    );
  }, [analysisTree, activeRootAnalysisId]);

  // w-0
  return (
    <ErrorBoundary>
      <div className="relative h-full">
        {/* top and bottom fades if we are on small screens and if we have some analyses going */}
        {activeAnalysisId && activeRootAnalysisId && (
          <div className="lg:hidden absolute bottom-0 left-0 w-full h-[5%] pointer-events-none bg-gradient-to-b from-transparent to-gray-300 z-10"></div>
        )}
        <div className="flex flex-row w-full h-full max-w-full text-gray-600 bg-white dark:bg-gray-900 analysis-tree-viewer">
          <div className="absolute left-0 top-0 z-[20] lg:sticky h-full">
            <Sidebar
              location="left"
              open={sidebarOpen}
              onChange={(open) => {
                setSidebarOpen(open);
              }}
              title={
                <span className="font-bold">
                  History{" "}
                  <span
                    title="Clear history"
                    className="text-xs font-light underline text-gray-400 dark:text-gray-500 inline hover:text-blue-500 dark:hover:text-blue-500 cursor-pointer"
                    onClick={() => {
                      analysisTreeManager.reset();
                    }}
                  >
                    Clear
                  </span>
                </span>
              }
              rootClassNames={twMerge(
                "transition-all z-20 h-[calc(100%-1rem)] rounded-md rounded-l-none lg:rounded-none lg:rounded-tr-md lg:rounded-br-md bg-gray-100 dark:bg-gray-800 border-r sticky top-0 lg:relative",
                sideBarClasses
              )}
              iconClassNames={`${sidebarOpen ? "" : "text-white dark:text-gray-500 bg-secondary-highlight-2"}`}
              openClassNames={"border-gray-300 dark:border-gray-700 shadow-md"}
              closedClassNames={"border-transparent bg-transparent shadow-none"}
              contentClassNames={
                "w-72 p-4 rounded-tl-lg relative sm:block min-h-96 h-full"
              }
            >
              <div className="relative flex flex-col text-sm history-list">
                <AnalysisTreeViewerLinks
                  analyses={allAnalyses}
                  activeAnalysisId={
                    allAnalyses?.[activeAnalysisId] ? activeAnalysisId : null
                  }
                />
                {!activeRootAnalysisId ? (
                  <div className="py-3 ">
                    <AnalysisTreeItem
                      isDummy={true}
                      setActiveRootAnalysisId={
                        analysisTreeManager.setActiveRootAnalysisId
                      }
                      setActiveAnalysisId={
                        analysisTreeManager.setActiveAnalysisId
                      }
                      isActive={!activeRootAnalysisId}
                    />
                  </div>
                ) : (
                  <div className="sticky w-full top-0 py-3 bg-gray-100 dark:bg-gray-800">
                    <div
                      data-enabled={true}
                      className={twMerge(
                        "flex items-center cursor-pointer z-20 relative",
                        "bg-blue-500 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-500 text-white dark:text-white p-2 shadow-md border border-blue-500 dark:border-blue-500"
                      )}
                      onClick={() => {
                        // start a new root analysis
                        analysisTreeManager.setActiveRootAnalysisId(null);
                        analysisTreeManager.setActiveAnalysisId(null);

                        // on ipad/phone, close sidebar when new button is clicked
                        if (window.innerWidth < breakpoints.lg)
                          setSidebarOpen(false);
                      }}
                    >
                      Start new thread{" "}
                      <PlusIcon className="inline w-4 h-4 ml-2" />
                    </div>
                  </div>
                )}
                {Object.keys(analysisIdsGrouped).map((groupName) => {
                  const analysesInGroup = analysisIdsGrouped[groupName];
                  if (!analysesInGroup.length) return null;

                  return (
                    <div key={groupName}>
                      <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500 mt-4 mb-2">
                        {groupName}
                      </h3>
                      {analysesInGroup.map((rootAnalysisId, i) => {
                        const root = analysisTree[rootAnalysisId].root;
                        const analysisChildList =
                          analysisTree?.[rootAnalysisId]?.analysisList || [];

                        return (
                          <div key={root.analysisId}>
                            {analysisChildList.map((tree) => {
                              return (
                                <AnalysisTreeItem
                                  key={tree.analysisId}
                                  analysis={tree}
                                  isActive={
                                    activeAnalysisId === tree.analysisId
                                  }
                                  setActiveRootAnalysisId={
                                    analysisTreeManager.setActiveRootAnalysisId
                                  }
                                  setActiveAnalysisId={
                                    analysisTreeManager.setActiveAnalysisId
                                  }
                                  onClick={() => {
                                    if (autoScroll) {
                                      scrollTo(tree.analysisId);
                                    }

                                    if (window.innerWidth < breakpoints.lg)
                                      setSidebarOpen(false);
                                  }}
                                  extraClasses={twMerge(
                                    // activeAnalysisId === null ? "" : "",
                                    tree.isRoot ? "" : "ml-4 border-l-2"
                                  )}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Sidebar>
          </div>
          <div
            className={twMerge(
              "absolute left-0 top-0 h-full w-full overlay lg:hidden bg-gray-800 dark:bg-gray-900 z-[11] transition-all",
              sidebarOpen ? "opacity-50 block" : "opacity-0 pointer-events-none"
            )}
            onClick={() => {
              setSidebarOpen(false);
            }}
          ></div>
          <div
            className={twMerge(
              "relative w-full h-full min-w-0 p-2 pt-10 overflow-auto rounded-tr-lg sm:pt-0 grow lg:p-4",
              // if there are no active analysis, we will make this a flex box so that the "quickstart" section grows
              // and pushes the search bar down
              activeAnalysisList && activeAnalysisList.length
                ? ""
                : "flex flex-col"
            )}
          >
            {activeAnalysisList &&
              activeAnalysisList.map((analysis) => {
                const rootAnalysisId = analysis.rootAnalysisId;
                const analysisChildList =
                  analysisTree?.[rootAnalysisId]?.analysisList || [];
                return (
                  <AnalysisAgent
                    key={analysis.analysisId}
                    metadata={metadata}
                    rootClassNames={
                      "w-full mb-4 [&_.analysis-content]:min-h-96 shadow-md analysis-" +
                      analysis.analysisId
                    }
                    analysisId={analysis.analysisId}
                    createAnalysisRequestBody={
                      analysis.createAnalysisRequestBody
                    }
                    initiateAutoSubmit={true}
                    hasExternalSearchBar={true}
                    // we store this at the time of creation of the analysis
                    // and don't change it for this specific analysis afterwards.
                    sqlOnly={analysis.sqlOnly}
                    isTemp={analysis.isTemp}
                    keyName={analysis.keyName}
                    previousQuestions={analysisChildList
                      .map((i) => ({
                        ...i,
                      }))
                      .filter((d) => {
                        try {
                          // if this is the current analysis, send it
                          // this is to prevent regression on the backend. we were sending all (including this one) earlier.
                          if (d.analysisId === analysis.analysisId) return true;

                          // only use this as a previous question if gen_steps is true
                          // or if this is this question itself
                          // first get the data
                          const analysisData =
                            d?.analysisManager?.getAnalysisData?.();

                          // only pass this if we generated steps successfully
                          if (
                            analysisData &&
                            analysisData?.gen_steps &&
                            analysisData?.gen_steps?.success
                          ) {
                            return true;
                          } else {
                            return false;
                          }
                        } catch (e) {
                          // return true to be safe
                          return true;
                        }
                      })}
                    onManagerCreated={(analysisManager, id, ctr) => {
                      analysisDomRefs.current[id] = {
                        ctr,
                        analysisManager,
                        id,
                      };
                      if (autoScroll) {
                        // scroll to ctr
                        scrollTo(id);
                      }

                      analysisTreeManager.updateAnalysis({
                        analysisId: analysis.analysisId,
                        isRoot: analysis.isRoot,
                        updateObj: {
                          analysisManager: analysisManager,
                        },
                      });
                    }}
                    onManagerDestroyed={(analysisManager, id) => {
                      // remove the analysis from the analysisTree
                      analysisTreeManager.removeAnalysis({
                        analysisId: analysis.analysisId,
                        isRoot: analysis.isRoot,
                        rootAnalysisId: analysis.rootAnalysisId,
                      });

                      analysisTreeManager.setActiveAnalysisId(null);
                      if (activeRootAnalysisId === id) {
                        analysisTreeManager.setActiveRootAnalysisId(null);
                      }
                    }}
                    initialConfig={{
                      analysisManager: analysis.analysisManager || null,
                    }}
                    setCurrentQuestion={setCurrentQuestion}
                  />
                );
              })}

            {!activeAnalysisId && (
              <div className="grow flex flex-col place-content-center m-auto max-w-full relative z-[1]">
                <div className="text-center text-gray-400 dark:text-gray-500 rounded-md">
                  <p className="block mb-4 text-sm font-bold cursor-default">
                    Quickstart
                  </p>

                  <ul className="font-light text-gray-500 dark:text-gray-400">
                    {predefinedQuestions.map((question, i) => (
                      <li className="" key={i}>
                        <button
                          className={twMerge(
                            "cursor-pointer text-sm p-2 m-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm",
                            "hover:bg-gray-50 dark:hover:bg-gray-800 hover:border"
                          )}
                          onClick={(ev) => {
                            handleSubmit(
                              sentenceCase(question),
                              activeRootAnalysisId,
                              !activeRootAnalysisId,
                              activeAnalysisId
                            );
                          }}
                        >
                          {sentenceCase(question)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className={searchBarDraggable ? "" : "sticky bottom-1"}>
              <DraggableInput
                searchBarClasses={searchBarClasses}
                searchBarDraggable={searchBarDraggable}
                handleSubmit={handleSubmit}
                activeRootAnalysisId={activeRootAnalysisId}
                activeAnalysisId={activeAnalysisId}
                showToggle={showToggle}
                forceSqlOnly={forceSqlOnly}
                setSqlOnly={setSqlOnly}
                sqlOnly={sqlOnly}
                question={currentQuestion}
                onNewConversationTextClick={() => {
                  // start a new root analysis
                  analysisTreeManager.setActiveRootAnalysisId(null);
                  analysisTreeManager.setActiveAnalysisId(null);

                  // on ipad/phone, close sidebar when new button is clicked
                  if (window.innerWidth < breakpoints.lg) setSidebarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
