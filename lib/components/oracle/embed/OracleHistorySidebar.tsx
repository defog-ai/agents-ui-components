import React from "react";
import { Sidebar } from "@ui-components";
import { twMerge } from "tailwind-merge";
import { SquarePen } from "lucide-react";
import { ORACLE_REPORT_STATUS } from "@oracle";
import {
  OracleHistory,
  OracleHistoryItem,
  OracleReportType,
  QueryDataTree,
} from "./types";
import { AnalysisTreeItem } from "../../../../lib/components/query-data/analysis-tree-viewer/AnalysisTreeItem";
import KeyboardShortcutIndicator from "../../core-ui/KeyboardShortcutIndicator";
import { KEYMAP } from "../../../constants/keymap";

interface OracleHistorySidebarProps {
  oracleHistory: OracleHistory;
  selectedProjectName: string;
  uploadNewProjectOption: string;
  selectedItemId: string | null;
  updateUrlWithItemId: (itemId: string | number | null) => void;
  projectSelector: React.ReactNode;
  setSelectedItem: (item: OracleHistoryItem | null) => void;
}

export const OracleHistorySidebar: React.FC<OracleHistorySidebarProps> = React.memo(({
  oracleHistory,
  selectedProjectName,
  uploadNewProjectOption,
  selectedItemId,
  updateUrlWithItemId,
  projectSelector,
  setSelectedItem,
}) => {
  return (
    <Sidebar
      open={true}
      beforeTitle={projectSelector}
      location="left"
      rootClassNames="absolute left-0 h-full shadow-lg lg:shadow-none lg:sticky top-0 bg-gray-50 dark:bg-gray-800 z-20 border-r border-gray-100 dark:border-gray-700"
      title={
        <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-lg flex items-center">
          <span className="mr-2">📚</span> History
        </h2>
      }
      contentClassNames="p-5 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      resizable={true}
      minWidth={200}
      maxWidth={500}
      defaultWidth={288} // 288px = w-72 default width
    >
      <div className="space-y-4">
        {selectedProjectName !== uploadNewProjectOption ? (
          <div
            className={twMerge(
              "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-3 flex items-center border border-transparent",
              !selectedItemId
                ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
            )}
            onClick={() => {
              updateUrlWithItemId(null);
              setSelectedItem(null);
            }}
          >
            <div className="flex flex-row items-center gap-2">
              <SquarePen size={18} />
              <span className="font-medium">New Report</span>
              <KeyboardShortcutIndicator
                keyValue={KEYMAP.NEW_QUESTION}
                meta={true}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs">Upload a new CSV/Excel file on the right</p>
        )}
        {selectedProjectName !== uploadNewProjectOption &&
          oracleHistory[selectedProjectName] &&
          Object.entries(oracleHistory[selectedProjectName]).map(
            ([group, reports]) => {
              if (!reports || Object.keys(reports).length === 0) return null; // Skip empty groups
              return (
                <div key={group} className="mb-6">
                  <div className="px-2 mb-3 text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400 uppercase flex items-center">
                    <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow mr-2"></div>
                    {group}
                    <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow ml-2"></div>
                  </div>
                  {reports.map((item: OracleHistoryItem) => {
                    // Determine if this is a report or analysis tree
                    const isReport = item.itemType === "report";
                    const itemId = item.itemId;
                    const title = isReport
                      ? (item as OracleReportType).report_name ||
                        (item as OracleReportType).inputs?.user_question ||
                        "Untitled report"
                      : ((item as QueryDataTree).analysisTree &&
                          Object.values((item as QueryDataTree).analysisTree)[0]
                            ?.root?.user_question) ||
                        "Untitled analysis";

                    // if (isReport) {
                    return (
                      <div
                        key={itemId}
                        onClick={() => {
                          updateUrlWithItemId(itemId);
                          setSelectedItem(item);
                        }}
                        className={twMerge(
                          "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-2 border border-transparent",
                          String(itemId) === String(selectedItemId)
                            ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                            : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                        )}
                      >
                        {/* Use max-height transition for smooth expansion on hover */}
                        <div className="overflow-hidden transition-all duration-300 hover:max-h-[500px]">
                          <p className="font-medium hover:line-clamp-none line-clamp-2">
                            {title}
                          </p>
                        </div>
                        <div className="flex items-center text-xs mt-1.5 text-gray-500 dark:text-gray-400">
                          <span
                            className={`inline-block w-3 h-3 mr-1.5 rounded-full ${
                              isReport
                                ? (item as OracleReportType).status ===
                                  ORACLE_REPORT_STATUS.DONE
                                  ? "bg-blue-200 dark:bg-blue-800"
                                  : (item as OracleReportType).status ===
                                      ORACLE_REPORT_STATUS.THINKING
                                    ? "bg-green-300 dark:bg-green-600"
                                    : (item as OracleReportType).status ===
                                        ORACLE_REPORT_STATUS.ERRORED
                                      ? "bg-red-200 dark:bg-red-800"
                                      : "bg-blue-200 dark:bg-blue-800"
                                : "bg-yellow-200 dark:bg-yellow-800" // Analysis type
                            }`}
                            title={`Type: ${isReport ? "Report" : "Analysis"}`}
                          ></span>
                          {new Date(item.date_created + "Z").toLocaleString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </div>
                      </div>
                    );
                    // } else {
                    //   const nestedTree = item.treeManager?.getNestedTree();

                    //   return (
                    //     <AnalysisTreeItem
                    //       onClick={() => {
                    //         updateUrlWithItemId(itemId);
                    //         setSelectedItem(item);
                    //       }}
                    //       analysis={nestedTree[item.itemId]}
                    //       activeAnalysisId={item.itemId}
                    //     />
                    //   );
                    // }
                  })}
                </div>
              );
            }
          )}
      </div>
    </Sidebar>
  );
});
