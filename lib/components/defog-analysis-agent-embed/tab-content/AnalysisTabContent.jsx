import ErrorBoundary from "../../common/ErrorBoundary";
import { twMerge } from "tailwind-merge";
import { AgentConfigContext } from "../../context/AgentContext";
import { useContext } from "react";
import { AnalysisTreeViewer } from "../../agent/analysis-tree-viewer/AnalysisTreeViewer";

export function AnalysisTabContent({
  selectedDbManager,
  predefinedQuestions,
  searchBarDraggable = true,
  isTemp = false,
  sideBarClasses = "h-full",
  searchBarClasses = "",
  defaultSidebarOpen = null,
}) {
  const agentConfigContext = useContext(AgentConfigContext);

  return (
    <ErrorBoundary>
      <AnalysisTreeViewer
        analysisTreeManager={selectedDbManager}
        dashboards={agentConfigContext.val.dashboards}
        autoScroll={true}
        sideBarClasses={sideBarClasses}
        searchBarClasses={twMerge(
          searchBarDraggable ? "" : "sticky bottom-1",
          "[&_textarea]:pl-2",
          searchBarClasses
        )}
        searchBarDraggable={searchBarDraggable}
        showToggle={!isTemp}
        defaultSidebarOpen={
          defaultSidebarOpen || (window.innerWidth < 768 ? false : true)
        }
        predefinedQuestions={predefinedQuestions}
      />
    </ErrorBoundary>
  );
}
