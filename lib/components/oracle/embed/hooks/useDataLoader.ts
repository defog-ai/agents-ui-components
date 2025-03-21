import { useState, useEffect, useRef } from "react";
import { OracleHistory } from "../types";
import { fetchReports, ORACLE_REPORT_STATUS } from "@oracle";
import { fetchAllAnalyses } from "../../../query-data/queryDataUtils";
import {
  createHistoryTimeGroups,
  getDateGroup,
  sortHistoryItems,
} from "../utils/historyUtils";
import {
  createAnalysisTreeFromFetchedAnalyses,
  AnalysisTreeManager,
} from "../../../query-data/analysis-tree-viewer/analysisTreeManager";

/**
 * Hook to load and process data for the Oracle component
 */
export const useDataLoader = (
  projectNames: string[],
  apiEndpoint: string,
  token: string,
  uploadNewProjectOption: string,
  selectedProjectName: string,
  urlItemIdRef: React.MutableRefObject<string>,
  oracleHistory: OracleHistory,
  setOracleHistory: React.Dispatch<React.SetStateAction<OracleHistory>>,
  setSelectedProjectName: React.Dispatch<React.SetStateAction<string>>,
  setSelectedItemId: React.Dispatch<React.SetStateAction<string>>
) => {
  // Start without loading if there's already a project selected and no URL item to search for
  const initialLoadingState =
    selectedProjectName === null || urlItemIdRef.current !== null;
  console.log(
    "Initial loading state:",
    initialLoadingState,
    "Selected project:",
    selectedProjectName,
    "URL item:",
    urlItemIdRef.current
  );

  const [loading, setLoading] = useState(initialLoadingState);
  const [error, setError] = useState<string | null>(null);
  const initialSetupComplete = useRef(false);

  // Initial setup effect - runs once during component initialization
  useEffect(() => {
    // Use a local flag to prevent concurrent runs
    let isRunning = false;

    async function initialSetup() {
      // If we're already set up or setup is already running, skip this
      if (initialSetupComplete.current || isRunning) {
        console.log("Skipping initial setup - already complete or running");
        return;
      }

      console.log("Starting initial setup");
      isRunning = true;
      setLoading(true);

      try {
        // Get the URL item ID
        const urlItemId = urlItemIdRef.current;

        // Create empty histories structure
        const histories: OracleHistory = {};
        let foundUrlItem = false;
        let foundInProjectName = null;

        // Initialize empty histories for all projects
        for (const projectName of projectNames) {
          histories[projectName] = createHistoryTimeGroups();
        }

        // Handle URL item ID search first
        if (urlItemId) {
          console.log("URL contains item_id:", urlItemId, "- searching for it");

          // First check if the selected project has this item
          // If selectedProjectName is already set (from props)
          if (
            selectedProjectName &&
            selectedProjectName !== uploadNewProjectOption
          ) {
            try {
              const result = await loadProjectData(
                selectedProjectName,
                apiEndpoint,
                token,
                histories,
                urlItemId
              );

              if (result.foundUrlItemId) {
                foundUrlItem = true;
                foundInProjectName = selectedProjectName;
                console.log(
                  "Found item in initial project:",
                  selectedProjectName
                );
              }
            } catch (error) {
              console.error(
                "Error searching in project:",
                selectedProjectName,
                error
              );
            }
          }

          // If not found in selected project, search all other projects
          if (!foundUrlItem) {
            const projectsToSearch = projectNames.filter(
              (name) =>
                name !== uploadNewProjectOption && name !== selectedProjectName
            );

            for (const projectName of projectsToSearch) {
              try {
                console.log("Checking project:", projectName);
                const result = await loadProjectData(
                  projectName,
                  apiEndpoint,
                  token,
                  histories,
                  urlItemId
                );

                if (result.foundUrlItemId) {
                  foundUrlItem = true;
                  foundInProjectName = projectName;
                  console.log("Found item in project:", projectName);
                  break;
                }
              } catch (error) {
                console.error(
                  "Error searching in project:",
                  projectName,
                  error
                );
              }
            }
          }
        }

        // Update the history state with what we've loaded
        setOracleHistory(histories);

        // Set project and item based on what we found
        if (foundUrlItem && foundInProjectName) {
          console.log(
            "Setting project to",
            foundInProjectName,
            "and item to",
            urlItemId
          );
          // Found item - select its project and the item
          setSelectedProjectName(foundInProjectName);
          setSelectedItemId(urlItemId);
        } else if (selectedProjectName) {
          // Keep existing selection if any
          console.log(
            "Keeping existing project selection:",
            selectedProjectName
          );
        } else if (projectNames.length > 0) {
          // Select first project
          console.log("No URL item found, selecting first project");
          setSelectedProjectName(projectNames[0]);
        } else {
          // No projects at all - use upload option
          console.log("No projects available, using upload option");
          setSelectedProjectName(uploadNewProjectOption);
        }

        console.log("Initial setup completed successfully");
        initialSetupComplete.current = true;
      } catch (err) {
        console.error("Initial setup error:", err);
        setError(err.message);
      } finally {
        console.log("Setting loading to false in initialSetup");
        setLoading(false);
        isRunning = false;
      }
    }

    initialSetup();

    // Safeguard: If loading never completes for some reason, turn it off after 10 seconds
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.log("Safety timeout reached - forcing loading to false");
        setLoading(false);
        initialSetupComplete.current = true;
        setError("Loading timed out - please try refreshing the page");
      }
    }, 5000);

    // Clean up timer
    return () => clearTimeout(safetyTimer);
  }, [
    projectNames,
    apiEndpoint,
    token,
    urlItemIdRef,
    uploadNewProjectOption,
    selectedProjectName,
    setSelectedProjectName,
    setSelectedItemId,
    setOracleHistory,
    loading,
    setLoading,
    setError,
  ]);

  // Main data loading effect - loads data for the selected project
  useEffect(() => {
    // Skip if we're in the initial setup or no project is selected
    if (!initialSetupComplete.current || selectedProjectName === null) {
      console.log(
        "Skipping data loading - initial setup not complete or no project selected"
      );
      return;
    }

    // Skip loading for the "upload new" option
    if (selectedProjectName === uploadNewProjectOption) {
      console.log("Skipping data loading for upload option");
      // Make sure loading is turned off
      setLoading(false);
      return;
    }

    console.log("Loading data for project:", selectedProjectName);
    let isLoadingData = false;

    async function loadData() {
      if (isLoadingData) {
        console.log("Already loading data, skipping");
        return;
      }

      isLoadingData = true;
      console.log("Setting loading to true for project data");
      setLoading(true);

      try {
        // Setup history structure
        const histories: OracleHistory = { ...oracleHistory };

        // Reset history for the selected project
        histories[selectedProjectName] = createHistoryTimeGroups();

        try {
          // Load data for the selected project
          await loadProjectData(
            selectedProjectName,
            apiEndpoint,
            token,
            histories,
            null // Not looking for specific item ID here
          );
        } catch (error) {
          setError(
            "Failed to fetch reports for project name " + selectedProjectName
          );
        }

        // Update report history state
        setOracleHistory(histories);
      } catch (err) {
        console.error("Data loading error:", err);
        setError(err.message);
      } finally {
        console.log("Setting loading to false after project data load");
        setLoading(false);
        isLoadingData = false;
      }
    }

    loadData();
  }, [
    selectedProjectName,
    apiEndpoint,
    token,
    uploadNewProjectOption,
    // Do NOT include oracleHistory here to avoid infinite loops
    setOracleHistory,
    setError,
  ]);

  // No additional effects needed - initial setup handles everything

  return { loading, error };
};

/**
 * Helper function to load project data
 */
async function loadProjectData(
  projectName: string,
  apiEndpoint: string,
  token: string,
  histories: OracleHistory,
  urlItemId: string | null
) {
  // Results object to return
  const result = {
    foundUrlItemId: false,
    foundUrlItemIdProjectName: null,
  };

  // Load reports and analyses in parallel
  const [reports, analyses] = await Promise.all([
    fetchReports(apiEndpoint, token, projectName),
    fetchAllAnalyses(apiEndpoint, token, projectName),
  ]);

  // Process analyses
  if (analyses && analyses.length > 0) {
    const analysisResult = processAnalyses(
      analyses,
      histories,
      projectName,
      urlItemId
    );

    if (analysisResult.foundUrlItemId) {
      result.foundUrlItemId = true;
      result.foundUrlItemIdProjectName = projectName;
    }
  }

  if (!reports) throw new Error("Failed to get reports");

  // Process reports
  if (!result.foundUrlItemId) {
    const reportResult = processReports(
      reports,
      histories,
      projectName,
      urlItemId
    );

    if (reportResult.foundUrlItemId) {
      result.foundUrlItemId = true;
      result.foundUrlItemIdProjectName = projectName;
    }
  }

  // Sort all items within each group by date
  sortHistoryItems(histories[projectName]);

  return result;
}

/**
 * Process analyses and create trees
 */
function processAnalyses(
  analyses: any[],
  histories: OracleHistory,
  projectName: string,
  urlItemId: string | null
) {
  const result = {
    foundUrlItemId: false,
    foundUrlItemIdProjectName: null,
  };

  // Get all root analyses
  const rootAnalyses = analyses.filter((a) => a.is_root_analysis);

  // Process each root analysis
  for (const rootAnalysis of rootAnalyses) {
    // Find all analyses that belong to this root
    const relatedAnalyses = analyses.filter(
      (a) =>
        a.root_analysis_id === rootAnalysis.analysis_id ||
        a.analysis_id === rootAnalysis.analysis_id
    );

    // Create an analysis tree
    const analysisTree = createAnalysisTreeFromFetchedAnalyses(relatedAnalyses);
    const treeManager = AnalysisTreeManager(analysisTree);

    // Check for URL item ID match
    if (
      urlItemId &&
      !result.foundUrlItemId &&
      String(rootAnalysis.analysis_id) === String(urlItemId)
    ) {
      result.foundUrlItemId = true;
      result.foundUrlItemIdProjectName = projectName;
    }

    // Create a QueryDataTree item
    const queryDataTree = {
      itemType: "query-data" as "query-data",
      date_created: rootAnalysis.timestamp,
      itemId: rootAnalysis.analysis_id,
      analysisTree: analysisTree,
      treeManager: treeManager,
    };

    // Add to appropriate date group
    const date = new Date(rootAnalysis.timestamp);
    const group = getDateGroup(date);
    histories[projectName][group].push(queryDataTree);
  }

  return result;
}

/**
 * Process reports and add to history
 */
function processReports(
  reports: any[],
  histories: OracleHistory,
  projectName: string,
  urlItemId: string | null
) {
  const result = {
    foundUrlItemId: false,
    foundUrlItemIdProjectName: null,
  };

  // Check for URL item ID match
  if (urlItemId) {
    const reportMatch = reports.find(
      (r) => String(r.report_id) === String(urlItemId)
    );
    if (reportMatch) {
      result.foundUrlItemId = true;
      result.foundUrlItemIdProjectName = projectName;
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
    // Parse date_created and convert to local timezone
    const date = new Date(report.date_created + "Z");
    const group = getDateGroup(date);

    // Add itemId to make compatible with OracleHistoryItem
    const reportWithItemId = {
      ...report,
      itemId: report.report_id,
      itemType: "report",
    };

    histories[projectName][group].push(reportWithItemId);
  });

  return result;
}
