import { Modal } from "antd";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import { AnalysisAgent } from "./AnalysisAgent";
import { AnalysisHistoryItem } from "./AnalysisHistoryItem";
import { AnalysisVersionViewerLinks } from "./AnalysisVersionViewerLinks";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowsPointingOutIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import { parseCsvFile, sentenceCase, useGhostImage } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import {
  Sidebar,
  Table,
  Toggle,
  TextArea,
  MessageManagerContext,
  DropFiles,
  SpinningLoader,
} from "../../../ui-components/lib/main";
import { useWindowSize } from "../../hooks/useWindowSize";
import { breakpoints } from "../../hooks/useBreakPoint";

export function AnalysisVersionViewer({
  dashboards,
  token,
  devMode,
  keyName,
  apiEndpoint,
  // this isn't always reinforced
  // we check for this only when we're creating a new analysis
  // but not otherwise
  // the priority is to have the new analysis rendered to not lose the manager
  maxRenderedAnalysis = 2,
  // array of strings
  // each string is a question
  predefinedQuestions = [
    "show me 5 rows and create a heatmap",
    "what is the average of x column",
  ],
  autoScroll = true,
  sideBarClasses = "",
  searchBarClasses = "",
  searchBarDraggable = true,
  defaultSidebarOpen = false,
}) {
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);

  const messageManager = useContext(MessageManagerContext);

  const [activeRootAnalysisId, setActiveRootAnalysisId] = useState(null); // this is the currently selected root analysis

  // we render these in the history panel and don't unmount them
  // for faster switching between them
  const [last10Analysis, setLast10Analysis] = useState([]); // this is the last 10 analysis

  const [sqlOnly, setSqlOnly] = useState(false);

  const ghostImage = useGhostImage();

  // an object that stores all analysis in this "session"
  // structure:
  // {
  //  rootAnalysisId: {
  //     root: {
  //       analysisId: "analysis-1",
  //       user_question: "Show me 5 rows",
  //     },
  //     versionList: [
  //       {
  //        analysisId: "analysis-1-v1",
  //        user_question: "Show me 5 rows",
  //        manager: ...
  //       },
  //      ...
  //    ]
  //   }
  //  ...
  // }
  const [sessionAnalyses, setSessionAnalyses] = useState({});
  // just a duplicate of the above but in a flat object
  const [allAnalyses, setAllAnalyses] = useState({});
  const analysisDomRefs = useRef({});

  const [loading, setLoading] = useState(false);

  const [parsingFile, setParsingFile] = useState(false);

  const searchCtr = useRef(null);
  const searchRef = useRef(null);
  const [addToDashboardSelection, setAddToDashboardSelection] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [didUploadFile, setDidUploadFile] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);

  const uploadFileToServer = async ({ parsedData, rows, columns }) => {
    try {
      const response = await fetch(`${apiEndpoint}/integration/upload_csv/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: parsedData,
          keyName: keyName,
          token: token,
        }),
      });
      const data = await response.json();
      console.log(data);

      setDidUploadFile(true);
      setTableColumns(columns);
      setTableData(rows);
    } catch (e) {
      messageManager.error("Failed to upload the file");
      console.log(e.stack);
    } finally {
      setParsingFile(false);
      setLoading(false);
    }
  };

  const windowSize = useWindowSize();

  const handleSubmit = useCallback(
    (question, rootAnalysisId, isRoot, directParentId) => {
      try {
        setLoading(true);

        // if we have an active root analysis, we're appending to that
        // otherwise we're starting a new analysis
        const newId = "analysis-" + v4();
        let newAnalysis = {
          analysisId: newId,
          isRoot: isRoot,
          rootAnalysisId: isRoot ? newId : rootAnalysisId,
          user_question: question,
        };

        newAnalysis.directParentId = directParentId;

        // this is extra stuff we will send to the backend when creating an entry
        // in the db
        let createAnalysisRequestExtraParams = {
          user_question: question,
          is_root_analysis: isRoot,
          root_analysis_id: rootAnalysisId,
          direct_parent_id: directParentId,
        };

        newAnalysis.createAnalysisRequestBody = {
          // the backend receives an extra param called "other_data" when appending to the table
          other_data: createAnalysisRequestExtraParams,
        };

        let newSessionAnalyses = { ...sessionAnalyses };

        // if we have an active root analysis, we're appending to that
        // otherwise we're starting a new root analysis
        if (!rootAnalysisId) {
          setActiveRootAnalysisId(newAnalysis.analysisId);
          newSessionAnalyses[newAnalysis.analysisId] = {
            root: newAnalysis,
            versionList: [newAnalysis],
          };
        } else {
          const rootAnalysis = sessionAnalyses[rootAnalysisId].root;
          newSessionAnalyses[rootAnalysis.analysisId].versionList.push(
            newAnalysis
          );
        }

        console.groupCollapsed("Analysis version viewer");
        console.groupEnd();

        setSessionAnalyses(newSessionAnalyses);
        setActiveAnalysisId(newAnalysis.analysisId);
        setActiveRootAnalysisId(newAnalysis.rootAnalysisId);

        searchRef.current.value = "";

        setAllAnalyses({
          ...allAnalyses,
          [newAnalysis.analysisId]: newAnalysis,
        });

        // remove the earliest one only if we have more than 10
        setLast10Analysis((prev) => {
          if (prev.length >= maxRenderedAnalysis) {
            return [...prev.slice(1), newAnalysis];
          } else {
            return [...prev, newAnalysis];
          }
        });
      } catch (e) {
        messageManager.error("Failed to create analysis");
        console.log(e.stack);
      } finally {
        setLoading(false);
      }
    },
    [sessionAnalyses, allAnalyses]
  );

  useEffect(() => {
    if (!searchBarDraggable) return;
    function setSearchBar() {
      if (!searchCtr.current) return;

      searchCtr.current.style.left = "0";
      searchCtr.current.style.right = "0";
      searchCtr.current.style.bottom =
        window.innerHeight > 800 ? "30%" : "20px";
    }

    setSearchBar();

    window.addEventListener("resize", setSearchBar);

    return () => {
      window.removeEventListener("resize", setSearchBar);
    };
  }, [searchBarDraggable]);

  // w-0
  return (
    <>
      <div className="relative h-full">
        {/* top and bottom fades if we are on small screens and if we have some analyses going */}
        {activeAnalysisId && activeRootAnalysisId && (
          <div className="lg:hidden absolute bottom-0 left-0 w-full h-48 pointer-events-none bg-gradient-to-b from-transparent to-slate-300 z-10"></div>
        )}
        <div
          className="max-w-full h-full flex flex-row bg-white text-gray-600 w-full"
          id="analysis-version-viewer"
        >
          <div className="absolute h-full left-0 top-0 z-[20] lg:sticky lg:h-full">
            <Sidebar
              location="left"
              open={sidebarOpen}
              onChange={(open) => {
                setSidebarOpen(open);
              }}
              title={<span className="font-bold">History</span>}
              rootClassNames={twMerge(
                "transition-all z-20 h-[calc(100%-1rem)] rounded-md rounded-l-none lg:rounded-none lg:rounded-tr-md lg:rounded-br-md bg-gray-100 border h-screen lg:h-full sticky top-0 lg:relative",
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
              <div className="flex flex-col text-sm relative history-list">
                <AnalysisVersionViewerLinks
                  analyses={allAnalyses}
                  activeAnalysisId={activeAnalysisId}
                />
                {Object.keys(sessionAnalyses).map((rootAnalysisId, i) => {
                  const root = sessionAnalyses[rootAnalysisId].root;
                  const analysisVersionList =
                    sessionAnalyses[rootAnalysisId].versionList;

                  return (
                    <div key={root.analysisId} className="">
                      {analysisVersionList.map((version, i) => {
                        return (
                          <AnalysisHistoryItem
                            key={version.analysisId}
                            analysis={version}
                            isActive={activeAnalysisId === version.analysisId}
                            setActiveRootAnalysisId={setActiveRootAnalysisId}
                            setActiveAnalysisId={setActiveAnalysisId}
                            setAddToDashboardSelection={
                              setAddToDashboardSelection
                            }
                            onClick={() => {
                              if (
                                analysisDomRefs[version.analysisId].ctr &&
                                autoScroll
                              ) {
                                analysisDomRefs[
                                  version.analysisId
                                ].ctr.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                  inline: "nearest",
                                });
                              }

                              if (windowSize < breakpoints.lg)
                                setSidebarOpen(false);
                            }}
                            extraClasses={
                              version.isRoot ? "" : "ml-2 border-l-2"
                            }
                          />
                        );
                      })}
                    </div>
                  );
                })}
                {!activeRootAnalysisId ? (
                  <AnalysisHistoryItem
                    isDummy={true}
                    setActiveRootAnalysisId={setActiveRootAnalysisId}
                    setActiveAnalysisId={setActiveAnalysisId}
                    isActive={!activeRootAnalysisId}
                  />
                ) : (
                  <div className="w-full mt-5 sticky bottom-5">
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
                        setActiveRootAnalysisId(null);
                        setActiveAnalysisId(null);

                        // on ipad/phone, close sidebar when new button is clicked
                        if (windowSize < breakpoints.lg) setSidebarOpen(false);
                      }}
                    >
                      New <PlusIcon className="ml-2 w-4 h-4 inline" />
                    </div>
                    <div className="absolute w-full h-10 bg-gray-100 z-0"></div>
                  </div>
                )}
              </div>
            </Sidebar>
          </div>
          <div
            className={twMerge(
              "absolute left-0 top-0 h-screen w-full overlay lg:hidden bg-gray-800 z-[11] transition-all",
              sidebarOpen ? "opacity-50 block" : "opacity-0 pointer-events-none"
            )}
            onClick={() => {
              setSidebarOpen(false);
            }}
          ></div>
          <div
            className="grid grid-cols-1 lg:grid-cols-1 grow rounded-tr-lg p-2 lg:p-4 relative min-w-0 h-full overflow-scroll "
            // onClick={() => {
            //   setSidebarOpen(false);
            // }}
          >
            {activeRootAnalysisId &&
              sessionAnalyses[activeRootAnalysisId].versionList.map(
                (analysis) => {
                  return (
                    <div key={analysis.analysisId}>
                      <AnalysisAgent
                        rootClassNames={
                          "mb-4 lg:ml-3 min-h-96 [&_.analysis-content]:min-h-96 shadow-md analysis-" +
                          analysis.analysisId
                        }
                        analysisId={analysis.analysisId}
                        createAnalysisRequestBody={
                          analysis.createAnalysisRequestBody
                        }
                        token={token}
                        apiEndpoint={apiEndpoint}
                        keyName={keyName}
                        initiateAutoSubmit={true}
                        searchRef={searchRef}
                        setGlobalLoading={setLoading}
                        devMode={devMode}
                        didUploadFile={didUploadFile}
                        sqlOnly={sqlOnly}
                        onManagerCreated={(mgr, id, ctr) => {
                          analysisDomRefs[id] = {
                            ctr,
                            mgr,
                            id,
                          };
                          if (autoScroll) {
                            // scroll to ctr
                            setTimeout(() => {
                              analysisDomRefs[id].ctr.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                                inline: "nearest",
                              });
                            }, 100);
                          }
                        }}
                        onManagerDestroyed={(mgr, id) => {
                          const data = mgr.analysisData;
                          // remove the analysis from the sessionAnalyses
                          setSessionAnalyses((prev) => {
                            let newSessionAnalyses = { ...prev };
                            if (newSessionAnalyses[id]) {
                              delete newSessionAnalyses[id];
                            } else {
                              const rootAnalysisId = data.root_analysis_id;
                              if (rootAnalysisId) {
                                const rootAnalysis =
                                  newSessionAnalyses[rootAnalysisId];
                                if (rootAnalysis) {
                                  rootAnalysis.versionList =
                                    rootAnalysis.versionList.filter(
                                      (item) => item.analysisId !== id
                                    );
                                }
                              }
                            }

                            return newSessionAnalyses;
                          });
                          setAllAnalyses((prev) => {
                            let newAllAnalyses = { ...prev };
                            if (newAllAnalyses[id]) {
                              delete newAllAnalyses[id];
                            }
                            return newAllAnalyses;
                          });
                          setActiveAnalysisId(null);
                          if (activeRootAnalysisId === id) {
                            setActiveRootAnalysisId(null);
                          }
                        }}
                      />
                    </div>
                  );
                }
              )}

            {!activeAnalysisId && (
              <div className="grow flex flex-col place-content-center m-auto max-w-full relative z-[1]">
                {didUploadFile !== true ? (
                  <div className="text-gray-400 text-center border p-4 rounded-md">
                    <p className="cursor-default block text-sm mb-2 font-bold">
                      Quickstart
                    </p>

                    <ul className="text-gray-600 font-light">
                      {predefinedQuestions.map((question, i) => (
                        <li className="" key={i}>
                          <span
                            className={twMerge(
                              "cursor-pointer text-sm",
                              loading
                                ? "text-gray-300 cursor-not-allowed"
                                : "hover:underline"
                            )}
                            onClick={(ev) => {
                              ev.preventDefault();
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
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="text-gray-400 mt-5 m-auto text-center max-w-full hidden lg:block">
                  {didUploadFile === true ? (
                    <Table rows={tableData} columns={tableColumns} />
                  ) : (
                    <DropFiles
                      label={null}
                      rootClassNames="w-96 max-w-full text-center bg-white p-4 border rounded-md"
                      iconClassNames="text-gray-400"
                      icon={
                        parsingFile ? (
                          <SpinningLoader classNames="w-4 h-4 text-gray-300" />
                        ) : null
                      }
                      onFileSelect={(ev) => {
                        // this is when the user selects a file from the file dialog
                        try {
                          let file = ev.target.files[0];
                          if (!file || file.type !== "text/csv") {
                            throw new Error("Only CSV files are accepted");
                          }
                          setLoading(true);
                          setParsingFile(true);

                          parseCsvFile(file, uploadFileToServer);
                        } catch (e) {
                          messageManager.error("Failed to parse the file");
                          setLoading(false);
                          setParsingFile(false);
                        }
                      }}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        try {
                          let file = ev?.dataTransfer?.items?.[0];
                          if (
                            !file ||
                            !file.kind ||
                            file.kind !== "file" ||
                            file.type !== "text/csv"
                          ) {
                            throw new Error("Only CSV files are accepted");
                          }

                          file = file.getAsFile();

                          setLoading(true);
                          setParsingFile(true);

                          parseCsvFile(file, uploadFileToServer);
                        } catch (e) {
                          messageManager.error("Failed to parse the file");
                          console.log(e.stack);
                          setLoading(false);
                          setParsingFile(false);
                        }
                      }}
                    >
                      <p className="text-gray-400 cursor-default block text-sm mb-2 font-bold">
                        Or drop a CSV
                      </p>
                    </DropFiles>
                  )}
                </div>
              </div>
            )}

            <div
              className={twMerge(
                "w-full lg:w-10/12 lg:w-2/4 m-auto fixed z-10 bg-white rounded-lg shadow-custom border border-gray-400 hover:border-blue-500 focus:border-blue-500 flex flex-row",
                searchBarClasses
              )}
              style={{
                left: "0",
                right: "0",
                bottom: searchBarDraggable
                  ? window.innerHeight > 800
                    ? "30%"
                    : "20px"
                  : null,
              }}
              ref={searchCtr}
            >
              {searchBarDraggable && (
                <div
                  className="cursor-move min-h-full w-3 flex items-center ml-1 group"
                  draggable={searchBarDraggable}
                  onDragStart={(e) => {
                    if (!searchBarDraggable) return;
                    e.dataTransfer.setDragImage(ghostImage, 0, 0);
                  }}
                  onDrag={(e) => {
                    if (!searchBarDraggable) return;
                    if (!e.clientX || !e.clientY || !searchCtr.current) return;

                    const eBottom =
                      window.innerHeight -
                      e.clientY -
                      searchCtr.current.clientHeight;
                    const eLeft = e.clientX;

                    const minBottom = 20;

                    const maxBottom =
                      window.innerHeight - 20 - searchCtr.current.clientHeight;

                    if (eBottom < minBottom) {
                      searchCtr.current.style.bottom = minBottom + "px";
                    } else if (eBottom > maxBottom) {
                      searchCtr.current.style.bottom = maxBottom + "px";
                    } else {
                      searchCtr.current.style.bottom = eBottom + "px";
                    }

                    const maxLeft =
                      window.innerWidth - searchCtr.current.clientWidth - 20;

                    const minLeft = 20;

                    searchCtr.current.style.right = "auto";

                    if (eLeft < minLeft) {
                      searchCtr.current.style.left = minLeft + "px";
                    } else if (eLeft > maxLeft) {
                      searchCtr.current.style.left = maxLeft + "px";
                    } else {
                      searchCtr.current.style.left = eLeft + "px";
                    }
                  }}
                >
                  <ArrowsPointingOutIcon className="h-3 w-3 text-gray-400 group-hover:text-primary-text" />
                </div>
              )}
              <div className="grow rounded-md lg:items-center flex flex-col-reverse lg:flex-row">
                <div className="flex flex-row grow">
                  <div className="flex lg:flex-row-reverse lg:items-center flex-col grow">
                    <TextArea
                      rootClassNames="grow border-none bg-transparent py-1.5 text-gray-900 px-2 placeholder:text-gray-400 sm:leading-6 text-sm break-all focus:ring-0 focus:outline-none"
                      textAreaClassNames="resize-none"
                      ref={searchRef}
                      disabled={loading}
                      defaultRows={1}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.preventDefault();
                          ev.stopPropagation();

                          // if (!searchRef.current.value) return;

                          handleSubmit(
                            searchRef.current.value,
                            activeRootAnalysisId,
                            !activeRootAnalysisId,
                            activeAnalysisId
                          );
                        }
                      }}
                      placeholder={
                        activeRootAnalysisId
                          ? "Type your next question here"
                          : "Type your question here"
                      }
                    />
                    <Toggle
                      disabled={loading}
                      titleClassNames="font-bold text-gray-400"
                      onToggle={(v) => setSqlOnly(v)}
                      defaultOn={sqlOnly}
                      offLabel="SQL/Agents"
                      onLabel={"SQL only"}
                      rootClassNames="items-start lg:border-r py-2 lg:py-0 px-2 w-36"
                    />
                  </div>
                  <button
                    type="button"
                    className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 p-0 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-blue-500 hover:bg-blue-500 hover:text-white"
                    onClick={() => {
                      handleSubmit(
                        searchRef.current.value,
                        activeRootAnalysisId,
                        !activeRootAnalysisId,
                        activeAnalysisId
                      );
                    }}
                  >
                    <ArrowRightEndOnRectangleIcon
                      className="-ml-0.5 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        title="Select the dashboards to add this analysis to"
        open={addToDashboardSelection}
        onOk={() => {
          console.log(selectedDashboards);
          return;
        }}
        onCancel={() => {
          setAddToDashboardSelection(false);
        }}
      >
        <div className="dashboard-selection mt-8 flex flex-col max-h-80 overflow-scroll bg-gray-100 rounded-md">
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
              <div className="checkbox mr-3">
                <input
                  // style input to have no background and a black tick
                  className="appearance-none w-3 h-3 border border-gray-300 rounded-md checked:bg-blue-600 checked:border-transparent"
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
    </>
  );
}
