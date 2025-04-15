import React, { SyntheticEvent, ReactNode, useMemo } from "react";
import { CreateNewProject } from "../../../common/CreateNewProject";
import { ORACLE_REPORT_STATUS, OracleReport, ReportData } from "@oracle";
import { OracleThinking } from "../../reports/OracleThinking";
import { OracleHistoryItem, QueryDataTree } from "../types";
import ErrorBoundary from "../../../common/ErrorBoundary";
import debounce from "lodash.debounce";
import { AnalysisTreeContentWrapper } from "./AnalysisTreeContentWrapper";

/**
 * Main content area for the Oracle Embed component
 */
export const OracleContent = React.memo(function OracleContent({
  apiEndpoint,
  token,
  selectedItemId,
  selectedItem,
  selectedProjectName,
  uploadNewProjectOption,
  searchBar,
  onReportDelete,
  onReportParsed,
  onThinkingStreamClosed,
  setMostVisibleAnalysisAsActive,
  onProjectCreated,
}: {
  apiEndpoint: string;
  token: string;
  selectedItemId: string;
  selectedItem: OracleHistoryItem;
  selectedProjectName: string;
  uploadNewProjectOption: string;
  searchBar: ReactNode;
  onReportDelete: () => Promise<void>;
  onReportParsed: (data: ReportData) => void;
  onThinkingStreamClosed: (thinkingSteps: any, hadError: boolean) => void;
  setMostVisibleAnalysisAsActive: () => void;
  onProjectCreated: (projectName: string) => void;
}) {
  return (
    <div className="flex flex-col grow p-2 relative min-w-0 overflow-auto">
      {/* Show CreateNewProject when the "Upload new" option is selected */}
      {selectedItemId === null &&
        selectedProjectName === uploadNewProjectOption && (
          <CreateNewProject
            apiEndpoint={apiEndpoint}
            token={token}
            onProjectCreated={onProjectCreated}
          />
        )}

      {/* Show analysis tree for query-data */}
      {selectedItemId && selectedItem && "analysisTree" in selectedItem ? (
        <div
          className="p-4 space-y-4 max-h-full overflow-y-auto pb-48"
          onScroll={useMemo(
            () =>
              debounce((e: SyntheticEvent) => {
                e.stopPropagation();
                setMostVisibleAnalysisAsActive();
              }, 100),
            [setMostVisibleAnalysisAsActive]
          )}
        >
          <ErrorBoundary>
            {Object.keys((selectedItem as QueryDataTree).analysisTree).length >
              0 && (
              <AnalysisTreeContentWrapper
                selectedItem={selectedItem as QueryDataTree}
                selectedProjectName={selectedProjectName}
                token={token}
                apiEndpoint={apiEndpoint}
              />
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
          onReportParsed={onReportParsed}
        />
      ) : selectedItemId ? (
        // Show thinking status for in-progress report
        <OracleThinking
          apiEndpoint={apiEndpoint}
          token={token}
          reportId={selectedItemId}
          onDelete={onReportDelete}
          onStreamClosed={onThinkingStreamClosed}
        />
      ) : null}

      {/* Always show the search bar, but it will transform based on conditions */}
      {searchBar}
    </div>
  );
});
