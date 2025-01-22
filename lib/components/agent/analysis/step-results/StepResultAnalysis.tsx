"use client";
import { useContext, useEffect, useRef, useState } from "react";
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
import { createWebsocketManager } from "../../../utils/websocket-manager";

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

  const [loading, setLoading] = useState(false);

  // fetch from backend
  const urlToConnect = setupBaseUrl({
    protocol: "ws",
    path: "analyse_data_streaming",
    apiEndpoint: apiEndpoint,
  });

  useEffect(() => {
    let analysis = getStepAnalysisFromLocalStorage(stepId);
    if (analysis) {
      setToolRunAnalysis(analysis);
      return;
    }

    const ws = createWebsocketManager({
      url: urlToConnect,
      onMessage: (event) => {
        setLoading(false);
        const message = event.data;
        if (message === "Defog data analysis has ended") {
          ws.destroy();
          setToolRunAnalysis((curr) => {
            addStepAnalysisToLocalStorage(stepId, curr);
            return curr;
          });
        } else {
          setToolRunAnalysis((curr) => {
            return curr + message;
          });
        }
      },
      reconnectDelay: 2000,
      reconnectMaxAttempts: 3,
      connectionTimeoutAfter: 10000,
      onTimeout: () => {
        setLoading(false);
        setToolRunAnalysis(
          "Connection timeout with the websocket server. Please try again."
        );
      },
      onOpen: () => {
        setLoading(true);
        // also reset the analysis
        // if we're here means localstorage doesn't contain the analysis for this stepId
        setToolRunAnalysis("");
        ws.send({
          question: question,
          data_csv: data_csv,
          sql: sql,
          key_name: keyName,
        });
      },
      onError: (e) => {
        console.error(e);
        setLoading(false);
        setToolRunAnalysis(
          "An error occurred while analyzing data. Please try again."
        );
      },
    });

    return () => {
      ws.destroy();
    };
  }, []);

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
        </>
      ) : (
        <>
          {toolRunAnalysis ? (
            <ErrorBoundary customErrorMessage={toolRunAnalysis}>
              <div
                className="text-sm text-gray-600 dark:text-gray-300 analysis-markdown"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(marked(toolRunAnalysis)),
                }}
              />
            </ErrorBoundary>
          ) : null}
        </>
      )}
    </div>
  );
}
