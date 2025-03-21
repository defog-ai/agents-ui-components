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

/**
 * Represents a report item in the Oracle history
 */
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

/**
 * Represents a query data analysis tree in the Oracle history
 */
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

/**
 * Union type representing items in the Oracle history sidebar
 */
export type OracleHistoryItem = OracleReportType | QueryDataTree;

/**
 * Time groups for history organization
 */
export type groups =
  | "Today"
  | "Yesterday"
  | "Past week"
  | "Past month"
  | "Earlier";

/**
 * Structure of the Oracle history object
 */
export interface OracleHistory {
  [projectName: string]: Record<groups, OracleHistoryItem[]>;
}

/**
 * Finds which group in history an item belongs to
 */
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

// Components
import { OracleProjectSelector } from "./components/OracleProjectSelector";
import { OracleCreateNewAnalysis } from "./components/OracleCreateNewAnalysis";
import { OracleContent } from "./components/OracleContent";
import { OracleError } from "./components/OracleError";
import { OracleLoading } from "./components/OracleLoading";

/**
 * Creates time-based groups for sorting history items
 */
const createHistoryTimeGroups = () => ({
  Today: [],
  Yesterday: [],
  "Past week": [],
  "Past month": [],
  Earlier: [],
});

/**
 * Determines which date group an item belongs to
 */
const getDateGroup = (date: Date): groups => {
  const localToday = new Date();
  const localYesterday = new Date(localToday);
  localYesterday.setDate(localYesterday.getDate() - 1);
  const localWeek = new Date(localToday);
  localWeek.setDate(localWeek.getDate() - 7);
  const localMonth = new Date(localToday);
  localMonth.setMonth(localMonth.getMonth() - 1);

  if (date.toDateString() === localToday.toDateString()) {
    return "Today";
  } else if (date.toDateString() === localYesterday.toDateString()) {
    return "Yesterday";
  } else if (date >= localWeek) {
    return "Past week";
  } else if (date >= localMonth) {
    return "Past month";
  } else {
    return "Earlier";
  }
};

/**
 * Hook for managing URL item ID
 */
const useUrlItemId = () => {
  // Get item_id from URL
  const getItemIdFromUrl = useCallback(() => {
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
  }, []);

  // Create a ref to store the URL item ID
  const urlItemIdRef = useRef(getItemIdFromUrl());

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

  return { urlItemIdRef, updateUrlWithItemId };
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
  // State management
  const [projectNames, setProjectNames] =
    useState<string[]>(initialProjectNames);
  const [selectedProjectName, setSelectedProjectName] = useState(null);
  const [oracleHistory, setOracleHistory] = useState<OracleHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Refs and managers
  const searchBarManager = useRef(OracleSearchBarManager());
  const messageManager = useRef(MessageManager());
  const initialSetupComplete = useRef(false);

  // Random UUID for upload new project option
  const { current: uploadNewProjectOption } = useRef<string>(
    crypto.randomUUID().toString()
  );

  // URL and navigation
  const { urlItemIdRef, updateUrlWithItemId } = useUrlItemId();

  // Get draft from search bar manager
  const draft = useSyncExternalStore(
    searchBarManager.current.subscribeToDraftChanges,
    searchBarManager.current.getDraft
  );

  // Since we're now uploading files immediately, we don't need to disable project switching
  const hasUploadedFiles = false;

  // Selected item from history
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

  // Main data loading effect
  useEffect(() => {
    async function setup() {
      try {
        setLoading(true);

        // Get the URL item ID directly
        const urlItemId = urlItemIdRef.current;

        // Setup history structure
        const histories: OracleHistory = {};

        // Track if we've found the report from URL
        let foundUrlItemId = false;
        let foundUrlItemIdProjectName = null;

        // Set default project if none is selected
        if (selectedProjectName === null) {
          if (projectNames.length && !urlItemId) {
            setSelectedProjectName(
              projectNames.length ? projectNames[0] : uploadNewProjectOption
            );
            return; // Exit early, will re-run after state updates
          } else {
            setSelectedProjectName(uploadNewProjectOption);
            return; // Exit early, will re-run after state updates
          }
        }

        // Preserve previously loaded data for other projects
        for (const projectName of projectNames) {
          // Initialize with empty groups or keep existing data
          histories[projectName] =
            oracleHistory[projectName] || createHistoryTimeGroups();
        }

        // Only load data for the selected project
        if (
          selectedProjectName !== uploadNewProjectOption &&
          projectNames.includes(selectedProjectName)
        ) {
          histories[selectedProjectName] = createHistoryTimeGroups();

          try {
            // Load reports and analyses in parallel
            const [reports, analyses] = await Promise.all([
              fetchReports(apiEndpoint, token, selectedProjectName),
              fetchAllAnalyses(apiEndpoint, token, selectedProjectName),
            ]);

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
                  foundUrlItemIdProjectName = selectedProjectName;
                }

                // Create a QueryDataTree item to add to history
                const queryDataTree: QueryDataTree = {
                  itemType: "query-data",
                  date_created: rootAnalysis.timestamp,
                  itemId: rootAnalysis.analysis_id,
                  analysisTree: analysisTree,
                  treeManager: treeManager,
                };

                // Parse date_created as UTC and add to appropriate date group
                const date = new Date(rootAnalysis.timestamp);
                const group = getDateGroup(date);
                histories[selectedProjectName][group].push(queryDataTree);
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
                foundUrlItemIdProjectName = selectedProjectName;
              }
            }

            // Filter out errored or initialized reports
            const filteredReports = reports.filter(
              (report) =>
                report.status !== ORACLE_REPORT_STATUS.ERRORED &&
                report.status !== ORACLE_REPORT_STATUS.INITIALIZED
            );

            // Add reports to history groups
            filteredReports.forEach((report) => {
              // Parse date_created as UTC and convert to local timezone
              const date = new Date(report.date_created + "Z");
              const group = getDateGroup(date);

              // Add itemId to make ListReportResponseItem compatible with OracleHistoryItem
              const reportWithItemId: OracleHistoryItem = {
                ...report,
                itemId: report.report_id,
                itemType: "report",
              };

              histories[selectedProjectName][group].push(reportWithItemId);
            });

            // Sort all items within each group by date created (newest first)
            Object.entries(histories[selectedProjectName]).forEach(
              ([group, items]) => {
                if (!items || !Array.isArray(items)) return;

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
              }
            );
          } catch (error) {
            setError(
              "Failed to fetch reports for project name " + selectedProjectName
            );
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
  }, [
    projectNames,
    apiEndpoint,
    token,
    uploadNewProjectOption,
    selectedProjectName,
    urlItemIdRef,
  ]);

  // Set latest project as selected when project names change, but only on initial load
  useEffect(() => {
    if (!initialSetupComplete.current && projectNames.length) {
      setSelectedProjectName(projectNames[projectNames.length - 1]);
    }
  }, [projectNames]);

  // Handle report deletion
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
    oracleHistory,
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
      throw error;
    }
  }, []);

  const setMostVisibleAnalysisAsActive = useCallback(() => {
    if (selectedItem?.itemType !== "query-data" || !selectedItem.treeManager)
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

  // Handle project selection
  const handleProjectChange = useCallback(
    (newProjectName: string) => {
      setSelectedProjectName(newProjectName);
      updateUrlWithItemId(null);
      setSelectedItemId(null);
      searchBarManager.current.resetDraft();
    },
    [updateUrlWithItemId]
  );

  // Handle new project creation
  const handleNewProjectCreated = useCallback((newProjectName: string) => {
    setProjectNames((prev) => [...prev, newProjectName]);
    setSelectedItemId(null);
    setOracleHistory((prev) => ({
      ...prev,
      [newProjectName]: createHistoryTimeGroups(),
    }));
  }, []);

  // Create the project selector component
  const projectSelector = useMemo(
    () => (
      <OracleProjectSelector
        selectedProjectName={selectedProjectName}
        projectNames={projectNames}
        uploadNewProjectOption={uploadNewProjectOption}
        hasUploadedFiles={hasUploadedFiles}
        onProjectChange={handleProjectChange}
      />
    ),
    [
      selectedProjectName,
      projectNames,
      uploadNewProjectOption,
      hasUploadedFiles,
      handleProjectChange,
    ]
  );

  // Handle new analysis creation
  const handleCreateNewAnalysis = useCallback(
    (question: string, projectName: string) => {
      const analysisId = crypto.randomUUID() as string;

      // Either a new project was created or we are on the "new report" screen
      if (projectNames.indexOf(projectName) === -1 || !selectedItem) {
        return OracleCreateNewAnalysis({
          question,
          projectName,
          analysisId,
          selectedItem,
          createNewFastAnalysis,
          setOracleHistory,
          updateUrlWithItemId,
          setSelectedItemId,
          setSelectedProjectName,
          messageManager: messageManager.current,
        });
      } else if (selectedItem?.itemType === "query-data") {
        return createNewFastAnalysis({
          question,
          projectName,
          analysisId,
          rootAnalysisId: selectedItem.itemId,
          treeManager: selectedItem.treeManager,
        });
      }
    },
    [
      projectNames,
      selectedItem,
      createNewFastAnalysis,
      updateUrlWithItemId,
      messageManager,
    ]
  );

  // Handle report generation
  const handleReportGenerated = useCallback(
    ({ userQuestion, reportId, status }) => {
      setOracleHistory((prev) => {
        const newHistory: OracleHistory = { ...prev };

        newHistory[selectedProjectName] = {
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
            ...(prev?.[selectedProjectName]?.Today || []),
          ],
          Yesterday: prev?.[selectedProjectName]?.Yesterday || [],
          "Past week": prev?.[selectedProjectName]?.["Past week"] || [],
          "Past month": prev?.[selectedProjectName]?.["Past month"] || [],
          Earlier: prev?.[selectedProjectName]?.Earlier || [],
        };

        return newHistory;
      });

      updateUrlWithItemId(reportId);
      setSelectedItemId(reportId);
    },
    [selectedProjectName, updateUrlWithItemId]
  );

  // Handle report data being parsed
  const handleReportParsed = useCallback(
    (data: ReportData) => {
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
              if ("report_id" in r && r.report_id === selectedItemId) {
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
    },
    [selectedProjectName, selectedItemId, oracleHistory]
  );

  // Handle thinking stream closed
  const handleThinkingStreamClosed = useCallback(
    (thinkingSteps, hadError) => {
      // Safety check - make sure the project and report still exist
      if (
        !selectedProjectName ||
        !selectedItemId ||
        !oracleHistory[selectedProjectName]
      ) {
        console.warn("Stream closed but project or report data missing");
        return;
      }

      const reportGroup = findItemGroupInHistory(
        selectedProjectName,
        selectedItemId,
        oracleHistory
      );

      // Safety check - make sure the report group exists
      if (!oracleHistory[selectedProjectName][reportGroup]) {
        console.warn("Stream closed but report group missing:", reportGroup);
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
            Array.isArray(newHistory[selectedProjectName][reportGroup])
          ) {
            newHistory[selectedProjectName][reportGroup] = newHistory[
              selectedProjectName
            ][reportGroup].filter((r) => {
              return "report_id" in r
                ? r.report_id !== selectedItemId
                : r.itemId !== selectedItemId;
            });
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
            Array.isArray(newHistory[selectedProjectName][reportGroup])
          ) {
            newHistory[selectedProjectName][reportGroup] = newHistory[
              selectedProjectName
            ][reportGroup].map((r) => {
              if (r.itemId === selectedItemId) {
                return {
                  ...r,
                  status: ORACLE_REPORT_STATUS.DONE,
                };
              }
              return r;
            });
          }

          return newHistory;
        });
      }
    },
    [selectedProjectName, selectedItemId, oracleHistory, updateUrlWithItemId]
  );

  // Create the search bar component
  const searchBar = useMemo(
    () => (
      <OracleSearchBar
        uploadNewProjectOption={uploadNewProjectOption}
        key="search"
        selectedItem={selectedItem}
        projectName={selectedProjectName}
        onNewProjectCreated={handleNewProjectCreated}
        createNewFastAnalysis={handleCreateNewAnalysis}
        onReportGenerated={handleReportGenerated}
      />
    ),
    [
      uploadNewProjectOption,
      selectedItem,
      selectedProjectName,
      handleNewProjectCreated,
      handleCreateNewAnalysis,
      handleReportGenerated,
    ]
  );

  // Error state
  if (error) {
    return <OracleError error={error} />;
  }

  // Loading state
  if (loading) {
    return <OracleLoading />;
  }

  // Main component
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

          <OracleContent
            apiEndpoint={apiEndpoint}
            token={token}
            selectedItemId={selectedItemId}
            selectedItem={selectedItem}
            selectedProjectName={selectedProjectName}
            uploadNewProjectOption={uploadNewProjectOption}
            searchBar={searchBar}
            onReportDelete={onReportDelete}
            onReportParsed={handleReportParsed}
            onThinkingStreamClosed={handleThinkingStreamClosed}
            setMostVisibleAnalysisAsActive={setMostVisibleAnalysisAsActive}
            onProjectCreated={handleNewProjectCreated}
          />
        </div>
      </MessageManagerContext.Provider>
    </OracleEmbedContext.Provider>
  );
}
