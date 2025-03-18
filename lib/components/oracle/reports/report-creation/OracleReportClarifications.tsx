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
export function OracleReportClarifications() {
  const { searchBarManager } = useContext(OracleEmbedContext);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  return (
    <div className="w-full flex flex-col items-start relative justify-center m-auto antialiased z-[25]">
      {draft.clarifications && (
        <div className="w-full max-w-4xl">
          <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
}
