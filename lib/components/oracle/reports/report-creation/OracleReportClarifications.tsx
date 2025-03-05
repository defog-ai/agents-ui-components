import { Button, MessageManagerContext, SpinningLoader } from "@ui-components";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ClarificationItem, ClarificationObject } from "./ClarificationItem";
import {
  generateReport,
  getClarifications,
  ORACLE_REPORT_STATUS,
} from "@oracle";
import { OracleEmbedContext } from "../../embed/OracleEmbedContext";
import { OracleSearchBar } from "../../embed/search-bar/OracleSearchBar";
import { statusDescriptions } from "../../embed/search-bar/oracleSearchBarManager";

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
export function OracleReportClarifications({
  dbName,
  onReportGenerated,
}: {
  dbName: string;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
  }) => void;
}) {
  const { apiEndpoint, token, searchBarManager } =
    useContext(OracleEmbedContext);

  const [loading, setLoading] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const message = useContext(MessageManagerContext);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      loadingStatus.current = "Submitting report for generation...";

      // prepare either for success or a new error message
      setErrorMessage("");

      try {
        // This will always error because of a 10ms timeout
        await generateReport(
          apiEndpoint,
          token,
          dbName,
          reportId,
          textAreaRef.current?.value || draft.userQuestion,
          draft.clarifications?.filter((c) => c.answer && c.is_answered) || [],
          // Add websearch parameter
          draft.useWebsearch
        );
      } catch (error) {
        message.success("Report submitted for generation");
        onReportGenerated({
          userQuestion: textAreaRef.current?.value || draft.userQuestion,
          reportId: reportId,
          status: ORACLE_REPORT_STATUS.THINKING,
        });
      }

      // clear everything
      searchBarManager.resetDraft();
      loadingStatus.current = "";
      textAreaRef.current.value = "";
    } catch (error) {
      setErrorMessage(`Error generating report: ${error}`);

      // also use message for this error because user is usually scrolled down to the bottom when they click "generate"
      message.error(`Error generating report: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [draft, apiEndpoint, token, dbName, reportId, onReportGenerated, message]);

  return (
    <div className="w-full overflow-auto flex flex-col items-start justify-center m-auto">
      <div className="text-lg dark:text-gray-200 font-light">
        {statusDescriptions[draft.status]}
      </div>
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
              className="bg-gray-600 text-white border-0 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
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
