import { twMerge } from "tailwind-merge";
import { sentenceCase } from "@utils/utils";
import { NestedAnalysisTreeNode } from "./analysisTreeManager";
import { SquarePen } from "lucide-react";

export function AnalysisTreeItem({
  analysis = null,
  activeAnalysisId = null,
  extraClasses = "",
  isDummy = false,
  onClick = (...args) => {},
}: {
  analysis?: NestedAnalysisTreeNode | null;
  activeAnalysisId?: string | null;
  extraClasses?: string;
  isDummy?: boolean;
  onClick?: (analysis: NestedAnalysisTreeNode | null) => void;
}) {
  const isActive = analysis && activeAnalysisId === analysis.analysisId;

  return (
    <div
      className={twMerge(
        "flex flex-row items-center dark:text-gray-300",

        isDummy
          ? "dummy-analysis m-0 mb-3 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300 rounded-md"
          : analysis && analysis.analysisId && "mb-1",
        extraClasses
      )}
    >
      <div className="grow">
        <div
          className={
            isDummy
              ? "p-3 hover:cursor-pointer flex items-center"
              : twMerge(
                  "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-2 border border-transparent",
                  isActive
                    ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                )
          }
          onClick={() => {
            onClick(isDummy ? null : analysis);
          }}
        >
          {isDummy ? (
            <div className="flex items-center">
              <SquarePen size={18} />{" "}
              <span className="font-medium ml-2">New Report</span>
            </div>
          ) : (
            <>
              <div className="line-clamp-2 font-medium">
                {sentenceCase(analysis?.user_question)}
              </div>
              {analysis?.timestamp && (
                <div className="flex items-center text-xs mt-1.5 text-gray-500 dark:text-gray-400">
                  <span className="inline-block w-3 h-3 mr-1.5 rounded-full bg-blue-200 dark:bg-blue-700"></span>
                  {new Date(analysis.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              )}
            </>
          )}
        </div>
        {!isDummy &&
          analysis &&
          analysis.children &&
          analysis.children.length > 0 && (
            <div className="ml-1">
              {analysis.children.map((child) => (
                <AnalysisTreeItem
                  key={child.analysisId}
                  analysis={child}
                  activeAnalysisId={activeAnalysisId}
                  isDummy={isDummy}
                  extraClasses={"ml-2"}
                  onClick={onClick}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
