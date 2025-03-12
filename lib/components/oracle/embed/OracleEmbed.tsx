import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  SpinningLoader,
  SingleSelect,
} from "@ui-components";
import { OracleHistorySidebar } from "./OracleHistorySidebar";
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
import {
  deleteReport,
  fetchReports,
  ORACLE_REPORT_STATUS,
  OracleReport,
  oracleReportTimestamp,
  ReportData,
  ListReportResponseItem,
} from "@oracle";
import { twMerge } from "tailwind-merge";
import { CreateNewProject } from "../../common/CreateNewProject";
import { OracleThinking } from "../reports/OracleThinking";
import { OracleEmbedContext } from "./OracleEmbedContext";
import { OracleSearchBarManager } from "./search-bar/oracleSearchBarManager";
import { OracleSearchBar } from "./search-bar/OracleSearchBar";
import {
  AnalysisTreeManager,
  AnalysisTree,
  createAnalysisTreeFromFetchedAnalyses,
} from "../../../../lib/components/query-data/analysis-tree-viewer/analysisTreeManager";
import {
  fetchAllAnalyses,
  getMostVisibleAnalysis,
} from "../../../../lib/components/query-data/queryDataUtils";
import ErrorBoundary from "../../../components/common/ErrorBoundary";
import {
  AnalysisTreeContent,
  scrollToAnalysis,
} from "../../../components/query-data/analysis-tree-viewer/AnalysisTreeViewer";
import { QueryDataEmbedContext } from "../../../components/context/QueryDataEmbedContext";
import debounce from "lodash.debounce";
import { raf } from "@utils/utils";

export interface OracleReportType extends ListReportResponseItem {
  /**
   * Always "report"
   */
  itemType: "report";
  /**
   * For a report, this is equal to report_id.
   */
  itemId: string;
  reportData?: ReportData;
}

export interface QueryDataTree {
  /**
   * Always "query-data"
   */
  itemType: "query-data";
  date_created: string;
  /**
   * For a query data tree, this is equal to rootAnalysisId.
   */
  itemId: string;
  analysisTree: AnalysisTree;
  treeManager?: AnalysisTreeManager;
}

export type OracleHistoryItem = OracleReportType | QueryDataTree;

export type groups =
  | "Today"
  | "Yesterday"
  | "Past week"
  | "Past month"
  | "Earlier";

export interface OracleHistory {
  [projectName: string]: Record<groups, OracleHistoryItem[]>;
}

const findItemGroupInHistory = (
  projectName: string,
  itemId: string,
  history: OracleHistory
) => {
  // default to Today
  if (!projectName || !itemId || !history || !history[projectName])
    return "Today";

  const groups = Object.keys(history[projectName]) as groups[];

  for (const group of groups) {
    if (
      history[projectName][group] &&
      Array.isArray(history[projectName][group]) &&
      history[projectName][group].some(
        (item) => String(item?.itemId) === String(itemId)
      )
    ) {
      return group;
    }
  }

  // default to Today
  return "Today";
};

// Wrapper component for AnalysisTreeContent to avoid conditional hooks
const AnalysisTreeContentWrapper = ({
  selectedItem,
  selectedProjectName,
  token,
  apiEndpoint,
}: {
  selectedItem: QueryDataTree;
  selectedProjectName: string;
  token: string;
  apiEndpoint: string;
}) => {
  // Setup necessary refs
  const analysisDomRefs = useRef({});
  const [contentLoading, setContentLoading] = useState(false);

  // Use the stored tree manager or create a new one
  const treeManager = useMemo(
    () =>
      selectedItem.treeManager ||
      AnalysisTreeManager(selectedItem.analysisTree),
    [selectedItem]
  );

  // Analysis data
  const analysisTree = useSyncExternalStore(
    treeManager.subscribeToDataChanges,
    treeManager.getTree
  );

  const nestedTree = useMemo(() => treeManager.getNestedTree(), [analysisTree]);

  // Get active root analysis ID
  const activeRootId = useMemo(() => {
    // Take the first root analysis ID from the tree
    return Object.keys(nestedTree)[0] || null;
  }, [nestedTree]);

  const { searchBarManager } = useContext(OracleEmbedContext);

  // Set active root analysis for the manager
  useEffect(() => {
    if (activeRootId) {
      treeManager.setActiveRootAnalysisId(activeRootId);
      treeManager.setActiveAnalysisId(activeRootId);
    }
  }, [treeManager, activeRootId]);

  // Function for handling follow-on questions
  const submitFollowOn = useCallback(
    (question: string) => {
      if (!question) return;

      // Set the question in the search bar
      searchBarManager.setQuestion(question);
    },
    [searchBarManager]
  );

  if (!activeRootId) return null;

  return (
    <QueryDataEmbedContext.Provider
      value={{
        token,
        apiEndpoint,
        hiddenCharts: [],
        hideSqlTab: false,
        hidePreviewTabs: false,
        hideRawAnalysis: true,
        analysisDataCache: {},
        updateConfig: () => {},
      }}
    >
      <AnalysisTreeContent
        projectName={selectedProjectName}
        activeRootAnalysisId={activeRootId}
        nestedTree={nestedTree}
        metadata={null}
        analysisDomRefs={analysisDomRefs}
        analysisTreeManager={treeManager}
        autoScroll={true}
        setLoading={setContentLoading}
        submitFollowOn={submitFollowOn}
      />
    </QueryDataEmbedContext.Provider>
  );
};

/**
 * Renders an Oracle report in an embedded mode.
 * This has a sidebar to select project names, and a report selector which shows a list of already generated reports.
 * Has a button to start a new report.
 */
export function OracleEmbed({
  apiEndpoint,
  token,
  initialProjectNames = [],
}: {
  apiEndpoint: string;
  token: string;
  initialProjectNames: string[];
}) {
  const [projectNames, setProjectNames] =
    useState<string[]>(initialProjectNames);
  const [selectedProjectName, setSelectedProjectName] = useState(null);
  const [oracleHistory, setOracleHistory] = useState<OracleHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const searchBarManager = useRef(OracleSearchBarManager());

  const selectedItem = useMemo(() => {
    if (!selectedItemId || !oracleHistory[selectedProjectName]) return null;

    const group = findItemGroupInHistory(
      selectedProjectName,
      selectedItemId,
      oracleHistory
    );
    if (!oracleHistory[selectedProjectName][group]) return null;

    // Use string comparison for safety
    return oracleHistory[selectedProjectName][group].find(
      (r) => String(r.itemId) === String(selectedItemId)
    );
  }, [selectedItemId, oracleHistory, selectedProjectName]);

  const messageManager = useRef(MessageManager());
  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: uploadNewProjectOption } = useRef<string>(
    crypto.randomUUID().toString()
  );

  const draft = useSyncExternalStore(
    searchBarManager.current.subscribeToDraftChanges,
    searchBarManager.current.getDraft
  );

  const hasUploadedFiles = useMemo(() => {
    return draft.uploadedFiles && draft.uploadedFiles.length > 0;
  }, [draft]);

  // Function to update URL with item_id
  const updateUrlWithItemId = useCallback((itemId: string | number | null) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (itemId !== null) {
        // Ensure itemId is string
        const itemIdStr = String(itemId);
        url.searchParams.set("item_id", itemIdStr);
      } else {
        url.searchParams.delete("item_id");
      }
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  // Listen for the new report custom event
  useEffect(() => {
    const handleNewReport = () => {
      updateUrlWithItemId(null);
      setSelectedItemId(null);
    };

    window.addEventListener("oracle:new-report", handleNewReport);
    return () =>
      window.removeEventListener("oracle:new-report", handleNewReport);
  }, [updateUrlWithItemId]);

  // Function to get item_id from URL - not as a callback to ensure it's actually checked
  function getItemIdFromUrl() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const itemIdParam = urlParams.get("item_id");

      if (itemIdParam) {
        // Try to convert to number if it's numeric
        const numericId = Number(itemIdParam);
        const itemId = !isNaN(numericId) ? numericId.toString() : itemIdParam;
        return itemId;
      }
      return null;
    }
    return null;
  }

  // Add a ref to track if initial setup is complete
  const initialSetupComplete = useRef(false);

  // Create a ref to store the URL item ID
  const urlItemIdRef = useRef(getItemIdFromUrl());

  useEffect(() => {
    async function setup() {
      try {
        // Get the URL item ID directly
        const urlItemId = urlItemIdRef.current;

        // Setup history structure
        const histories: OracleHistory = {};

        // Track if we've found the report from URL
        let foundUrlItemId = false;
        let foundUrlItemIdProjectName = null;

        // Set default project (only if not found in URL)
        if (projectNames.length && selectedProjectName === null && !urlItemId) {
          setSelectedProjectName(
            projectNames.length ? projectNames[0] : uploadNewProjectOption
          );
        } else {
          setSelectedProjectName(uploadNewProjectOption);
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        const month = new Date(today);
        month.setMonth(month.getMonth() - 1);

        for (const projectName of projectNames) {
          histories[projectName] = {
            Today: [],
            Yesterday: [],
            "Past week": [],
            "Past month": [],
            Earlier: [],
          };

          try {
            const reports = await fetchReports(apiEndpoint, token, projectName);
            // Fetch analyses for this project
            const analyses = await fetchAllAnalyses(
              apiEndpoint,
              token,
              projectName
            );

            // Process the analyses and create trees from them if they exist
            if (analyses && analyses.length > 0) {
              // Get all root analyses and create analysis trees for them
              const rootAnalyses = analyses.filter((a) => a.is_root_analysis);

              // Process each root analysis
              for (const rootAnalysis of rootAnalyses) {
                // Find all analyses that belong to this root
                const relatedAnalyses = analyses.filter(
                  (a) =>
                    a.root_analysis_id === rootAnalysis.analysis_id ||
                    a.analysis_id === rootAnalysis.analysis_id
                );

                // Create an analysis tree from these analyses
                const analysisTree =
                  createAnalysisTreeFromFetchedAnalyses(relatedAnalyses);

                // Create a tree manager for this analysis tree
                const treeManager = AnalysisTreeManager(analysisTree);

                // Check for URL item ID match with analysis ID
                if (
                  urlItemId &&
                  !foundUrlItemId &&
                  String(rootAnalysis.analysis_id) === String(urlItemId)
                ) {
                  foundUrlItemId = true;
                  foundUrlItemIdProjectName = projectName;
                }

                // Create a QueryDataTree item to add to history
                const queryDataTree: QueryDataTree = {
                  itemType: "query-data",
                  date_created: rootAnalysis.timestamp,
                  itemId: rootAnalysis.analysis_id,
                  analysisTree: analysisTree,
                  treeManager: treeManager,
                };

                // Parse date_created as UTC and convert to local timezone
                const date = new Date(rootAnalysis.timestamp);
                const localToday = new Date();
                const localYesterday = new Date(localToday);
                localYesterday.setDate(localYesterday.getDate() - 1);
                const localWeek = new Date(localToday);
                localWeek.setDate(localWeek.getDate() - 7);
                const localMonth = new Date(localToday);
                localMonth.setMonth(localMonth.getMonth() - 1);

                // Add to appropriate date group in history
                if (date.toDateString() === localToday.toDateString()) {
                  histories[projectName]["Today"].push(queryDataTree);
                } else if (
                  date.toDateString() === localYesterday.toDateString()
                ) {
                  histories[projectName]["Yesterday"].push(queryDataTree);
                } else if (date >= localWeek) {
                  histories[projectName]["Past week"].push(queryDataTree);
                } else if (date >= localMonth) {
                  histories[projectName]["Past month"].push(queryDataTree);
                } else {
                  histories[projectName]["Earlier"].push(queryDataTree);
                }
              }
            }

            if (!reports) throw new Error("Failed to get reports");

            // Check for URL item ID in this project
            if (urlItemId && !foundUrlItemId) {
              // Look for a match
              const reportMatch = reports.find(
                (r) => String(r.report_id) === String(urlItemId)
              );
              if (reportMatch) {
                foundUrlItemId = true;
                foundUrlItemIdProjectName = projectName;
              }
            }

            // Now filter for regular display
            const filteredReports = reports.filter(
              (report) =>
                report.status !== ORACLE_REPORT_STATUS.ERRORED &&
                report.status !== ORACLE_REPORT_STATUS.INITIALIZED
            );

            // add to histories based on date created
            filteredReports.forEach((report) => {
              // Parse date_created as UTC and convert to local timezone
              const date = new Date(report.date_created + "Z");
              const localToday = new Date();
              const localYesterday = new Date(localToday);
              localYesterday.setDate(localYesterday.getDate() - 1);
              const localWeek = new Date(localToday);
              localWeek.setDate(localWeek.getDate() - 7);
              const localMonth = new Date(localToday);
              localMonth.setMonth(localMonth.getMonth() - 1);

              // Add itemId to make ListReportResponseItem compatible with OracleHistoryItem
              const reportWithItemId: OracleHistoryItem = {
                ...report,
                itemId: report.report_id,
                itemType: "report",
              };

              // Compare dates using local timezone
              if (date.toDateString() === localToday.toDateString()) {
                histories[projectName]["Today"].push(reportWithItemId);
              } else if (
                date.toDateString() === localYesterday.toDateString()
              ) {
                histories[projectName]["Yesterday"].push(reportWithItemId);
              } else if (date >= localWeek) {
                histories[projectName]["Past week"].push(reportWithItemId);
              } else if (date >= localMonth) {
                histories[projectName]["Past month"].push(reportWithItemId);
              } else {
                histories[projectName]["Earlier"].push(reportWithItemId);
              }
            });

            // sort all items (reports and analyses) within each group in the history
            // by date created in reverse chronological order
            Object.entries(histories[projectName]).forEach(([group, items]) => {
              items.sort((a, b) => {
                // Handle both reports (with date_created + "Z") and analyses (with date_created already as timestamp)
                const dateA =
                  "report_id" in a
                    ? new Date(a.date_created + "Z").getTime()
                    : new Date(a.date_created).getTime();

                const dateB =
                  "report_id" in b
                    ? new Date(b.date_created + "Z").getTime()
                    : new Date(b.date_created).getTime();

                return dateB - dateA;
              });
            });
          } catch (error) {
            setError("Failed to fetch reports for project name " + projectName);
            break;
          }
        }

        // Update report history state
        setOracleHistory(histories);

        // If we found the URL item (report or analysis), select it
        if (urlItemId && foundUrlItemId && foundUrlItemIdProjectName) {
          // First select the project
          setSelectedProjectName(foundUrlItemIdProjectName);

          // Then wait a moment and select the item ID
          // This delay is important to avoid race conditions
          setTimeout(() => {
            setSelectedItemId(urlItemId);
          }, 100);
        }

        // Mark setup as complete
        initialSetupComplete.current = true;
      } catch (err) {
        console.error("Setup error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, [projectNames, apiEndpoint, token]);

  const onReportDelete = useCallback(async () => {
    const reportGroup = findItemGroupInHistory(
      selectedProjectName,
      selectedItemId,
      oracleHistory
    );

    const deleteSucess = await deleteReport(
      apiEndpoint,
      selectedItemId,
      token,
      selectedProjectName
    );

    if (!deleteSucess) {
      messageManager.current.error("Failed to delete report");
      return;
    } else {
      messageManager.current.success("Report deleted");

      // remove the report from the history
      setOracleHistory((prev) => {
        const newReportList = prev[selectedProjectName][reportGroup].filter(
          (item) => {
            // Check if this is a report or an analysis item
            return "report_id" in item
              ? item.report_id !== selectedItemId
              : item.itemId !== selectedItemId;
          }
        );

        const newHistory = {
          ...prev,
          [selectedProjectName]: {
            ...prev[selectedProjectName],
            [reportGroup]: newReportList,
          },
        };
        // if no reports left in group, remove group
        if (newReportList.length === 0) {
          delete newHistory[selectedProjectName][reportGroup];
        }
        return newHistory;
      });

      // Update URL to remove report_id and update state
      updateUrlWithItemId(null);
      setSelectedItemId(null);
    }
  }, [
    apiEndpoint,
    token,
    selectedItemId,
    selectedProjectName,
    updateUrlWithItemId,
  ]);

  // Function to handle analysis creation when in query-data mode
  const createNewFastAnalysis = useCallback(async function ({
    question,
    projectName,
    analysisId,
    rootAnalysisId,
    treeManager = null,
  }: {
    question: string;
    projectName: string;
    analysisId: string;
    rootAnalysisId: string;
    treeManager?: AnalysisTreeManager;
  }): Promise<{
    rootAnalysisId: string;
    analysisTree: AnalysisTree;
    treeManager: AnalysisTreeManager;
  }> {
    try {
      if (treeManager) {
        // means that the tree exists and this is a new follow on analysis
        const { newAnalysis } = await treeManager.submit({
          question,
          projectName: projectName,
          analysisId,
          rootAnalysisId: rootAnalysisId,
          isRoot: false,
          directParentId: treeManager.getActiveAnalysisId(),
          activeTab: "table",
        });

        raf(() => {
          scrollToAnalysis(newAnalysis.analysisId);
        });

        return {
          rootAnalysisId: rootAnalysisId,
          analysisTree: treeManager?.getTree() || {},
          treeManager: treeManager || AnalysisTreeManager(),
        };
      } else {
        // Start a fresh tree
        const newAnalysisTreeManager = AnalysisTreeManager();

        // Submit the question to create a new root analysis
        await newAnalysisTreeManager.submit({
          question,
          projectName: projectName,
          analysisId,
          // this is a new root so this is the same as analysisId
          rootAnalysisId: analysisId,
          isRoot: true,
          directParentId: null,
          sqlOnly: false,
          isTemp: false,
          activeTab: "table",
        });

        return {
          rootAnalysisId: analysisId,
          analysisTree: newAnalysisTreeManager.getTree(),
          treeManager: newAnalysisTreeManager,
        };
      }
    } catch (error) {
      console.error("Error creating new analysis:", error);
      messageManager.current.error(
        "Failed to create analysis: " + error.message
      );
    }
  }, []);

  const projectSelector = useMemo(() => {
    return (
      <div>
        <SingleSelect
          disabled={hasUploadedFiles}
          label={
            !selectedItemId && hasUploadedFiles
              ? "Remove uploaded CSV/Excel files to select a project"
              : "Select project"
          }
          rootClassNames="mb-2"
          value={selectedProjectName}
          allowClear={false}
          allowCreateNewOption={false}
          options={[
            {
              value: uploadNewProjectOption,
              label: "Upload new",
            },
          ].concat(
            projectNames.map((projectName) => ({
              value: projectName,
              label: projectName,
            }))
          )}
          onChange={(v: string) => {
            setSelectedProjectName(v);
            updateUrlWithItemId(null);
            setSelectedItemId(null);
          }}
        />
      </div>
    );
  }, [
    selectedProjectName,
    selectedItemId,
    projectNames,
    hasUploadedFiles,
    updateUrlWithItemId,
  ]);

  const setMostVisibleAnalysisAsActive = useCallback(() => {
    if (selectedItem.itemType !== "query-data" || !selectedItem.treeManager)
      return;

    const allAnalyses = selectedItem.treeManager.getAll();
    const { id: visibleAnalysisId, element } = getMostVisibleAnalysis(
      Object.keys(allAnalyses)
    );
    if (!visibleAnalysisId) return;
    if (visibleAnalysisId === selectedItem.treeManager.getActiveAnalysisId())
      return;
    const rootAnalysisId = allAnalyses[visibleAnalysisId].rootAnalysisId;
    selectedItem.treeManager.setActiveAnalysisId(visibleAnalysisId);
    selectedItem.treeManager.setActiveRootAnalysisId(rootAnalysisId);
  }, [selectedItem]);

  const nullState = useMemo(() => {
    return (
      <OracleSearchBar
        uploadNewProjectOption={uploadNewProjectOption}
        key="search"
        selectedItem={selectedItem}
        projectName={selectedProjectName}
        onNewProjectCreated={(newProjectName: string) => {
          setProjectNames((prev) => [...prev, newProjectName]);
          setSelectedItemId(null);
          setOracleHistory((prev) => ({
            ...prev,
            [newProjectName]: {
              Today: [],
              Yesterday: [],
              "Past week": [],
              "Past month": [],
              Earlier: [],
            },
          }));
        }}
        createNewFastAnalysis={(question, projectName) => {
          const analysisId = crypto.randomUUID() as string;
          if (projectNames.indexOf(projectName) === -1) {
            // means a new project was created
            createNewFastAnalysis({
              question,
              projectName: projectName,
              analysisId: analysisId,
              rootAnalysisId: analysisId,
              treeManager: selectedItem?.treeManager,
            }).then(({ rootAnalysisId, analysisTree, treeManager }) => {
              const timestamp = oracleReportTimestamp();

              // Create a new QueryDataTree item
              const newQueryDataTree: QueryDataTree = {
                date_created: timestamp,
                itemId: rootAnalysisId,
                analysisTree: analysisTree,
                treeManager: treeManager,
                itemType: "query-data",
              };

              // Add the new analysis to the history
              setOracleHistory((prev) => {
                let newHistory: OracleHistory = { ...prev };

                newHistory = {
                  ...prev,
                  [projectName]: {
                    ...prev[projectName],
                    Today: [
                      newQueryDataTree,
                      ...(prev?.[projectName]?.["Today"] || []),
                    ],
                    Yesterday: prev?.[projectName]?.["Yesterday"] || [],
                    "Past week": prev?.[projectName]?.["Past week"] || [],
                    "Past month": prev?.[projectName]?.["Past month"] || [],
                    Earlier: prev?.[projectName]?.["Earlier"] || [],
                  },
                };

                return newHistory;
              });

              // Update URL and selected report ID
              updateUrlWithItemId(rootAnalysisId);
              setSelectedItemId(rootAnalysisId);
              setSelectedProjectName(projectName);

              messageManager.current.success("New analysis created");
            });
          } else {
            return createNewFastAnalysis({
              question,
              projectName: selectedProjectName,
              analysisId: analysisId,
              rootAnalysisId: selectedItem.itemId,
              treeManager: selectedItem.treeManager,
            });
          }
        }}
        onReportGenerated={({ userQuestion, reportId, status }) => {
          setOracleHistory((prev) => {
            let newHistory: OracleHistory = { ...prev };

            newHistory = {
              ...prev,
              [selectedProjectName]: {
                ...prev[selectedProjectName],
                Today: [
                  {
                    report_id: reportId,
                    report_name: userQuestion,
                    status,
                    date_created: oracleReportTimestamp(),
                    itemId: reportId,
                    itemType: "report",
                  },
                  ...(prev?.[selectedProjectName]?.["Today"] || []),
                ],
                Yesterday: prev?.[selectedProjectName]?.["Yesterday"] || [],
                "Past week": prev?.[selectedProjectName]?.["Past week"] || [],
                "Past month": prev?.[selectedProjectName]?.["Past month"] || [],
                Earlier: prev?.[selectedProjectName]?.["Earlier"] || [],
              },
            };

            return newHistory;
          });

          updateUrlWithItemId(reportId);
          setSelectedItemId(reportId);
        }}
      />
    );
  }, [
    messageManager,
    selectedProjectName,
    updateUrlWithItemId,
    token,
    apiEndpoint,
    selectedItem,
  ]);

  useEffect(() => {
    if (projectNames.length) {
      setSelectedProjectName(projectNames[projectNames.length - 1]);
    }
  }, [projectNames]);

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-rose-50 text-rose-500">
        Error: {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        <SpinningLoader /> <span>Loading</span>
      </div>
    );
  }

  return (
    <OracleEmbedContext.Provider
      value={{ token, apiEndpoint, searchBarManager: searchBarManager.current }}
    >
      <MessageManagerContext.Provider value={messageManager.current}>
        <MessageMonitor rootClassNames={"absolute left-0 right-0"} />
        <div className="flex flex-row min-w-full min-h-full max-h-full h-full text-gray-600 bg-white dark:bg-gray-900">
          <OracleHistorySidebar
            oracleHistory={oracleHistory}
            selectedProjectName={selectedProjectName}
            uploadNewProjectOption={uploadNewProjectOption}
            selectedItemId={selectedItemId}
            updateUrlWithItemId={updateUrlWithItemId}
            projectSelector={projectSelector}
            setSelectedItem={(item) => {
              setSelectedItemId(item?.itemId);
            }}
          />
          <div className="flex flex-col grow p-2 relative min-w-0 overflow-hidden">
            {/* Show CreateNewProject when the "Upload new" option is selected */}
            {selectedItemId === null &&
              selectedProjectName === uploadNewProjectOption && (
                <CreateNewProject
                  apiEndpoint={apiEndpoint}
                  token={token}
                  onProjectCreated={(projectName) => {
                    setOracleHistory((prev) => ({
                      ...prev,
                      [projectName]: {
                        Today: [],
                        Yesterday: [],
                        "Past week": [],
                        "Past month": [],
                        Earlier: [],
                      },
                    }));
                    setProjectNames((prev) => [...prev, projectName]);
                  }}
                />
              )}

            {/* Show analysis tree for query-data */}
            {selectedItemId &&
            selectedItem &&
            "analysisTree" in selectedItem ? (
              <div
                className="p-4 space-y-4 max-h-full overflow-y-auto pb-48"
                onScroll={debounce((e: SyntheticEvent) => {
                  e.stopPropagation();
                  setMostVisibleAnalysisAsActive();
                }, 100)}
              >
                <ErrorBoundary>
                  {Object.keys((selectedItem as QueryDataTree).analysisTree)
                    .length > 0 && (
                    <>
                      {/* Use AnalysisTreeContent to render the analysis */}
                      <AnalysisTreeContentWrapper
                        selectedItem={selectedItem as QueryDataTree}
                        selectedProjectName={selectedProjectName}
                        token={token}
                        apiEndpoint={apiEndpoint}
                      />
                    </>
                  )}
                </ErrorBoundary>
              </div>
            ) : /* Show completed report */
            selectedItemId &&
              selectedItem &&
              "status" in selectedItem &&
              selectedItem.status === ORACLE_REPORT_STATUS.DONE ? (
              <OracleReport
                key={selectedItemId}
                reportId={selectedItemId}
                apiEndpoint={apiEndpoint}
                projectName={selectedProjectName}
                token={token}
                onDelete={onReportDelete}
                onReportParsed={(data: ReportData) => {
                  // find the group of this report in histories
                  const group = findItemGroupInHistory(
                    selectedProjectName,
                    selectedItemId,
                    oracleHistory
                  );

                  setOracleHistory((prev) => {
                    const prevReports = prev[selectedProjectName][group];
                    // if report is found, update it
                    return {
                      ...prev,
                      [selectedProjectName]: {
                        ...prev[selectedProjectName],
                        [group]: prevReports.map((r) => {
                          if (
                            "report_id" in r &&
                            r.report_id === selectedItemId
                          ) {
                            return {
                              ...r,
                              reportData: data,
                            };
                          }
                          return r;
                        }),
                      },
                    };
                  });
                }}
              />
            ) : selectedItemId ? (
              // Show thinking status for in-progress report
              <OracleThinking
                apiEndpoint={apiEndpoint}
                token={token}
                reportId={selectedItemId}
                onDelete={onReportDelete}
                onStreamClosed={(thinkingSteps, hadError) => {
                  // Safety check - make sure the project and report still exist
                  if (
                    !selectedProjectName ||
                    !selectedItemId ||
                    !oracleHistory[selectedProjectName]
                  ) {
                    console.warn(
                      "Stream closed but project or report data missing"
                    );
                    return;
                  }

                  const reportGroup = findItemGroupInHistory(
                    selectedProjectName,
                    selectedItemId,
                    oracleHistory
                  );

                  // Safety check - make sure the report group exists
                  if (!oracleHistory[selectedProjectName][reportGroup]) {
                    console.warn(
                      "Stream closed but report group missing:",
                      reportGroup
                    );
                    return;
                  }

                  if (hadError) {
                    // remove this report from the history
                    setOracleHistory((prev) => {
                      const newHistory = { ...prev };

                      // Extra safety check
                      if (
                        newHistory[selectedProjectName] &&
                        newHistory[selectedProjectName][reportGroup] &&
                        Array.isArray(
                          newHistory[selectedProjectName][reportGroup]
                        )
                      ) {
                        newHistory[selectedProjectName][reportGroup] =
                          newHistory[selectedProjectName][reportGroup].filter(
                            (r) => {
                              return "report_id" in r
                                ? r.report_id !== selectedItemId
                                : r.itemId !== selectedItemId;
                            }
                          );
                      }

                      return newHistory;
                    });

                    updateUrlWithItemId(null);
                    setSelectedItemId(null);
                  } else {
                    // set the status to done which will trigger the report rendering
                    setOracleHistory((prev) => {
                      const newHistory = { ...prev };

                      // Extra safety check
                      if (
                        newHistory[selectedProjectName] &&
                        newHistory[selectedProjectName][reportGroup] &&
                        Array.isArray(
                          newHistory[selectedProjectName][reportGroup]
                        )
                      ) {
                        newHistory[selectedProjectName][reportGroup] =
                          newHistory[selectedProjectName][reportGroup].map(
                            (r) => {
                              if (r.itemId === selectedItemId) {
                                return {
                                  ...r,
                                  status: ORACLE_REPORT_STATUS.DONE,
                                };
                              }
                              return r;
                            }
                          );
                      }

                      return newHistory;
                    });
                  }
                }}
              />
            ) : null}

            {/* Always show the search bar, but it will transform based on conditions */}
            {nullState}
          </div>
        </div>
      </MessageManagerContext.Provider>
    </OracleEmbedContext.Provider>
  );
}
