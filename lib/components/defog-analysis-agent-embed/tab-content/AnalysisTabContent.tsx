import ErrorBoundary from "../../common/ErrorBoundary";
import { AnalysisTreeViewer } from "../../query-data/analysis-tree-viewer/AnalysisTreeViewer";
import { AnalysisTree } from "lib/components/query-data/analysis-tree-viewer/analysisTreeManager";

export function AnalysisTabContent({
  dbName,
  treeManager,
  predefinedQuestions,
  searchBarDraggable = true,
  isTemp = false,
  forceSqlOnly = false,
  metadata = null,
  sideBarClasses = "h-full",
  searchBarClasses = "",
  defaultSidebarOpen = null,
  onTreeChange = (...args) => {},
}: {
  dbName: string;
  treeManager: any;
  predefinedQuestions?: string[];
  searchBarDraggable?: boolean;
  isTemp?: boolean;
  forceSqlOnly?: boolean;
  metadata?: any;
  sideBarClasses?: string;
  searchBarClasses?: string;
  defaultSidebarOpen?: boolean;
  onTreeChange?: (dbName: string, tree: AnalysisTree) => void;
}) {
  return (
    <ErrorBoundary>
      <AnalysisTreeViewer
        dbName={dbName}
        metadata={metadata}
        isTemp={isTemp}
        forceSqlOnly={forceSqlOnly}
        analysisTreeManager={treeManager}
        autoScroll={true}
        sideBarClasses={sideBarClasses}
        searchBarClasses={searchBarClasses}
        searchBarDraggable={searchBarDraggable}
        showToggle={!forceSqlOnly}
        defaultSidebarOpen={
          defaultSidebarOpen ?? (window.innerWidth < 768 ? false : true)
        }
        predefinedQuestions={predefinedQuestions}
        onTreeChange={onTreeChange}
      />
    </ErrorBoundary>
  );
}
