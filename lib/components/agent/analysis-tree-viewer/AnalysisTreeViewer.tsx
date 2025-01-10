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
import { getQuestionType, raf, sentenceCase } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import { Sidebar, MessageManagerContext, breakpoints } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { AnalysisTreeViewerLinks } from "./AnalysisTreeViewerLinks";
import { AgentConfigContext } from "../../context/AgentContext";
import { DraggableInput } from "./DraggableInput";
import { getMostVisibleAnalysis } from "../agentUtils";
import setupBaseUrl from "../../utils/setupBaseUrl";
import type { AnalysisTreeManager, AnalysisTree } from "./analysisTreeManager";
import { AnalysisManager } from "../analysis/analysisManager";
import debounce from "lodash.debounce";

type GroupClass =
  | "Today"
  | "Yesterday"
  | "Past week"
  | "Past month"
  | "Earlier";

type AnalysisGrouped = {
  [K in GroupClass]: string[];
};

/**
 *
 * Analysis tree viewer component
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
}: {
  analysisTreeManager: AnalysisTreeManager;
  keyName: string;
  isTemp?: boolean;
  forceSqlOnly?: boolean;
  metadata?: any;
  predefinedQuestions?: string[];
  autoScroll?: boolean;
  sideBarClasses?: string;
  searchBarClasses?: string;
  searchBarDraggable?: boolean;
  defaultSidebarOpen?: boolean;
  showToggle?: boolean;
  onTreeChange?: (keyName: string, analysisTree: AnalysisTree) => void;
}) {
  const messageManager = useContext(MessageManagerContext);

  const analysisDomRefs = useRef<{
    [key: string]: {
      ctr: HTMLElement | null;
      analysisManager?: AnalysisManager;
      id?: string;
    };
  }>({});

  const [loading, setLoading] = useState(false);
  const [sqlOnly, setSqlOnly] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");

  const { token, apiEndpoint } = useContext(AgentConfigContext).val;

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(defaultSidebarOpen);

  const analysisTree = useSyncExternalStore(
    analysisTreeManager.subscribeToDataChanges,
    analysisTreeManager.getTree
  );

  const nestedTree = useMemo(
    () => analysisTreeManager.getNestedTree(),
    [analysisTree]
  );

  // reverse chronological sorted tree
  // grouped into today, yesterday, previous week, past month, and then earlier
  // based on the timestamp property of root analysis
  const analysisIdsGrouped = useMemo(() => {
    try {
      const sorted = Object.keys(nestedTree).sort((a, b) => {
        return (
          (nestedTree?.[b]?.timestamp || 0) - (nestedTree?.[a]?.timestamp || 0)
        );
      });

      const grouped: AnalysisGrouped = {
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
        Earlier: Object.keys(nestedTree),
      };
    }
  }, [nestedTree]);

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
    setLoading(false);
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
      question: string,
      rootAnalysisId: string | null = null,
      isRoot = false,
      directParentId = null
    ) {
      try {
        setLoading(true);
        if (!analysisTreeManager)
          throw new Error("Analysis tree manager not found");

        const allAnalyses = analysisTreeManager.getAll();

        let questionType = "analysis";

        if (Object.keys(allAnalyses).length > 0) {
          // find question type if some analyses exist
          questionType = await getQuestionType(
            token,
            keyName,
            apiEndpoint,
            question
          );
        }

        if (questionType === "chart") {
          const mostVisibleElement = getMostVisibleAnalysis(
            Object.keys(allAnalyses)
          );
          const visibleAnalysis = allAnalyses[mostVisibleElement.id];

          if (!visibleAnalysis?.analysisManager?.getAnalysisData?.()) {
            messageManager.error("No visible analysis found to edit chart");
            return;
          }
          const activeStep = visibleAnalysis.analysisManager.getActiveStep();

          if (!activeStep?.parsedOutputs) return;

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
          } catch (e: any) {
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

        // once state has flushed, scroll to the new analysis
        raf(() => {
          scrollTo(newId);
        });
      } catch (e: any) {
        messageManager.error("Failed to create analysis");
        console.log(e.stack);
      } finally {
        if (searchRef.current) {
          searchRef.current.value = "";
        }
        setLoading(false);
      }
    },
    [analysisTreeManager, forceSqlOnly, sqlOnly, isTemp, keyName, metadata]
  );

  function scrollTo(id: string, behavior: ScrollBehavior = "smooth") {
    if (!analysisDomRefs.current?.[id]?.ctr) return;

    analysisDomRefs.current[id].ctr.scrollIntoView({
      behavior: behavior,
      block: "start",
    });
  }

  const searchRef = useRef<HTMLInputElement>(null);

  const disableScrollEvent = useRef<boolean>(false);

  const setMostVisibleAnalysisAsActive = useCallback(() => {
    const allAnalyses = analysisTreeManager.getAll();
    const { id: visibleAnalysisId, element } = getMostVisibleAnalysis(
      Object.keys(allAnalyses)
    );
    if (!visibleAnalysisId) return;
    if (visibleAnalysisId === activeAnalysisId) return;
    const rootAnalysisId = allAnalyses[visibleAnalysisId].rootAnalysisId;
    analysisTreeManager.setActiveAnalysisId(visibleAnalysisId);
    analysisTreeManager.setActiveRootAnalysisId(rootAnalysisId);
  }, []);

  useEffect(() => {
    // on first render, refresh the analysisDomRefs
    // the tree and managers remains in state, but the dom refs get removed once we leave the component
    // so we need to refresh them here
    Object.values(allAnalyses).forEach((analysis) => {
      analysisDomRefs.current[analysis.analysisId] = {
        id: analysis.analysisId,
        ctr: document.getElementById(analysis.analysisId),
        analysisManager: analysis.analysisManager,
      };
    });
  }, [allAnalyses]);

  // on first render, scroll to the active analysis
  useEffect(() => {
    disableScrollEvent.current = true;
    setTimeout(() => {
      if (activeAnalysisId) {
        if (autoScroll && analysisDomRefs.current[activeAnalysisId]) {
          scrollTo(activeAnalysisId);
        }
      }
      disableScrollEvent.current = false;
    }, 500);
  }, []);

  console.log(activeAnalysisId);

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
              onChange={(open: boolean) => {
                setSidebarOpen(open);
              }}
              title={
                <span className="font-bold">
                  History
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
                    activeAnalysisId && allAnalyses?.[activeAnalysisId]
                      ? activeAnalysisId
                      : null
                  }
                />
                {!activeRootAnalysisId ? (
                  <div className="py-3 ">
                    <AnalysisTreeItem isDummy={true} />
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
                        disableScrollEvent.current = true;
                        // start a new root analysis
                        analysisTreeManager.setActiveRootAnalysisId(null);
                        analysisTreeManager.setActiveAnalysisId(null);

                        // on ipad/phone, close sidebar when new button is clicked
                        if (window.innerWidth < breakpoints.lg)
                          setSidebarOpen(false);
                      }}
                    >
                      Start new thread
                      <PlusIcon className="inline w-4 h-4 ml-2" />
                    </div>
                  </div>
                )}

                {Object.keys(analysisIdsGrouped).map((groupName: string) => {
                  const analysesInGroup = analysisIdsGrouped[groupName];
                  if (!analysesInGroup.length) return null;

                  return (
                    <div key={groupName}>
                      <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500 mt-4 mb-2">
                        {groupName}
                      </h3>
                      {analysesInGroup.map((rootAnalysisId: string) => {
                        const root = nestedTree[rootAnalysisId];

                        return (
                          <div key={root?.analysisId}>
                            <AnalysisTreeItem
                              key={root?.analysisId}
                              analysis={root}
                              activeAnalysisId={activeAnalysisId}
                              onClick={(analysis) => {
                                // if the root analysis clicked now is different then the active one
                                // means react will take a sec to render the new root and the divs
                                // if so, we will wrap this inside a settimeout to let react render those
                                // if the active root is the same as this one, we just set timeout to 0
                                let timeout = 0;
                                if (activeRootAnalysisId === rootAnalysisId) {
                                  timeout = 0;
                                } else {
                                  timeout = 500;
                                }

                                // we will set immediately, but scroll based on timeout above
                                analysisTreeManager.setActiveRootAnalysisId(
                                  rootAnalysisId
                                );
                                analysisTreeManager.setActiveAnalysisId(
                                  analysis ? analysis?.analysisId : null
                                );

                                if (window.innerWidth < breakpoints.lg)
                                  setSidebarOpen(false);

                                setTimeout(() => {
                                  disableScrollEvent.current = false;
                                  if (autoScroll && analysis) {
                                    scrollTo(analysis.analysisId);
                                  }
                                }, timeout);
                              }}
                              extraClasses={twMerge("ml-4")}
                            />
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
              activeAnalysisId ? "" : "flex flex-col"
            )}
            onScroll={debounce((e) => {
              if (disableScrollEvent.current) return;
              // when we scroll, we want to update the active analysis id
              // so that we can show the active analysis in the sidebar
              e.stopPropagation();
              setMostVisibleAnalysisAsActive();
            }, 100)}
          >
            {activeAnalysisId &&
              activeRootAnalysisId &&
              nestedTree[activeRootAnalysisId] && (
                <>
                  <AnalysisAgent
                    key={activeRootAnalysisId}
                    setGlobalLoading={setLoading}
                    metadata={metadata}
                    rootClassNames={
                      "w-full mb-4 [&_.analysis-content]:min-h-96 shadow-md analysis-" +
                      activeRootAnalysisId
                    }
                    analysisId={activeRootAnalysisId}
                    rootAnalysisId={activeRootAnalysisId}
                    createAnalysisRequestBody={
                      nestedTree[activeRootAnalysisId].createAnalysisRequestBody
                    }
                    initiateAutoSubmit={true}
                    hasExternalSearchBar={true}
                    // we store this at the time of creation of the analysis
                    // and don't change it for this specific analysis afterwards.
                    sqlOnly={nestedTree[activeRootAnalysisId].sqlOnly}
                    isTemp={nestedTree[activeRootAnalysisId].isTemp}
                    keyName={nestedTree[activeRootAnalysisId].keyName}
                    previousContext={[]}
                    onManagerCreated={(
                      analysisManager: AnalysisManager,
                      id: string,
                      ctr: HTMLDivElement | null
                    ) => {
                      analysisDomRefs.current[id] = {
                        ctr,
                        analysisManager,
                        id,
                      };
                      if (autoScroll) {
                        // scroll to ctr
                        // scrollTo(id);
                      }

                      analysisTreeManager.updateAnalysis({
                        analysisId: activeRootAnalysisId,
                        isRoot: nestedTree[activeRootAnalysisId].isRoot,
                        updateObj: {
                          analysisManager: analysisManager,
                        },
                      });
                    }}
                    onManagerDestroyed={(
                      analysisManager: AnalysisManager,
                      id: string
                    ) => {
                      // remove the analysis from the analysisTree
                      analysisTreeManager.removeAnalysis({
                        analysisId: activeRootAnalysisId,
                        isRoot: nestedTree[activeRootAnalysisId].isRoot,
                        rootAnalysisId: activeRootAnalysisId,
                      });

                      analysisTreeManager.setActiveAnalysisId(null);
                      if (activeRootAnalysisId === id) {
                        analysisTreeManager.setActiveRootAnalysisId(null);
                      }
                    }}
                    initialConfig={{
                      analysisManager:
                        nestedTree[activeRootAnalysisId].analysisManager ||
                        null,
                    }}
                    setCurrentQuestion={setCurrentQuestion}
                  />

                  {/* render the children */}
                  {nestedTree[activeRootAnalysisId].flatOrderedChildren.map(
                    (child) => {
                      return (
                        <AnalysisAgent
                          key={child.analysisId}
                          metadata={metadata}
                          rootClassNames={
                            "w-full mb-4 [&_.analysis-content]:min-h-96 shadow-md analysis-" +
                            child.analysisId
                          }
                          analysisId={child.analysisId}
                          rootAnalysisId={child.rootAnalysisId}
                          createAnalysisRequestBody={
                            child.createAnalysisRequestBody
                          }
                          setGlobalLoading={setLoading}
                          initiateAutoSubmit={true}
                          hasExternalSearchBar={true}
                          // we store this at the time of creation of the analysis
                          // and don't change it for this specific analysis afterwards.
                          sqlOnly={child.sqlOnly}
                          isTemp={child.isTemp}
                          keyName={child.keyName}
                          // all parents goes up the tree from this analysis
                          // so reverse it to get the parents top down
                          previousContext={child.allParents
                            .reverse()
                            .map((parent) => ({
                              analysis_id: parent.analysisId,
                              user_question: parent.user_question,
                              steps:
                                parent?.analysisManager?.analysisData.gen_steps
                                  ?.steps || [],
                            }))
                            .filter((d) => d.steps.length > 0)}
                          onManagerCreated={(
                            analysisManager: AnalysisManager,
                            id: string,
                            ctr: HTMLDivElement | null
                          ) => {
                            analysisDomRefs.current[id] = {
                              ctr,
                              analysisManager,
                              id,
                            };
                            if (autoScroll) {
                              // scroll to ctr
                              // scrollTo(id);
                            }

                            analysisTreeManager.updateAnalysis({
                              analysisId: child.analysisId,
                              isRoot: child.isRoot,
                              updateObj: {
                                analysisManager: analysisManager,
                              },
                            });
                          }}
                          onManagerDestroyed={(
                            analysisManager: AnalysisManager,
                            id: string
                          ) => {
                            // remove the analysis from the analysisTree
                            analysisTreeManager.removeAnalysis({
                              analysisId: child.analysisId,
                              isRoot: child.isRoot,
                              rootAnalysisId: child.rootAnalysisId,
                            });

                            analysisTreeManager.setActiveAnalysisId(null);
                            if (activeRootAnalysisId === id) {
                              analysisTreeManager.setActiveRootAnalysisId(null);
                            }

                            setLoading(false);
                          }}
                          initialConfig={{
                            analysisManager: child.analysisManager || null,
                          }}
                          setCurrentQuestion={setCurrentQuestion}
                        />
                      );
                    }
                  )}
                </>
              )}

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
                ref={searchRef}
                searchBarClasses={searchBarClasses}
                searchBarDraggable={searchBarDraggable}
                handleSubmit={handleSubmit}
                loading={loading}
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
