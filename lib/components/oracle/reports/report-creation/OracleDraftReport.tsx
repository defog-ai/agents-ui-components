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

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
export function OracleDraftReport({
  dbName,
  onReportGenerated,
  onClarified = () => {},
}: {
  dbName: string;
  onClarified?: (newDbName?: string) => void;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
    newDbName?: string;
  }) => void;
}) {
  const { apiEndpoint, token, searchBarManager } =
    useContext(OracleEmbedContext);

  const [loading, setLoading] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const [clarificationStarted, setClarificationStarted] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const newDbName = useRef<string | null>(null);
  const newDbInfo = useRef<DbInfo | null>(null);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

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
          newDbName.current || dbName,
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
          newDbName: newDbName.current,
        });
      }

      // clear everything
      searchBarManager.setDraft({
        useWebsearch: true,
        uploadedPDFs: [],
      });
      setClarificationStarted(false);
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
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto gap-10">
        {!loading && draft.clarifications && (
          <div className="my-4 max-w-2xl">
            <div className="font-light mb-2 dark:text-gray-300">
              Add Details
            </div>
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
    </div>
  );
}
