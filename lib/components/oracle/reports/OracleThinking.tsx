import React, { useEffect, useState, useRef, useContext } from "react";
import { MessageManagerContext, SpinningLoader } from "@ui-components";

import OracleThinkingStepCard, { ThinkingStep } from "./OracleThinkingStepCard";

type OracleThinkingProps = {
  apiEndpoint: string;
  token: string;
  reportId: string;
  onStreamClosed?: (thinkingSteps: ThinkingStep[], hadError: boolean) => void;
};

const sep = "\n\n------\n\n";

export function OracleThinking({
  apiEndpoint,
  token,
  reportId,
  onStreamClosed = () => {},
}: OracleThinkingProps) {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
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
                newThinkingSteps.unshift(...parsed);
              } else {
                newThinkingSteps.unshift(parsed);
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
    <div className="relative p-2">
      <h1 className="text-xl font-bold mb-4">Details</h1>

      {!streamClosed && (
        <div className="w-full h-40 bg-white dark:bg-gray-800 rounded-md border flex items-center justify-center gap-2">
          <SpinningLoader classNames="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      )}

      {/* For each step, render our OracleStepCard */}
      <div className="w-full">
        {thinkingSteps.map((step, idx) => (
          <div key={idx} className="w-full md:w-1/2 p-2 inline-block align-top">
            <OracleThinkingStepCard step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}
