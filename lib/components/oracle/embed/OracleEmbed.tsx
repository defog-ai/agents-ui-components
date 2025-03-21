import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
} from "@ui-components";
import { OracleHistorySidebar } from "./OracleHistorySidebar";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { OracleReport } from "@oracle";
import { OracleEmbedContext } from "./OracleEmbedContext";
import { OracleSearchBarManager } from "./search-bar/oracleSearchBarManager";
import { OracleSearchBar } from "./search-bar/OracleSearchBar";
import { getMostVisibleAnalysis } from "../../../components/query-data/queryDataUtils";

// Types
import { OracleHistoryItem, QueryDataTree } from "./types";

// Components
import { OracleProjectSelector } from "./components/OracleProjectSelector";
import { OracleCreateNewAnalysis } from "./components/OracleCreateNewAnalysis";
import { OracleContent } from "./components/OracleContent";
import { OracleError } from "./components/OracleError";
import { OracleLoading } from "./components/OracleLoading";

// Hooks
import {
  useUrlItemId,
  useProjectAndHistory,
  useDataLoader,
  useAnalysisTree,
  useReportHandlers,
} from "./hooks";

// Utils
import { findItemGroupInHistory } from "./utils/historyUtils";

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
  // Random UUID for upload new project option
  const { current: uploadNewProjectOption } = useRef<string>(
    crypto.randomUUID().toString()
  );

  // Refs and managers
  const searchBarManager = useRef(OracleSearchBarManager());
  const messageManager = useRef(MessageManager());

  // URL and navigation
  const { urlItemIdRef, updateUrlWithItemId } = useUrlItemId();

  // Project and history management
  const {
    projectNames,
    setProjectNames,
    selectedProjectName,
    setSelectedProjectName,
    oracleHistory,
    setOracleHistory,
    selectedItemId,
    setSelectedItemId,
    handleProjectChange,
    handleNewProjectCreated
  } = useProjectAndHistory(
    initialProjectNames,
    updateUrlWithItemId,
    urlItemIdRef.current
  );

  // Data loading
  const { loading, error } = useDataLoader(
    projectNames,
    apiEndpoint,
    token,
    uploadNewProjectOption,
    selectedProjectName,
    urlItemIdRef,
    oracleHistory,
    setOracleHistory,
    setSelectedProjectName,
    setSelectedItemId
  );

  // Analysis tree management
  const { createNewFastAnalysis } = useAnalysisTree(messageManager.current);

  // Report handlers
  const {
    onReportDelete,
    handleReportGenerated,
    handleReportParsed,
    handleThinkingStreamClosed
  } = useReportHandlers(
    apiEndpoint,
    token,
    selectedItemId,
    selectedProjectName,
    updateUrlWithItemId,
    oracleHistory,
    setOracleHistory,
    messageManager.current
  );

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

  // Set most visible analysis as active
  const setMostVisibleAnalysisAsActive = useCallback(() => {
    if (selectedItem?.itemType !== "query-data" || !selectedItem.treeManager)
      return;

    const allAnalyses = selectedItem.treeManager.getAll();
    const { id: visibleAnalysisId } = getMostVisibleAnalysis(
      Object.keys(allAnalyses)
    );
    if (!visibleAnalysisId) return;
    if (visibleAnalysisId === selectedItem.treeManager.getActiveAnalysisId())
      return;
    const rootAnalysisId = allAnalyses[visibleAnalysisId].rootAnalysisId;
    selectedItem.treeManager.setActiveAnalysisId(visibleAnalysisId);
    selectedItem.treeManager.setActiveRootAnalysisId(rootAnalysisId);
  }, [selectedItem]);

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
      setOracleHistory,
      setSelectedItemId,
      setSelectedProjectName,
      messageManager,
    ]
  );

  // Listen for the new report custom event
  useEffect(() => {
    const handleNewReport = () => {
      updateUrlWithItemId(null);
      setSelectedItemId(null);
    };

    window.addEventListener("oracle:new-report", handleNewReport);
    return () =>
      window.removeEventListener("oracle:new-report", handleNewReport);
  }, [updateUrlWithItemId, setSelectedItemId]);

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
    console.log("OracleEmbed is in loading state");
    return <OracleLoading message="Loading project data..." />;
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