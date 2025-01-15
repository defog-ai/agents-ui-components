import { twMerge } from "tailwind-merge";
import { sentenceCase } from "../../utils/utils";
import { AnalysisTreeNode } from "./analysisTreeManager";

export function AnalysisTreeItem({
  analysis = null,
  activeAnalysisId = null,
  extraClasses = "",
  isDummy = false,
  onClick = (...args) => {},
}: {
  analysis?: AnalysisTreeNode | null;
  activeAnalysisId?: string | null;
  extraClasses?: string;
  isDummy?: boolean;
  onClick?: (analysis: AnalysisTreeNode | null) => void;
}) {
  const isActive = analysis && activeAnalysisId === analysis.analysisId;

  return (
    <div
      className={twMerge(
        "flex flex-row items-center dark:text-gray-300",

        isDummy
          ? "dummy-analysis border-l-4 bg-gray-100 dark:bg-gray-800 border-l-blue-500 text-blue-500 m-0"
          : analysis && analysis.analysisId && "border-b border-gray-100 dark:border-gray-800",
        extraClasses
      )}
    >
      <div className="grow">
        <div
          className={twMerge(
            "title hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item p-2 text-sm",
            isActive ? "font-medium bg-gray-100 dark:bg-gray-800 border-l-2 border-l-blue-500" : ""
          )}
          onClick={() => {
            onClick(analysis);
          }}
        >
          {isDummy ? "New" : sentenceCase(analysis?.user_question)}
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
