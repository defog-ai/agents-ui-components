import ErrorBoundary from "../../common/ErrorBoundary";
import { twMerge } from "tailwind-merge";
import { AgentConfigContext } from "../../context/AgentContext";
import { useContext } from "react";
import { AnalysisTreeViewer } from "../../agent/analysis-tree-viewer/AnalysisTreeViewer";

export function AnalysisTabContent({
  keyName,
  treeManager,
  predefinedQuestions,
  searchBarDraggable = true,
  isTemp = false,
  forceSqlOnly = false,
  metadata = null,
  sideBarClasses = "h-full",
  searchBarClasses = "",
  defaultSidebarOpen = null,
}) {
  return (
    <ErrorBoundary>
      <AnalysisTreeViewer
        keyName={keyName}
        metadata={metadata}
        isTemp={isTemp}
        forceSqlOnly={forceSqlOnly}
        analysisTreeManager={treeManager}
        autoScroll={true}
        sideBarClasses={sideBarClasses}
        searchBarClasses={twMerge(
          searchBarDraggable ? "" : "sticky bottom-1",
          "[&_textarea]:pl-2",
          searchBarClasses
        )}
        searchBarDraggable={searchBarDraggable}
        showToggle={!forceSqlOnly}
        defaultSidebarOpen={
          defaultSidebarOpen || (window.innerWidth < 768 ? false : true)
        }
        predefinedQuestions={predefinedQuestions}
      />
    </ErrorBoundary>
  );
}
