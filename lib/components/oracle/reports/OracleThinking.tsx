import React, { useEffect, useState, useRef, useContext } from "react";
import { Button, MessageManagerContext, SpinningLoader } from "@ui-components";

import OracleThinkingSQLCard, {
  ThinkingStepSQL,
} from "./OracleThinkingSQLCard";
import OracleThinkingCardSearch, {
  ThinkingStep,
} from "./OracleThinkingCardSearch";
import OracleThinkingCardPDF from "./OracleThinkingCardPDF";
import OracleThinkingCardCodeInterpreter from "./OracleThinkingCardCodeInterpreter";
import OracleThinkingCardThinkTool from "./OracleThinkingCardThinkTool";

type OracleThinkingProps = {
  apiEndpoint: string;
  token: string;
  reportId: string;
  onDelete: () => void;
  onStreamClosed?: (
    thinkingSteps: (ThinkingStep | ThinkingStepSQL)[],
    hadError: boolean
  ) => void;
};

const sep = "\n\n------\n\n";

export function OracleThinking({
  apiEndpoint,
  token,
  reportId,
  onStreamClosed = () => {},
  onDelete = () => {},
}: OracleThinkingProps) {
  const [thinkingSteps, setThinkingSteps] = useState<
    (ThinkingStep | ThinkingStepSQL)[]
  >([]);
  const [streamClosed, setStreamClosed] = useState(false);

  const thinkingStepsRef = useRef(thinkingSteps);
  thinkingStepsRef.current = thinkingSteps;

  const message = useContext(MessageManagerContext);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const closeStream = (
      reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
      hasError: boolean = false
    ) => {
      controller.abort();
      reader?.releaseLock();
      setStreamClosed(true);
      onStreamClosed(thinkingStepsRef.current, hasError);
    };

    async function fetchThinkingStream() {
      try {
        const response = await fetch(
          `${apiEndpoint}/oracle/get_report_thinking_status?report_id=${reportId}`,
          {
            headers: {
              "X-Auth-Token": token,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          console.error("Stream request failed:", response.status);
          setStreamClosed(true);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.error("No reader found on response body.");
          setStreamClosed(true);
          return;
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream ended from server.");
            break;
          }

          const newThinkingSteps: ThinkingStep[] = [];
          buffer += decoder.decode(value, { stream: true });

          /**
           * Why we reset thinking steps everytime:
           * Sometimes a long json comes in as a "split" chunk and we need to append both the chunks together to parse it correctly.
           * We keep adding to this buffer, re parsing it, and resetting the thinking steps state everytime.
           * It's not really the most performant way to do it, but it doesn't cause any perceived performance issues.
           */
          const stepStrings = buffer.split(sep);

          for (const stepString of stepStrings) {
            const dataStr = stepString.replace("data:", "").trim();
            if (!dataStr) continue;

            // Handle stream closure messages
            if (dataStr === "Stream closed without errors") {
              console.log("[Stream Event] 'Stream closed' received.");
              closeStream(reader);
              return;
            } else if (dataStr === "Stream closed with errors") {
              closeStream(reader, true);
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.error) {
                message.error(
                  "Could not generate report. Error: " + parsed.error
                );
                closeStream(reader, true);
                return;
              }

              if (Array.isArray(parsed)) {
                newThinkingSteps.push(...parsed);
              } else {
                newThinkingSteps.push(parsed);
              }
            } catch (err) {
              console.warn("Failed to parse SSE data:", err);
            }
          }

          setThinkingSteps(newThinkingSteps);
        }

        setStreamClosed(true);
      } catch (err) {
        if (!isCancelled) {
          console.error("[Stream Error]", err);
        }
        setStreamClosed(true);
      }
    }

    fetchThinkingStream();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [apiEndpoint, token, reportId]);

  return (
    <div className="relative p-2 overflow-auto">
      <div className="flex flex-row w-full items-center mb-4 mt-4">
        <h1 className="text-xl font-bold grow dark:text-dark-text-primary">
          Details
        </h1>
        <Button variant="danger" className="self-end" onClick={onDelete}>
          Delete
        </Button>
      </div>

      {!streamClosed && (
        <div className="w-full h-40 bg-white dark:bg-gray-800 rounded-md border flex items-center justify-center gap-2">
          <SpinningLoader classNames="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Creating SQL queries and searching the web to answer your question.
            I will show my thinking below. The report will automatically load
            when I am done thinking.
          </span>
        </div>
      )}

      {/* For each step, render our OracleStepCard */}
      <div className="w-full">
        {thinkingSteps
          .filter((step) => {
            // Skip steps with error in the result
            if (typeof step.result === "object" && step.result?.error) {
              return false;
            }
            return true;
          })
          .reverse()
          .map((step) => (
            <div
              key={step.id}
              className="w-full md:w-1/2 p-2 inline-block align-top transition-all duration-500 ease-in-out"
            >
              {step.function_name === "text_to_sql_tool" ? (
                // @ts-ignore
                <OracleThinkingSQLCard step={step} />
              ) : step.function_name === "web_search_tool" ? (
                // @ts-ignore
                <OracleThinkingCardSearch step={step} />
              ) : step.function_name === "pdf_citations_tool" ? (
                // @ts-ignore
                <OracleThinkingCardPDF step={step} />
              ) : step.function_name === "code_interpreter_tool" ? (
                // @ts-ignore
                <OracleThinkingCardCodeInterpreter step={step} />
              ) : step.function_name === "think_tool" ? (
                // @ts-ignore
                <OracleThinkingCardThinkTool step={step} />
              ) : null}
            </div>
          ))}
      </div>
    </div>
  );
}
