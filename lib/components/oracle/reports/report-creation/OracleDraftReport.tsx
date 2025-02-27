import {
  Button,
  MessageManagerContext,
  SpinningLoader,
  TextArea,
} from "@ui-components";
import { Command } from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ClarificationItem, ClarificationObject } from "./ClarificationItem";
import {
  generateReport,
  getClarifications,
  getSources,
  ORACLE_REPORT_STATUS,
  SourceItem,
} from "@oracle";
import { SourceCard } from "./SourceItem";

type QueryTaskType = "exploration" | "";

interface SourceItemWithSelection extends SourceItem {
  selected: boolean;
}
interface ReportDraft {
  userQuestion?: string;
  task_type?: QueryTaskType;
  clarifications?: ClarificationObject[];
  sources?: SourceItemWithSelection[];
}

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
export function OracleDraftReport({
  apiEndpoint,
  dbName,
  token,
  onReportGenerated,
}: {
  apiEndpoint: string;
  dbName: string;
  token: string;
  onReportGenerated?: (
    userQuestion: string,
    reportId: string,
    status: string
  ) => void;
}) {
  const [draft, setDraft] = useState<ReportDraft>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  const message = useContext(MessageManagerContext);

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      loadingStatus.current = "Submitting report for generation...";
      try {
        // This will always error because of a 10ms timeout
        await generateReport(
          apiEndpoint,
          token,
          dbName,
          reportId,
          textAreaRef.current?.value || draft.userQuestion,
          draft.sources.filter((s) => s.selected).map((s) => s.link),
          draft.clarifications.filter((c) => c.answer && c.is_answered)
        );
      } catch (error) {
        message.success("Report submitted for generation");
      }

      onReportGenerated(
        textAreaRef.current?.value || draft.userQuestion,
        reportId,
        ORACLE_REPORT_STATUS.THINKING
      );

      message.success("Submitted. Your report is generating");

      // clear everything
      setDraft({});
      loadingStatus.current = "";
      textAreaRef.current.value = "";
    } catch (error) {
      message.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
    setLoading(false);
  }, [draft]);

  return (
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto">
        <TextArea
          ref={textAreaRef}
          rootClassNames="w-full"
          textAreaClassNames="rounded-xl"
          suffix={
            <span className="flex items-center">
              Press{" "}
              {isMac ? (
                <>
                  <Command className="inline w-2.5 mx-1" /> + Enter
                </>
              ) : (
                "Ctrl + Enter"
              )}{" "}
              to start
            </span>
          }
          disabled={loading}
          label={
            <div className="text-lg">What would you like a report on?</div>
          }
          placeholder="Type here"
          autoResize={true}
          defaultRows={1}
          textAreaHtmlProps={{ style: { resize: "none" } }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              const question = e.currentTarget.value;
              try {
                setLoading(true);
                loadingStatus.current =
                  "Analyzing database and thinking if I need to ask clarifying questions...";
                setDraft((prev) => ({
                  ...prev,
                  userQuestion: question,
                }));

                // const [clarifications, sources] = await Promise.all([
                //   getClarifications(apiEndpoint, token, dbName, question),
                //   getSources(apiEndpoint, token, dbName, question),
                // ]).catch((e) => {
                //   throw new Error("Error getting sources and clarifications");
                // });

                const { clarifications, report_id } = await getClarifications(
                  apiEndpoint,
                  token,
                  dbName,
                  question
                );

                setReportId(report_id);

                setDraft((prev) => ({
                  ...prev,
                  clarifications,
                  // sources: (sources || []).map((s) => ({
                  //   ...s,
                  //   selected: false,
                  // })),
                  sources: [],
                }));
              } catch (e) {
                message.error("Error getting clarifications");
              } finally {
                setLoading(false);
              }
            }
          }}
        />

        {!loading && draft.clarifications && draft.clarifications.length && (
          <div className="my-4 max-w-2xl">
            <div className="font-light mb-2">Add Details & Sources</div>
            <div className="space-y-6">
              {draft.sources?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-light text-sm">Sources</div>
                  <div className="bg-white dark:bg-gray-800 flex w-full flex-col pl-1">
                    <div className="flex w-full items-center overflow-x-scroll gap-6 pb-3">
                      {draft.sources.map((source, i) => (
                        <SourceCard
                          source={source}
                          key={i}
                          onSelected={() => {
                            const newSources = draft.sources.slice();
                            newSources[i].selected = !newSources[i].selected;
                            setDraft((prev) => ({
                              ...prev,
                              sources: newSources,
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="font-light text-sm">Details</div>
                {draft.clarifications.map((obj, idx) => (
                  <ClarificationItem
                    {...obj}
                    key={idx + obj.clarification}
                    onAnswerChange={(answer) => {
                      setDraft((prev) => ({
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
                      setDraft((prev) => ({
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
                className="bg-gray-600 text-white border-0"
                onClick={handleGenerateReport}
              >
                {loading ? loadingStatus.current : "Generate"}
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="w-full text-sm text-gray-400 relative flex items-start rounded-xl">
            <SpinningLoader></SpinningLoader>
            {loadingStatus.current}
          </div>
        )}
      </div>
    </div>
  );
}
