import { SpinningLoader } from "@ui-components";

export function LoadingState() {
  return (
    <div
      className={
        "w-full h-full min-h-60 flex flex-col justify-center items-center text-center rounded-md p-2 bg-white dark:bg-gray-800"
      }
    >
      <div className="mb-2 text-sm text-gray-400 dark:text-gray-200">
        <SpinningLoader classNames="w-5 h-5" />
        Loading
      </div>
    </div>
  );
}