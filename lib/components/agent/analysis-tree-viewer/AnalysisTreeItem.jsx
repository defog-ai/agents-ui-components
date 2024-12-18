import { twMerge } from "tailwind-merge";
import { sentenceCase } from "../../utils/utils";

export function AnalysisTreeItem({
  setActiveAnalysisId,
  setActiveRootAnalysisId,
  setAddToDashboardSelection = (...args) => {},
  analysis = null,
  isActive = false,
  extraClasses = "",
  isDummy = false,
  onClick = () => {},
}) {
  return (
    <div
      className={twMerge(
        "flex flex-row items-center py-1 px-2 mb-2 hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 history-item dark:text-gray-300",
        isActive ? "font-bold bg-gray-200 dark:bg-gray-700" : "",
        isDummy
          ? "dummy-analysis border-l-4 bg-gray-100 dark:bg-gray-800 border-l-blue-500 text-blue-500 p-2 m-0"
          : analysis.analysisId,
        extraClasses
      )}
      onClick={() => {
        setActiveRootAnalysisId(analysis?.rootAnalysisId);
        setActiveAnalysisId(analysis?.analysisId);
        onClick();
      }}
    >
      <div className="grow">
        {isDummy ? "New" : sentenceCase(analysis?.user_question)}
      </div>
      {/* {!isDummy && agentContext.val.allowDashboardAdd && (
        <div
          className="rounded-sm hover:bg-blue-500 p-1 flex justify-center group "
          onClick={() => {
            setActiveAnalysisId(analysis?.analysisId);
            // add this to a dashboard
            setAddToDashboardSelection(analysis);
          }}
        >
          <PlusIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-white" />
        </div>
      )} */}
    </div>
  );
}
