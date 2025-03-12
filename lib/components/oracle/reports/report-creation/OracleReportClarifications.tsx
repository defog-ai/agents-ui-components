import { Button, MessageManagerContext, SpinningLoader } from "@ui-components";
import { useContext, useRef, useState, useSyncExternalStore } from "react";
import { ClarificationItem } from "./ClarificationItem";
import { OracleEmbedContext } from "../../embed/OracleEmbedContext";
import { statusDescriptions } from "../../embed/search-bar/oracleSearchBarManager";

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
export function OracleReportClarifications({
  handleGenerateReport,
}: {
  handleGenerateReport: () => void;
}) {
  const { searchBarManager } = useContext(OracleEmbedContext);

  const [loading, setLoading] = useState<boolean>(false);
  const loadingStatus = useRef<string>("");

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  return (
    <div className="w-full overflow-auto flex flex-col items-start relative justify-center m-auto">
      {/* <div className="text-lg dark:text-gray-200 font-light">
        {statusDescriptions[draft.status]}
      </div> */}
      {!loading && draft.clarifications && (
        <div className="my-4 w-full max-w-4xl">
          <div className="space-y-6">
            <div className="space-y-2">
              {draft.clarifications.map((obj, idx) => (
                <ClarificationItem
                  {...obj}
                  key={idx + obj.clarification}
                  onAnswerChange={(answer) => {
                    searchBarManager.setDraft((prev) => ({
                      ...prev,
                      clarifications: prev.clarifications.map((d, i) => {
                        if (i === idx) {
                          return {
                            ...d,
                            answer,
                            is_answered: !answer
                              ? false
                              : typeof answer === "string"
                                ? Boolean(answer)
                                : answer.length > 0,
                          };
                        }
                        return d;
                      }),
                    }));
                  }}
                  onDismiss={() => {
                    searchBarManager.setDraft((prev) => ({
                      ...prev,
                      clarifications: prev.clarifications.filter(
                        (_, i) => i !== idx
                      ),
                    }));
                  }}
                />
              ))}
            </div>
            <Button
              className="bg-gray-600 text-white border-0 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-600"
              onClick={handleGenerateReport}
            >
              {loading ? loadingStatus.current : "Generate"}
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="w-full text-sm text-gray-400 dark:text-gray-500 relative flex items-start rounded-xl">
          <SpinningLoader></SpinningLoader>
          {loadingStatus.current}
        </div>
      )}
    </div>
  );
}
