"use client";
import { useContext, useEffect, useState } from "react";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { SpinningLoader, Tabs } from "@ui-components";
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
  setCurrentQuestion = (...args) => {},
}) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");

  const agentConfigContext = useContext(AgentConfigContext);
  const { hideRawAnalysis } = agentConfigContext.val;

  const [loading, setLoading] = useState(false);
  const [followOnQuestions, setFollowOnQuestions] = useState([]);

  async function analyseData() {
    try {
      let analysis = getStepAnalysisFromLocalStorage(stepId);

      if (!analysis) {
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

        // open a websocket connection
        const ws = new WebSocket(urlToConnect);

        // listen to messages
        let analysis = "";
        ws.onmessage = (event) => {
          const message = event.data;
          analysis += message;
          setToolRunAnalysis(analysis);
          if (message === "Defog data analysis has ended") {
            ws.close();
            addStepAnalysisToLocalStorage(stepId, analysis);
            return;
          }
        };

        // send data to the server
        ws.onopen = () => {
          ws.send(JSON.stringify(data));
        };
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function generateFollowOnQuestions() {
    try {
      const urlToConnect = setupBaseUrl({
        protocol: "http",
        path: "generate_follow_on_questions",
        apiEndpoint: apiEndpoint,
      });

      // send data to the server
      const data = {
        user_question: question,
        key_name: keyName,
      };

      const response = await fetch(urlToConnect, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Error generating follow on questions");
      } else {
        const responseJson = await response.json();
        setFollowOnQuestions(responseJson["follow_on_questions"] || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    analyseData();
    generateFollowOnQuestions();
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
                <Tabs
                  size="small"
                  defaultSelected="Formatted"
                  contentClassNames="h-96 overflow-y-scroll bg-gray-50 border dark:bg-gray-800"
                  tabs={[
                    {
                      name: "Formatted",
                      classNames: "bg-gray-50 dark:bg-gray-800",
                      content: (
                        <div
                          className="text-sm text-gray-600 dark:text-gray-300 analysis-markdown"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(marked(toolRunAnalysis)),
                          }}
                        />
                      ),
                    },
                    {
                      name: "Raw",
                      classNames: "bg-gray-50 dark:bg-gray-800",
                      content: (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {toolRunAnalysis}
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </ErrorBoundary>
          ) : null}

          {/* show buttons for follow on questions */}
          <div className="p-4">
            <div className="max-w-[600px] m-auto flex flex-row gap-4 justify-center">
              {followOnQuestions &&
                followOnQuestions.length &&
                followOnQuestions.map((followOnQuestion, index) => (
                  <button
                    key={index}
                    data-testid="follow-on-question"
                    className="grow basis-1 cursor-pointer text-sm p-2 m-1 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    onClick={() => {
                      console.log(
                        "clicked on follow on question",
                        followOnQuestion
                      );
                      setCurrentQuestion(followOnQuestion);
                    }}
                  >
                    {followOnQuestion}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
