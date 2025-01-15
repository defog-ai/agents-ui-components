"use client";
import { useContext, useEffect, useState } from "react";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { SpinningLoader } from "@ui-components";
import {
  addStepAnalysisToLocalStorage,
  getStepAnalysisFromLocalStorage,
} from "../../../utils/utils";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { AgentConfigContext } from "../../../context/AgentContext";

export default function StepResultAnalysis({
  stepId,
  keyName,
  question,
  data_csv,
  apiEndpoint,
  sql,
}) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");

  const agentConfigContext = useContext(AgentConfigContext);
  const { hideRawAnalysis } = agentConfigContext.val;

  const [loading, setLoading] = useState(false);

  async function analyseData() {
    try {
      let analysis = getStepAnalysisFromLocalStorage(stepId);

      if (!analysis) {
        setLoading(true);
        // fetch from backend
        const urlToConnect = setupBaseUrl({
          protocol: "ws",
          path: "analyse_data_streaming",
          apiEndpoint: apiEndpoint,
        });

        // prepare data
        const data = {
          question: question,
          data_csv: data_csv,
          sql: sql,
          key_name: keyName,
        };

        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;
        const reconnectDelay = 2000; // 2 seconds

        const connectWebSocket = () => {
          const ws = new WebSocket(urlToConnect);
          let analysisText = "";
          let connectionTimeout;

          // Set connection timeout
          connectionTimeout = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close();
              if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(connectWebSocket, reconnectDelay);
              } else {
                setToolRunAnalysis(
                  "Connection timeout with the websocket server. Please try again."
                );
              }
            }
          }, 10000); // 10 second timeout

          ws.onopen = () => {
            clearTimeout(connectionTimeout);
            ws.send(JSON.stringify(data));
          };

          ws.onmessage = (event) => {
            setLoading(false);
            const message = event.data;
            if (message === "Defog data analysis has ended") {
              ws.close();
              addStepAnalysisToLocalStorage(stepId, analysisText);
            } else {
              analysisText += message;
              setToolRunAnalysis(analysisText);
            }
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              setTimeout(connectWebSocket, reconnectDelay);
            } else {
              setToolRunAnalysis(
                "Error connecting to server. Please try again."
              );
            }
          };

          ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              setTimeout(connectWebSocket, reconnectDelay);
            }
          };

          // Cleanup function
          return () => {
            clearTimeout(connectionTimeout);
            if (
              ws.readyState === WebSocket.OPEN ||
              ws.readyState === WebSocket.CONNECTING
            ) {
              ws.close();
            }
          };
        };

        const cleanup = connectWebSocket();
        return cleanup;
      } else {
        setToolRunAnalysis(analysis);
      }
    } catch (error) {
      console.error(error);
      setToolRunAnalysis(
        "An error occurred while analyzing data. Please try again."
      );
    }
  }

  useEffect(() => {
    analyseData();
  }, [data_csv, question]);

  return (
    <div
      style={{ whiteSpace: "pre-wrap" }}
      className="my-3 text-sm text-gray-600 dark:text-gray-300"
    >
      {loading === true ? (
        <>
          <div className="h-96 small flex items-center justify-center code p-4 bg-gray-50 border dark:bg-gray-800">
            <SpinningLoader />
            Loading Analysis
          </div>

          {/* // create three loaders for follow on questions */}
          <div className="p-4">
            <div className="max-w-[600px] m-auto flex flex-row gap-4 justify-center">
              <>
                <div className="text-sm p-2 m-1 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-600 text-gray-300 dark:text-gray-200">
                  <SpinningLoader /> Loading
                </div>
                <div className="text-sm p-2 m-1 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-600 text-gray-300 dark:text-gray-200">
                  <SpinningLoader /> Loading
                </div>
                <div className="text-sm p-2 m-1 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-600 text-gray-300 dark:text-gray-200">
                  <SpinningLoader /> Loading
                </div>
              </>
            </div>
          </div>
        </>
      ) : (
        <>
          {toolRunAnalysis ? (
            <ErrorBoundary customErrorMessage={toolRunAnalysis}>
              {hideRawAnalysis ? (
                <div
                  className="text-sm text-gray-600 dark:text-gray-300 border analysis-markdown"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(marked(toolRunAnalysis)),
                  }}
                />
              ) : (
                <div
                  className="text-sm text-gray-600 dark:text-gray-300 analysis-markdown"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(marked(toolRunAnalysis)),
                  }}
                />
              )}
            </ErrorBoundary>
          ) : null}
        </>
      )}
    </div>
  );
}
