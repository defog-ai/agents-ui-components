import { useContext, useSyncExternalStore } from "react";
import { OracleEmbedContext } from "../OracleEmbedContext";
import { twMerge } from "tailwind-merge";
import { statusDescriptions } from "./oracleSearchBarManager";

export const OracleSearchBarModeHeader = ({ selectedItem }) => {
  const { searchBarManager } = useContext(OracleEmbedContext);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  return (
    <div
      className={twMerge(
        "text-lg dark:text-gray-200 font-light mb-0"
        // draft.status !== "blank" ? "h-0 mb-0 overflow-hidden opacity-0" : "",
        // selectedItem?.itemType === "query-data" ? "text-sm mb-0" : ""
      )}
    >
      {selectedItem?.itemType === "query-data"
        ? "Ask a follow on question"
        : statusDescriptions[draft.status]}
    </div>
  );
};
