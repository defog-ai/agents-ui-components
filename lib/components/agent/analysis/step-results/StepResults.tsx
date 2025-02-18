import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StepResultsTable } from "./StepResultsTable";
import { StepError } from "./StepError";
import { StepInputs } from "./StepInputs";

import { StepReRun } from "./StepReRun";
import AgentLoader from "../../../common/AgentLoader";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { toolDisplayNames } from "@utils/utils";
import { Tabs } from "../../../core-ui/Tabs";

import { AgentConfigContext } from "../../../context/AgentContext";
import { SkeletalLoader } from "@ui-components";
import SQLFeedback from "./SQLFeedback";
import StepFollowOn from "./StepFollowOn";
import { CodeEditor } from "./CodeEditor";
import type { AnalysisTreeManager } from "../../analysis-tree-viewer/analysisTreeManager";
import { AnalysisData, ParsedOutput, Step } from "../analysisManager";
import { Database } from "lucide-react";
import React from "react";
const toolIcons = {
  data_fetcher_and_aggregator: Database,
};

export function StepResults({
  analysisId,
  analysisData,
  step,
  keyName,
  token,
  apiEndpoint,
  handleReRun = (...args: any[]) => {},
  reRunningSteps = [],
  updateStepData = (...args: any[]) => {},
  analysisBusy = false,
  setCurrentQuestion = (...args: any[]) => {},
  analysisTreeManager = null,
}: {
  analysisId: string;
  analysisData: AnalysisData;
  step: Step;
  keyName: string;
  token: string;
  apiEndpoint: string;
  handleReRun: (...args: any[]) => void;
  reRunningSteps: Step[];
  updateStepData: (stepId: string, update: Record<string, any>) => void;
  analysisBusy: boolean;
  setCurrentQuestion: (...args: any[]) => void;
  analysisTreeManager: AnalysisTreeManager;
}) {
  const agentConfigContext = useContext(AgentConfigContext);
  const { hideSqlTab } = agentConfigContext.val;
  const parsedOutputs = useMemo<{ [key: string]: ParsedOutput }>(() => {
    return (
      analysisData?.gen_steps?.steps?.find((s) => s.id === step.id)
        ?.parsedOutputs || {}
    );
  }, [step, analysisData]);

  const stepId = step.id;

  const handleEdit = useCallback(
    ({ analysis_id, step_id, update_prop, new_val }) => {
      if (!step_id) return;
      if (!analysis_id) return;
      if (!update_prop) return;
      if (step_id !== stepId) return;

      // edit this in the context too
      updateStepData(stepId, {
        [update_prop]: new_val,
      });
    },
    [stepId]
  );

  const tabs = useMemo(() => {
    return [
      {
        name: "SQL/Code",
        content: (
          <ErrorBoundary maybeOldAnalysis={true}>
            {step?.error_message && (
              <StepError error_message={step?.error_message}></StepError>
            )}
            <div className="flex ">
              <div className="w-full">
                {/* Header Section */}
                <div className="flex items-center gap-2 mb-6 ">
                  {toolIcons[step.tool_name] && (
                    <span className="text-gray-500 size-4">
                      {React.createElement(toolIcons[step.tool_name], {
                        size: 16,
                        className: "text-gray-500",
                      })}
                    </span>
                  )}
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                    {toolDisplayNames[step.tool_name]}
                  </p>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Left Column - Input & Filters */}
                  <div className="space-y-6">
                    {/* Inputs Section */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase">
                        Inputs
                      </h3>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <StepInputs
                          analysisId={analysisId}
                          stepId={stepId}
                          step={step}
                          handleEdit={handleEdit}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Generated SQL & Instructions */}
                  <div className="space-y-6">
                    {/* Generated SQL Section */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase">
                        Generated SQL
                      </h3>
                      <div className="rounded-lg ">
                        <CodeEditor
                          className="tool-code-ctr"
                          code={step?.sql || ""}
                          language="sql"
                          editable={true}
                          handleEdit={handleEdit}
                          updateProp={"sql"}
                          analysisId={analysisId}
                          stepId={stepId}
                        />
                      </div>
                    </div>

                    {/* Relevant Instructions */}
                    {step?.instructions_used && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-gray-400 uppercase">
                          Instructions used for this query
                        </h3>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-break-spaces">
                            {step.instructions_used}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SQL Feedback preserved as is */}
                    <div className="flex justify-between mt-auto">
                      <SQLFeedback
                        question={step?.inputs?.question}
                        sql={step?.sql}
                        previous_context={step?.inputs?.previous_context}
                        apiEndpoint={apiEndpoint}
                        token={token}
                        keyName={keyName}
                        analysisId={analysisId}
                      />
                      {/* Re-run Button - Bottom Right */}
                      <div className="flex justify-end ">
                        <StepReRun
                          className="h-10 px-4 py-2 font-mono text-white bg-gray-600 border border-gray-200 hover:bg-blue-500 hover:text-white active:hover:text-white hover:border-transparent"
                          onClick={() => handleReRun(step.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        ),
      },
      {
        name: "Analysis",
        // if we have an error message in the step, show that
        // if we have no parsedOutputs: show a message saying "No data found"
        content: Object.values(parsedOutputs).length ? (
          Object.entries(parsedOutputs).map(([outputKey, output]) => {
            return (
              <div key={crypto.randomUUID()}>
                <StepResultsTable
                  stepId={stepId}
                  keyName={keyName}
                  stepData={output}
                  apiEndpoint={apiEndpoint}
                  chartImages={output["chart_images"]}
                  nodeName={outputKey}
                  analysisId={analysisId}
                  initialQuestion={step?.inputs?.question}
                  analysisTreeManager={analysisTreeManager}
                />
                {step?.sql && (
                  // get feedback from user if the sql is good or not
                  <SQLFeedback
                    question={step?.inputs?.question}
                    sql={step?.sql}
                    previous_context={step?.inputs?.previous_context}
                    apiEndpoint={apiEndpoint}
                    token={token}
                    keyName={keyName}
                    analysisId={analysisId}
                  />
                )}
                <StepFollowOn
                  question={step?.inputs?.question}
                  keyName={keyName}
                  apiEndpoint={apiEndpoint}
                  setCurrentQuestion={setCurrentQuestion}
                  token={token}
                />
              </div>
            );
          })
        ) : step?.error_message ? (
          <StepError error_message={step?.error_message}></StepError>
        ) : (
          <div className="flex items-center justify-center h-40 m-auto text-sm text-center text-gray-400 dark:text-gray-500 max-w-80">
            No data found when we ran the SQL query. Are you sure that data for
            the question you asked is available in the database
          </div>
        ),
      },
    ];
  }, [step]);

  // rerunningstepsis array of object: {id: res.pre_tool_run_message,
  // timeout: funciton
  // clearTimeout: function}
  const isStepReRunning = useMemo(() => {
    return reRunningSteps.some((s) => s.id === stepId);
  }, [reRunningSteps, stepId]);

  return !parsedOutputs || !step ? (
    <></>
  ) : (
    <div className="w-full h-full tool-results-ctr">
      {/* create a translucent overlay if displayLoadingOverlay is true */}
      {analysisBusy && (
        <div className="absolute top-0 left-0 z-20 flex flex-col items-center justify-center w-full h-full bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 text-md dark:text-gray-300">
          <span className="my-1">
            Last executed step:{" "}
            {toolDisplayNames[step?.tool_name]?.name || step?.tool_name}
          </span>
          <span className="my-1">Now executing the next step</span>
          <SkeletalLoader classNames="text-gray-500 dark:text-gray-400 w-5 h-5" />
        </div>
      )}

      {/* if analysis is busy */}
      {isStepReRunning ? (
        <div className="tool-run-loading">
          <AgentLoader message={"Running analysis..."} />
        </div>
      ) : step?.error_message ? (
        <StepError error_message={step?.error_message}></StepError>
      ) : hideSqlTab ? (
        <div>{tabs.filter((d) => d.name === "Analysis")?.[0]?.content}</div>
      ) : (
        <Tabs
          disableSingleSelect={true}
          defaultSelected="Analysis"
          // @ts-ignore
          tabs={tabs}
        />
      )}
    </div>
  );
}
