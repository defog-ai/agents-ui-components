import { DefogAnalysisAgentStandalone } from "../../DefogAnalysisAgentStandalone";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { twMerge } from "tailwind-merge";

export function AnalysisTabContent({
  selectedDbManager,
  selectedDbKeyName,
  selectedDbMetadata,
  token,
  apiEndpoint,
  predefinedQuestions,
  config = {},
  searchBarDraggable = true,
  isTemp = false,
  sqliteConn = null,
}) {
  return (
    <ErrorBoundary>
      <DefogAnalysisAgentStandalone
        analysisTreeManager={selectedDbManager}
        metadata={selectedDbMetadata}
        devMode={false}
        token={token}
        keyName={selectedDbKeyName}
        apiEndpoint={apiEndpoint}
        autoScroll={true}
        sideBarClasses="h-full"
        searchBarClasses={twMerge(
          searchBarDraggable ? "" : "sticky bottom-1",
          "[&_textarea]:pl-2"
        )}
        searchBarDraggable={searchBarDraggable}
        predefinedQuestions={predefinedQuestions}
        config={config}
        isTemp={isTemp}
        sqliteConn={sqliteConn}
        showToggle={!isTemp}
      />
    </ErrorBoundary>
  );
}
