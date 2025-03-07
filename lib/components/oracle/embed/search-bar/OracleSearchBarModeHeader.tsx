import { useContext, useSyncExternalStore, useState, useEffect } from "react";
import { OracleEmbedContext } from "../OracleEmbedContext";
import { twMerge } from "tailwind-merge";
import { statusDescriptions } from "./oracleSearchBarManager";
import { KEYMAP } from "../../../../../lib/constants/keymap";
import { KeyboardShortcutIndicator } from "../../../../../lib/components/core-ui/KeyboardShortcutIndicator";

export const OracleSearchBarModeHeader = ({ selectedItem }) => {
  const { searchBarManager } = useContext(OracleEmbedContext);
  const [isMac, setIsMac] = useState(false);
  
  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  return (
    <div
      className={twMerge(
        "text-lg dark:text-gray-200 font-light mb-0 flex items-center justify-between"
      )}
    >
      <div>
        {selectedItem?.itemType === "query-data"
          ? "Ask a follow on question"
          : statusDescriptions[draft.status]}
      </div>
      
      {!selectedItem?.itemType && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
          <span className="mr-2">Current mode: {draft.mode === "query-data" ? "Fast analysis" : "Deep research"}</span>
          <KeyboardShortcutIndicator 
            keyValue={KEYMAP.TOGGLE_MODE}
            meta={true}
            className="px-1"
          />
        </div>
      )}
    </div>
  );
};
