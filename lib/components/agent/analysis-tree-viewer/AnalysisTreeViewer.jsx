import { Modal } from "antd";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnalysisAgent } from "../analysis/AnalysisAgent";
import { AnalysisTreeItem } from "./AnalysisTreeItem";
import { PlusIcon } from "@heroicons/react/20/solid";
import { sentenceCase, useGhostImage } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import {
  Sidebar,
  MessageManagerContext,
  useWindowSize,
  breakpoints,
} from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { AnalysisTreeViewerLinks } from "./AnalysisTreeViewerLinks";
import { AgentConfigContext } from "../../context/AgentContext";
import { DraggableInput } from "./DraggableInput";
/**
 * Analysis tree viewer component
 * @param {Object} props
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
}) {
  const messageManager = useContext(MessageManagerContext);

  const analysisDomRefs = useRef({});

  const [loading, setLoading] = useState(false);
  const [sqlOnly, setSqlOnly] = useState(true);

  const searchRef = useRef(null);
  const [addToDashboardSelection, setAddToDashboardSelection] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState([]);

  const { dashboards } = useContext(AgentConfigContext).val;

  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);

  const windowSize = useWindowSize();

  const analysisTree = useSyncExternalStore(
    analysisTreeManager.subscribeToDataChanges,
    analysisTreeManager.getTree
  );

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
    setSelectedDashboards([]);
    setAddToDashboardSelection(false);
    analysisDomRefs.current = {};
  }, [analysisTreeManager]);

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

        setLoading(true);

        const { newId, newAnalysis } = await analysisTreeManager.submit({
          question,
          rootAnalysisId,
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
      } finally {
        setLoading(false);
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

  window.ref = searchRef;
  // w-0
  return (
    <ErrorBoundary>
      <div className="relative h-full">
        {/* top and bottom fades if we are on small screens and if we have some analyses going */}
        {activeAnalysisId && activeRootAnalysisId && (
          <div className="lg:hidden absolute bottom-0 left-0 w-full h-[10%] pointer-events-none bg-gradient-to-b from-transparent to-gray-300 z-10"></div>
        )}
        <div className="flex flex-row w-full h-full max-w-full text-gray-600 bg-white analysis-tree-viewer">
          <div className="absolute left-0 top-0 z-[20] lg:sticky">
            <Sidebar
              location="left"
              open={sidebarOpen}
              onChange={(open) => {
                setSidebarOpen(open);
              }}
              title={<span className="font-bold">History</span>}
              rootClassNames={twMerge(
                "transition-all z-20 h-[calc(100%-1rem)] rounded-md rounded-l-none lg:rounded-none lg:rounded-tr-md lg:rounded-br-md bg-gray-100 border-r sticky top-0 lg:relative",
                sideBarClasses
              )}
              iconClassNames={`${sidebarOpen ? "" : "text-white bg-secondary-highlight-2"}`}
              openClassNames={"border-gray-300 shadow-md"}
              closedClassNames={"border-transparent bg-transparent shadow-none"}
              contentClassNames={
                // need to add pl-4 here to make the links visible
                "w-72 px-2 pt-5 pb-14 rounded-tl-lg relative sm:block pl-4 min-h-96 h-full overflow-y-auto"
              }
            >
              <div className="relative flex flex-col text-sm history-list">
                <AnalysisTreeViewerLinks
                  analyses={allAnalyses}
                  activeAnalysisId={
                    allAnalyses?.[activeAnalysisId] ? activeAnalysisId : null
                  }
                />
                {Object.keys(analysisTree).map((rootAnalysisId, i) => {
                  const root = analysisTree[rootAnalysisId].root;
                  const analysisChildList =
                    analysisTree?.[rootAnalysisId]?.analysisList || [];

                  return (
                    <div key={root.analysisId} className="">
                      {analysisChildList.map((tree, i) => {
                        return (
                          <AnalysisTreeItem
                            key={tree.analysisId}
                            analysis={tree}
                            isActive={activeAnalysisId === tree.analysisId}
                            setActiveRootAnalysisId={
                              analysisTreeManager.setActiveRootAnalysisId
                            }
                            setActiveAnalysisId={
                              analysisTreeManager.setActiveAnalysisId
                            }
                            setAddToDashboardSelection={
                              setAddToDashboardSelection
                            }
                            onClick={() => {
                              if (autoScroll) {
                                scrollTo(tree.analysisId);
                              }

                              if (windowSize[0] < breakpoints.lg)
                                setSidebarOpen(false);
                            }}
                            extraClasses={tree.isRoot ? "" : "ml-2 border-l-2"}
                          />
                        );
                      })}
                    </div>
                  );
                })}
                {!activeRootAnalysisId ? (
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
                ) : (
                  <div className="sticky w-full mt-5 bottom-5">
                    <div
                      data-enabled={!loading}
                      className={twMerge(
                        "flex items-center cursor-pointer z-20 relative",
                        "data-[enabled=true]:bg-blue-200 data-[enabled=true]:hover:bg-blue-500 data-[enabled=true]:hover:text-white p-2 data-[enabled=true]:text-blue-400 data-[enabled=true]:shadow-custom ",
                        "data-[enabled=false]:bg-gray-100 data-[enabled=false]:hover:bg-gray-100 data-[enabled=false]:hover:text-gray-400 data-[enabled=false]:text-gray-400 data-[enabled=false]:cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (loading) return;
                        // start a new root analysis
                        analysisTreeManager.setActiveRootAnalysisId(null);
                        analysisTreeManager.setActiveAnalysisId(null);

                        // on ipad/phone, close sidebar when new button is clicked
                        if (windowSize[0] < breakpoints.lg)
                          setSidebarOpen(false);
                      }}
                    >
                      New <PlusIcon className="inline w-4 h-4 ml-2" />
                    </div>
                    <div className="absolute z-0 w-full h-10 bg-gray-100"></div>
                  </div>
                )}
              </div>
            </Sidebar>
          </div>
          <div
            className={twMerge(
              "absolute left-0 top-0 h-full w-full overlay lg:hidden bg-gray-800 z-[11] transition-all",
              sidebarOpen ? "opacity-50 block" : "opacity-0 pointer-events-none"
            )}
            onClick={() => {
              setSidebarOpen(false);
            }}
          ></div>
          <div className="relative grid h-full min-w-0 grid-cols-1 p-2 pt-10 overflow-auto rounded-tr-lg sm:pt-0 auto-cols-max lg:grid-cols-1 grow lg:p-4">
            {activeRootAnalysisId &&
              analysisTree?.[activeRootAnalysisId]?.analysisList &&
              analysisTree[activeRootAnalysisId].analysisList.map(
                (analysis) => {
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
                      setGlobalLoading={setLoading}
                      // we store this at the time of creation of the analysis
                      // and don't change it for this specific analysis afterwards.
                      sqlOnly={analysis.sqlOnly}
                      isTemp={analysis.isTemp}
                      keyName={analysis.keyName}
                      userQuestions={analysisChildList.map((i) => ({ ...i }))}
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

                        setLoading(false);
                      }}
                      initialConfig={{
                        analysisManager: analysis.analysisManager || null,
                      }}
                    />
                  );
                }
              )}

            {!activeAnalysisId && (
              <div className=" grow flex flex-col place-content-center m-auto max-w-full relative z-[1]">
                <div className="text-center text-gray-400 rounded-md">
                  <p className="block mb-4 text-sm font-bold cursor-default">
                    Quickstart
                  </p>

                  <ul className="font-light text-gray-500">
                    {predefinedQuestions.map((question, i) => (
                      <li className="" key={i}>
                        <button
                          className={twMerge(
                            "cursor-pointer text-sm p-2 m-1 border border-gray-200 rounded-md shadow-sm",
                            loading
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "hover:bg-gray-50 hover:border"
                          )}
                          onClick={(ev) => {
                            if (loading) return;

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
            <DraggableInput
              searchBarClasses={searchBarClasses}
              searchBarDraggable={searchBarDraggable}
              loading={loading}
              handleSubmit={handleSubmit}
              activeRootAnalysisId={activeRootAnalysisId}
              activeAnalysisId={activeAnalysisId}
              showToggle={showToggle}
              forceSqlOnly={forceSqlOnly}
              setSqlOnly={setSqlOnly}
              sqlOnly={sqlOnly}
            />
          </div>
        </div>
      </div>
      <Modal
        title="Select the dashboards to add this analysis to"
        open={addToDashboardSelection}
        onOk={() => {
          return;
        }}
        onCancel={() => {
          setAddToDashboardSelection(false);
        }}
      >
        <div className="flex flex-col mt-8 overflow-auto bg-gray-100 rounded-md dashboard-selection max-h-80">
          {dashboards.map((dashboard) => (
            <div
              className={
                "flex flex-row p-2 hover:bg-gray-200 cursor-pointer text-gray-400 items-start " +
                (selectedDashboards.includes(dashboard.doc_id) &&
                  "text-gray-600 font-bold")
              }
              key={dashboard.doc_id}
              onClick={() => {
                if (selectedDashboards.includes(dashboard.doc_id)) {
                  setSelectedDashboards(
                    selectedDashboards.filter(
                      (item) => item !== dashboard.doc_id
                    )
                  );
                } else {
                  setSelectedDashboards([
                    ...selectedDashboards,
                    dashboard.doc_id,
                  ]);
                }
              }}
            >
              <div className="mr-3 checkbox">
                <input
                  // style input to have no background and a black tick
                  className="w-3 h-3 border border-gray-300 rounded-md appearance-none checked:bg-blue-600 checked:border-transparent"
                  type="checkbox"
                  checked={selectedDashboards.includes(dashboard.doc_id)}
                  readOnly
                />
              </div>
              <div className="grow">{dashboard.doc_title}</div>
            </div>
          ))}
        </div>
      </Modal>
    </ErrorBoundary>
  );
}
