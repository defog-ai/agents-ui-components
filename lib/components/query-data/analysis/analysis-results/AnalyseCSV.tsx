"use client";
import { useEffect, useState } from "react";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { SpinningLoader } from "@ui-components";
import {
  addStepAnalysisToLocalStorage,
  getStepAnalysisFromLocalStorage,
} from "@utils/utils";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { createWebsocketManager } from "../../../utils/websocket-manager";
import { Sparkles } from "lucide-react";

export function AnalyseCSV({
  projectName,
  analysisId,
  question,
  data_csv,
  apiEndpoint,
  sql,
  token,
}) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");

  const [loading, setLoading] = useState(false);

  // fetch from backend
  const urlToConnect = setupBaseUrl({
    protocol: "ws",
    path: "analyse_data_streaming",
    apiEndpoint: apiEndpoint,
  });

  useEffect(() => {
    let analysis = getStepAnalysisFromLocalStorage(analysisId);
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
            addStepAnalysisToLocalStorage(analysisId, curr);
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
          db_name: projectName,
          token: token,
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
    <div className="relative h-full">
      {/* Header */}
      <div className="pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 text-md dark:text-gray-100">
          Insights{" "}
          <Sparkles className="inline size-4 stroke-secondary-highlight-1" />
        </h3>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 h-[400px] rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <SpinningLoader classNames="mb-4" />
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Analyzing your data
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This may take a few moments
              </p>
            </div>
          </div>
        ) : toolRunAnalysis ? (
          <ErrorBoundary customErrorMessage={toolRunAnalysis}>
            <div
              className="analysis-markdown max-w-full text-sm break-words
                [&>h1]:text-xl [&>h1]:font-semibold [&>h1]:mb-4 [&>h1]:text-gray-900 [&>h1]:dark:text-gray-100
                [&>h2]:text-lg [&>h2]:font-medium [&>h2]:mb-3 [&>h2]:text-gray-800 [&>h2]:dark:text-gray-200
                [&>p]:mb-4 [&>p]:text-gray-600 [&>p]:dark:text-gray-300 [&>p]:leading-relaxed [&>p]:whitespace-pre-wrap
                [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:text-gray-600 [&>ul]:dark:text-gray-300
                [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>ol]:text-gray-600 [&>ol]:dark:text-gray-300
                [&>blockquote]:border-l-4 [&>blockquote]:border-gray-200 [&>blockquote]:dark:border-gray-700 
                [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4 [&>blockquote]:text-gray-600 [&>blockquote]:dark:text-gray-300"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(marked(toolRunAnalysis)),
              }}
            />
          </ErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
