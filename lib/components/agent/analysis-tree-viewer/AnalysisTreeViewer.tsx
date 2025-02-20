import {
  SyntheticEvent,
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
import { getQuestionType, raf, sentenceCase } from "@utils/utils";
import { twMerge } from "tailwind-merge";
import { Sidebar, MessageManagerContext, breakpoints } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { EmbedContext } from "../../context/EmbedContext";
import { DraggableInput } from "./DraggableInput";
import { getMostVisibleAnalysis } from "../agentUtils";
import setupBaseUrl from "../../utils/setupBaseUrl";
import { SkeletalLoader } from "@ui-components";
import type {
  AnalysisTreeManager,
  AnalysisTree,
  FlatAnalysisTree,
  NestedAnalysisTree,
  AnalysisTreeNode,
} from "./analysisTreeManager";
import { AnalysisManager } from "../analysis/analysisManager";
import debounce from "lodash.debounce";

type GroupClass =
  | "Today"
  | "Yesterday"
  | "Past week"
  | "Past month"
  | "Earlier";
type AnalysisGrouped = { [K in GroupClass]: string[] };

interface AnalysisDomRefs {
  [key: string]: {
    ctr: HTMLElement | null;
    analysisManager?: AnalysisManager;
    id?: string;
  };
}

// Utility functions
const scrollToAnalysis = (
  id: string,
  refs: React.RefObject<AnalysisDomRefs>,
  behavior: ScrollBehavior = "smooth"
) => {
  if (!refs.current?.[id]?.ctr) return;
  refs.current[id].ctr.scrollIntoView({
    behavior,
    block: "start",
  });
};

const useAnalysisGroups = (nestedTree: any, analysisTree: any) => {
  return useMemo(() => {
    try {
      const sorted = Object.keys(nestedTree).sort(
        (a, b) =>
          (nestedTree?.[b]?.timestamp || 0) - (nestedTree?.[a]?.timestamp || 0)
      );

      const grouped: AnalysisGrouped = {
        Today: [],
        Yesterday: [],
        "Past week": [],
        "Past month": [],
        Earlier: [],
      };

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      const month = new Date(today);
      month.setMonth(month.getMonth() - 1);

      sorted.forEach((id) => {
        const timestamp = analysisTree[id].root.timestamp;
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

      Object.keys(grouped).forEach((key) => {
        grouped[key as GroupClass].sort(
          (a, b) =>
            (analysisTree?.[b]?.root?.timestamp || 0) -
            (analysisTree?.[a]?.root?.timestamp || 0)
        );
      });

      return grouped;
    } catch (e) {
      console.warn("Error in sorting keys. Returning as is.");
      return { Earlier: Object.keys(nestedTree) } as AnalysisGrouped;
    }
  }, [nestedTree, analysisTree]);
};

const createNewAnalysis = async (
  analysisTreeManager: AnalysisTreeManager,
  question: string,
  isRoot: boolean,
  rootAnalysisId: string | null,
  dbName: string,
  directParentId: string | null,
  sqlOnly: boolean,
  forceSqlOnly: boolean,
  isTemp: boolean,
  newActiveTab: "table" | "chart"
) => {
  const newId = "analysis-" + crypto.randomUUID();
  const { newAnalysis } = await analysisTreeManager.submit({
    question,
    analysisId: newId,
    rootAnalysisId: isRoot ? newId : rootAnalysisId,
    dbName,
    isRoot,
    directParentId,
    sqlOnly: forceSqlOnly || sqlOnly,
    isTemp,
    activeTab: newActiveTab,
  });

  if (!rootAnalysisId) {
    analysisTreeManager.setActiveRootAnalysisId(newAnalysis.analysisId);
  }

  analysisTreeManager.setActiveAnalysisId(newAnalysis.analysisId);
  analysisTreeManager.setActiveRootAnalysisId(newAnalysis.rootAnalysisId);
  return newId;
};

const useAnalysisSubmit = (
  analysisTreeManager: AnalysisTreeManager,
  dbName: string,
  forceSqlOnly: boolean,
  sqlOnly: boolean,
  isTemp: boolean,
  token: string,
  apiEndpoint: string,
  messageManager: any,
  chartEditUrl: string,
  searchRef: React.RefObject<HTMLTextAreaElement>,
  analysisDomRefs: React.RefObject<AnalysisDomRefs>,
  setLoading: (loading: boolean) => void
) => {
  return useCallback(
    async (
      question: string,
      rootAnalysisId: string | null = null,
      isRoot: boolean = false,
      directParentId: string | null = null
    ) => {
      try {
        setLoading(true);
        if (!analysisTreeManager)
          throw new Error("Analysis tree manager not found");

        const allAnalyses = analysisTreeManager.getAll();
        let questionType: QuestionType = "analysis";
        let newActiveTab: "table" | "chart" = "table";

        if (Object.keys(allAnalyses).length > 0) {
          const res = await getQuestionType(
            token,
            dbName,
            apiEndpoint,
            question
          );
          questionType = res.question_type;
          newActiveTab = res.default_open_tab;
        }

        if (questionType === "edit-chart") {
          // if this is a new question, then we want to create a new analysis
          if (!rootAnalysisId) {
            await createNewAnalysis(
              analysisTreeManager,
              question,
              isRoot,
              rootAnalysisId,
              dbName,
              directParentId,
              sqlOnly,
              forceSqlOnly,
              isTemp,
              "chart"
            );
          } else {
            await handleChartQuestion(
              allAnalyses,
              question,
              chartEditUrl,
              messageManager,
              analysisTreeManager,
              token
            );
          }
          return;
        }

        const analysisId = await createNewAnalysis(
          analysisTreeManager,
          question,
          isRoot,
          rootAnalysisId,
          dbName,
          directParentId,
          sqlOnly,
          forceSqlOnly,
          isTemp,
          newActiveTab
        );

        raf(() => {
          scrollToAnalysis(analysisId, analysisDomRefs);
        });
      } catch (e: any) {
        messageManager.error("Failed to create analysis");
        console.error(e);
      } finally {
        if (searchRef.current) {
          searchRef.current.value = "";
        }
        setLoading(false);
      }
    },
    [
      analysisTreeManager,
      forceSqlOnly,
      sqlOnly,
      isTemp,
      dbName,
      analysisDomRefs,
    ]
  );
};

const handleChartQuestion = async (
  allAnalyses: FlatAnalysisTree,
  question: string,
  chartEditUrl: string,
  messageManager: any,
  analysisTreeManager: AnalysisTreeManager,
  token: string | null
) => {
  const mostVisibleElement = getMostVisibleAnalysis(Object.keys(allAnalyses));
  const visibleAnalysis = allAnalyses[mostVisibleElement.id];
  const analysisOutputs =
    visibleAnalysis?.analysisManager?.getAnalysis()?.data?.parsedOutput;
  if (!analysisOutputs) {
    messageManager.error("No visible analysis found to edit chart");
    return;
  }

  if (!analysisOutputs?.chartManager?.config) {
    messageManager.error("No chart found in the visible analysis");
    return;
  }

  try {
    await analysisOutputs.chartManager.editChart(
      token,
      question,
      chartEditUrl,
      {
        onError: (e) => {
          messageManager.error(e.message);
          console.error(e);
        },
      }
    );
    analysisTreeManager.setActiveTab(mostVisibleElement.id, "chart");
  } catch (e: any) {
    messageManager.error(e.message);
    console.error(e);
  }
};

const useAnalysisRefs = (
  allAnalyses: FlatAnalysisTree,
  analysisDomRefs: React.RefObject<AnalysisDomRefs>
) => {
  useEffect(() => {
    Object.values(allAnalyses).forEach((analysis) => {
      analysisDomRefs.current[analysis.analysisId] = {
        id: analysis.analysisId,
        ctr: document.getElementById(analysis.analysisId),
        analysisManager: analysis.analysisManager,
      };
    });
  }, [allAnalyses]);
};

const useInitialScroll = (
  activeAnalysisId: string | null,
  autoScroll: boolean,
  analysisDomRefs: React.RefObject<AnalysisDomRefs>,
  currentScrollTimeout: React.RefObject<NodeJS.Timeout | null>,
  disableScrollEvent: React.RefObject<boolean>
) => {
  useEffect(() => {
    if (currentScrollTimeout.current) {
      clearTimeout(currentScrollTimeout.current);
      currentScrollTimeout.current = null;
      disableScrollEvent.current = false;
    }

    disableScrollEvent.current = true;
    currentScrollTimeout.current = setTimeout(() => {
      if (
        activeAnalysisId &&
        autoScroll &&
        analysisDomRefs.current[activeAnalysisId]
      ) {
        scrollToAnalysis(activeAnalysisId, analysisDomRefs);
      }
      disableScrollEvent.current = false;
    }, 500);
  }, []);
};

const AnalysisTreeContent = ({
  dbName,
  activeRootAnalysisId,
  nestedTree,
  metadata,
  analysisDomRefs,
  analysisTreeManager,
  autoScroll,
  setLoading,
  setCurrentQuestion,
}: {
  dbName: string;
  activeRootAnalysisId: string;
  nestedTree: NestedAnalysisTree;
  metadata: any;
  analysisDomRefs: React.RefObject<AnalysisDomRefs>;
  analysisTreeManager: AnalysisTreeManager;
  autoScroll: boolean;
  setLoading: (loading: boolean) => void;
  setCurrentQuestion: (question: string) => void;
}) => {
  if (!activeRootAnalysisId || !nestedTree[activeRootAnalysisId]) return null;

  const activeAnalysisId = analysisTreeManager.getActiveAnalysisId();

  const getAnalysisClasses = (analysisId: string) => {
    const isActive = analysisId === activeAnalysisId;
    return twMerge(
      "w-full mb-4 [&_.analysis-content]:min-h-96 shadow-md transition-opacity duration-200",
      `analysis-${analysisId}`,
      isActive
        ? "ring-2 ring-blue-500 dark:ring-blue-400 bg-white dark:bg-gray-800 z-2 relative"
        : "opacity-50 hover:opacity-75 bg-gray-50/80 dark:bg-gray-900/80 relative -z-0"
    );
  };

  return (
    <>
      <AnalysisAgent
        key={activeRootAnalysisId}
        dbName={dbName}
        setGlobalLoading={setLoading}
        metadata={metadata}
        rootClassNames={getAnalysisClasses(activeRootAnalysisId)}
        analysisId={activeRootAnalysisId}
        rootAnalysisId={activeRootAnalysisId}
        createAnalysisRequestBody={
          nestedTree[activeRootAnalysisId].createAnalysisRequestBody
        }
        initiateAutoSubmit={true}
        hasExternalSearchBar={true}
        sqlOnly={nestedTree[activeRootAnalysisId].sqlOnly}
        isTemp={nestedTree[activeRootAnalysisId].isTemp}
        // this is a root analysis, so can just be empty array returned
        previousContextCreator={() => []}
        onManagerCreated={(
          analysisManager: AnalysisManager,
          id: string,
          ctr: HTMLDivElement | null
        ) => {
          analysisDomRefs.current[id] = { ctr, analysisManager, id };
          analysisTreeManager.updateAnalysis({
            analysisId: activeRootAnalysisId,
            isRoot: nestedTree[activeRootAnalysisId].isRoot,
            updateObj: { analysisManager },
          });
        }}
        onManagerDestroyed={(id: string) => {
          analysisTreeManager.removeAnalysis({
            analysisId: activeRootAnalysisId,
            isRoot: nestedTree[activeRootAnalysisId].isRoot,
            rootAnalysisId: activeRootAnalysisId,
          });
          analysisTreeManager.setActiveAnalysisId(null);
          if (activeRootAnalysisId === id) {
            analysisTreeManager.setActiveRootAnalysisId(null);
          }
          setLoading(false);
        }}
        initialConfig={{
          analysisManager:
            nestedTree[activeRootAnalysisId].analysisManager || null,
          analysisTreeManager,
        }}
        setCurrentQuestion={setCurrentQuestion}
      />

      {nestedTree[activeRootAnalysisId].flatOrderedChildren.map(
        (child: AnalysisTreeNode) => (
          <AnalysisAgent
            dbName={dbName}
            key={child.analysisId}
            metadata={metadata}
            rootClassNames={getAnalysisClasses(child.analysisId)}
            analysisId={child.analysisId}
            rootAnalysisId={child.rootAnalysisId}
            createAnalysisRequestBody={child.createAnalysisRequestBody}
            setGlobalLoading={setLoading}
            initiateAutoSubmit={true}
            hasExternalSearchBar={true}
            sqlOnly={child.sqlOnly}
            isTemp={child.isTemp}
            previousContextCreator={() => {
              return child.allParents
                .reverse()
                .map((parent: AnalysisTreeNode) => {
                  const analysis = parent?.analysisManager?.analysis;
                  if (!analysis || !analysis?.data) return null;

                  return {
                    question: analysis?.data?.inputs?.question,
                    sql: analysis?.data?.sql,
                  };
                })
                .filter((d: any) => d);
            }}
            onManagerCreated={(
              analysisManager: AnalysisManager,
              id: string,
              ctr: HTMLDivElement | null
            ) => {
              analysisDomRefs.current[id] = { ctr, analysisManager, id };
              analysisTreeManager.updateAnalysis({
                analysisId: child.analysisId,
                isRoot: child.isRoot,
                updateObj: { analysisManager },
              });
            }}
            onManagerDestroyed={(id: string) => {
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
              analysisTreeManager,
            }}
            setCurrentQuestion={setCurrentQuestion}
          />
        )
      )}
    </>
  );
};

const QuickstartSection = ({
  predefinedQuestions,
  handleSubmit,
  activeRootAnalysisId,
  activeAnalysisId,
}: any) => (
  <div className="grow flex flex-col place-content-center m-auto max-w-full relative z-[1]">
    <div className="text-center text-gray-400 rounded-md dark:text-gray-500">
      <p className="block mb-4 text-sm font-bold cursor-default">Quickstart</p>
      <ul className="font-light text-gray-500 dark:text-gray-400">
        {predefinedQuestions.map((question: string, i: number) => (
          <li key={i}>
            <button
              className={twMerge(
                "cursor-pointer text-sm p-2 m-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm",
                "hover:bg-gray-50 dark:hover:bg-gray-800 hover:border"
              )}
              onClick={() => {
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
);

/**
 *
 * Analysis tree viewer component
 *
 */
export function AnalysisTreeViewer({
  analysisTreeManager,
  dbName,
  isTemp = false,
  forceSqlOnly = false,
  metadata = null,
  predefinedQuestions = [],
  autoScroll = true,
  sideBarClasses = "",
  searchBarClasses = "",
  searchBarDraggable = true,
  defaultSidebarOpen = false,
  onTreeChange = () => {},
}: {
  analysisTreeManager: AnalysisTreeManager;
  dbName: string;
  isTemp?: boolean;
  forceSqlOnly?: boolean;
  metadata?: any;
  predefinedQuestions?: string[];
  autoScroll?: boolean;
  sideBarClasses?: string;
  searchBarClasses?: string;
  searchBarDraggable?: boolean;
  defaultSidebarOpen?: boolean;
  onTreeChange?: (dbName: string, analysisTree: AnalysisTree) => void;
}) {
  const messageManager = useContext(MessageManagerContext);
  const { token, apiEndpoint } = useContext(EmbedContext);

  // Refs
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const analysisDomRefs = useRef<AnalysisDomRefs>({});
  const currentScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const disableScrollEvent = useRef<boolean>(false);

  // State
  const [loading, setLoading] = useState(false);
  const [sqlOnly, setSqlOnly] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(defaultSidebarOpen);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(
    analysisTreeManager.getActiveAnalysisId()
  );
  const [activeRootAnalysisId, setActiveRootAnalysisId] = useState<
    string | null
  >(analysisTreeManager.getActiveRootAnalysisId());
  const [allAnalyses, setAllAnalyses] = useState(analysisTreeManager.getAll());

  // URLs
  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  // Analysis data
  const analysisTree = useSyncExternalStore(
    analysisTreeManager.subscribeToDataChanges,
    analysisTreeManager.getTree
  );

  const nestedTree = useMemo(
    () => analysisTreeManager.getNestedTree(),
    [analysisTree]
  );

  const analysisIdsGrouped = useAnalysisGroups(nestedTree, analysisTree);

  // Effect to sync active analysis ID
  useEffect(() => {
    const originalSetActiveAnalysisId = analysisTreeManager.setActiveAnalysisId;
    analysisTreeManager.setActiveAnalysisId = (id: string | null) => {
      setActiveAnalysisId(id);
      return originalSetActiveAnalysisId.call(analysisTreeManager, id);
    };
    return () => {
      analysisTreeManager.setActiveAnalysisId = originalSetActiveAnalysisId;
    };
  }, [analysisTreeManager]);

  // Effect to sync active root analysis ID
  useEffect(() => {
    const originalSetActiveRootAnalysisId =
      analysisTreeManager.setActiveRootAnalysisId;
    analysisTreeManager.setActiveRootAnalysisId = (id: string | null) => {
      setActiveRootAnalysisId(id);
      return originalSetActiveRootAnalysisId.call(analysisTreeManager, id);
    };
    return () => {
      analysisTreeManager.setActiveRootAnalysisId =
        originalSetActiveRootAnalysisId;
    };
  }, [analysisTreeManager]);

  // Effect to sync analyses
  useEffect(() => {
    setAllAnalyses(analysisTreeManager.getAll());
  }, [analysisTree]);

  const handleSubmit = useAnalysisSubmit(
    analysisTreeManager,
    dbName,
    forceSqlOnly,
    sqlOnly,
    isTemp,
    token,
    apiEndpoint,
    messageManager,
    chartEditUrl,
    searchRef,
    analysisDomRefs,
    setLoading
  );

  // Effects
  useEffect(() => {
    setLoading(false);
    analysisDomRefs.current = {};
  }, [analysisTreeManager]);

  useEffect(() => {
    if (isTemp) return;
    onTreeChange(dbName, analysisTree);
  }, [onTreeChange, dbName, analysisTree, isTemp]);

  useAnalysisRefs(allAnalyses, analysisDomRefs);

  useInitialScroll(
    activeAnalysisId,
    autoScroll,
    analysisDomRefs,
    currentScrollTimeout,
    disableScrollEvent
  );

  const setMostVisibleAnalysisAsActive = useCallback(() => {
    const allAnalyses = analysisTreeManager.getAll();
    const { id: visibleAnalysisId, element } = getMostVisibleAnalysis(
      Object.keys(allAnalyses)
    );
    if (!visibleAnalysisId) return;
    if (visibleAnalysisId === analysisTreeManager.getActiveAnalysisId()) return;
    const rootAnalysisId = allAnalyses[visibleAnalysisId].rootAnalysisId;
    analysisTreeManager.setActiveAnalysisId(visibleAnalysisId);
    analysisTreeManager.setActiveRootAnalysisId(rootAnalysisId);
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative h-full">
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
                    className="inline pl-2 text-xs font-light text-gray-400 underline cursor-pointer dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-500"
                    onClick={() => {
                      analysisTreeManager.reset();
                      analysisTreeManager.setActiveAnalysisId(null);
                      analysisTreeManager.setActiveRootAnalysisId(null);
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
              <div className="flex flex-col w-full h-full overflow-y-auto">
                {/* New Analysis */}
                <div className="sticky top-0 mb-4">
                  <AnalysisTreeItem
                    isDummy={true}
                    onClick={() => {
                      setCurrentQuestion("");
                      disableScrollEvent.current = true;
                      analysisTreeManager.setActiveRootAnalysisId(null);
                      analysisTreeManager.setActiveAnalysisId(null);
                    }}
                  />
                </div>

                {/* Groups */}
                {Object.entries(analysisIdsGrouped).map(([group, analyses]) => {
                  if (analyses.length === 0) return null;
                  return (
                    <div key={group} className="mb-6">
                      <div className="px-2 mb-2 text-xs font-medium tracking-wide text-blue-400 uppercase">
                        {group}
                      </div>
                      {analyses.map((rootAnalysisId: string) => {
                        const root = nestedTree[rootAnalysisId];

                        return (
                          <div key={root?.analysisId}>
                            <AnalysisTreeItem
                              key={root?.analysisId}
                              analysis={root}
                              activeAnalysisId={activeAnalysisId}
                              onClick={(analysis) => {
                                analysisTreeManager.setActiveRootAnalysisId(
                                  rootAnalysisId
                                );
                                analysisTreeManager.setActiveAnalysisId(
                                  analysis?.analysisId || rootAnalysisId
                                );

                                if (window.innerWidth < breakpoints.lg) {
                                  setSidebarOpen(false);
                                }
                                // if there's a current timeout, clear it
                                // and also make sure we reset scroll events till our new one fires
                                if (currentScrollTimeout.current) {
                                  clearTimeout(currentScrollTimeout.current);
                                  currentScrollTimeout.current = null;
                                  disableScrollEvent.current = false;
                                }

                                currentScrollTimeout.current = setTimeout(
                                  () => {
                                    disableScrollEvent.current = true;
                                    if (autoScroll) {
                                      const targetAnalysisId =
                                        analysis?.analysisId || rootAnalysisId;
                                      scrollToAnalysis(
                                        targetAnalysisId,
                                        analysisDomRefs
                                      );
                                    }
                                    disableScrollEvent.current = false;
                                  },
                                  200
                                );
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
          />
          <div
            className={twMerge(
              "relative w-full h-full min-w-0 p-2 pt-10 overflow-y-auto overflow-x-clip rounded-tr-lg sm:pt-0 grow lg:p-4",
              activeAnalysisId ? "" : "flex flex-col"
            )}
            onScroll={debounce((e: SyntheticEvent) => {
              if (disableScrollEvent.current) return;
              e.stopPropagation();
              setMostVisibleAnalysisAsActive();
            }, 100)}
          >
            {activeAnalysisId &&
              activeRootAnalysisId &&
              nestedTree[activeRootAnalysisId] && (
                <AnalysisTreeContent
                  dbName={dbName}
                  activeRootAnalysisId={activeRootAnalysisId}
                  nestedTree={nestedTree}
                  metadata={metadata}
                  analysisDomRefs={analysisDomRefs}
                  analysisTreeManager={analysisTreeManager}
                  autoScroll={autoScroll}
                  setLoading={setLoading}
                  setCurrentQuestion={setCurrentQuestion}
                />
              )}

            {!activeAnalysisId &&
              (loading ? (
                <div className="flex items-center justify-center h-full">
                  <SkeletalLoader />
                </div>
              ) : (
                <QuickstartSection
                  predefinedQuestions={predefinedQuestions}
                  handleSubmit={handleSubmit}
                  activeRootAnalysisId={activeRootAnalysisId}
                  activeAnalysisId={activeAnalysisId}
                />
              ))}
            <div
              className={
                searchBarDraggable
                  ? ""
                  : "fixed bottom-1 z-40 lg:w-4/6 w-11/12 mx-auto left-0 right-0"
              }
            >
              <DraggableInput
                ref={searchRef}
                searchBarClasses={searchBarClasses}
                searchBarDraggable={searchBarDraggable}
                handleSubmit={handleSubmit}
                loading={loading}
                activeRootAnalysisId={activeRootAnalysisId}
                activeAnalysisId={activeAnalysisId}
                forceSqlOnly={forceSqlOnly}
                setSqlOnly={setSqlOnly}
                sqlOnly={sqlOnly}
                question={currentQuestion}
                onNewConversationTextClick={() => {
                  disableScrollEvent.current = true;
                  analysisTreeManager.setActiveRootAnalysisId(null);
                  analysisTreeManager.setActiveAnalysisId(null);
                  if (window.innerWidth < breakpoints.lg) {
                    setSidebarOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
