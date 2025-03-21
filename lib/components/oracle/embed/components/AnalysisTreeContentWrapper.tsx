import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { QueryDataEmbedContext } from "../../../context/QueryDataEmbedContext";
import { OracleEmbedContext } from "../OracleEmbedContext";
import { QueryDataTree } from "../types";
import { AnalysisTreeContent } from "../../../query-data/analysis-tree-viewer/AnalysisTreeViewer";
import { AnalysisTreeManager } from "../../../query-data/analysis-tree-viewer/analysisTreeManager";

/**
 * Wrapper component for AnalysisTreeContent to avoid conditional hooks
 */
export const AnalysisTreeContentWrapper = ({
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
