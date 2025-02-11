import {
  Button,
  MessageManagerContext,
  MultiSelect,
  SpinningLoader,
  TextArea,
} from "@ui-components";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { Command } from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ClarificationItem, ClarificationObject } from "./ClarificationItem";

type QueryTaskType = "exploration" | "";

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
interface ReportDraft {
  userQuestion?: string;
  task_type?: QueryTaskType;
  clarifications?: ClarificationObject[];
}

interface GenerateReportResponse {
  report_id: string;
  status: string;
}

export function OracleDraftReport({
  apiEndpoint,
  apiKeyName,
  token,
  onReportGenerated,
}: {
  apiEndpoint: string;
  apiKeyName: string;
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
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'));
  }, []);

  const message = useContext(MessageManagerContext);

  const getClarifications = useCallback(
    async (userQuestion: string) => {
      if (!token) throw new Error("No token");
      const res = await fetch(
        setupBaseUrl({
          apiEndpoint,
          protocol: "http",
          path: "oracle/clarify_question",
        }),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key_name: apiKeyName,
            token,
            user_question: userQuestion,
            task_type: "exploration",
            answered_clarifications: [],
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to get clarifications");
      const data = await res.json();
      return data.clarifications;
    },
    [apiEndpoint, apiKeyName, token]
  );

  const generateReport = useCallback<
    () => Promise<GenerateReportResponse>
  >(async () => {
    if (!token) throw new Error("No token");

    const res = await fetch(
      setupBaseUrl({
        apiEndpoint,
        protocol: "http",
        path: "oracle/begin_generation",
      }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key_name: apiKeyName,
          token,
          // jic text area has changed.
          // if it's been emptied, use the original question
          user_question: textAreaRef.current?.value || draft.userQuestion,
          sources: [],
          task_type: "exploration",
          clarifications: draft.clarifications.filter(
            (c) => c.answer && c.is_answered
          ),
        }),
      }
    );

    if (!res.ok) throw new Error("Failed to generate report");

    return await res.json();
  }, [draft]);

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    loadingStatus.current = "Submitting report for generation...";
    try {
      const { report_id, status } = await generateReport();

      onReportGenerated(
        textAreaRef.current?.value || draft.userQuestion,
        report_id,
        status
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
  }, [draft, generateReport]);

  return (
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto">
        <TextArea
          ref={textAreaRef}
          rootClassNames="w-full"
          textAreaClassNames="rounded-xl"
          suffix={
            <span className="flex items-center">
              Press {isMac ? (
                <>
                  <Command className="inline w-2.5 mx-1" /> + Enter
                </>
              ) : (
                'Ctrl + Enter'
              )} to start
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
                loadingStatus.current = "Thinking...";
                setDraft((prev) => ({
                  ...prev,
                  userQuestion: question,
                }));
                const clarifications = await getClarifications(question);
                setDraft((prev) => ({
                  ...prev,
                  clarifications,
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
            <div className="prose text-lg font-light">
              Could you please answer the following questions?
            </div>
            <div className="space-y-6">
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
                />
              ))}
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
