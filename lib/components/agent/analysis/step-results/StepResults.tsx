import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StepResultsTable } from "./StepResultsTable";
import { StepError } from "./StepError";
import { StepInputs } from "./StepInputs";
import { StepOutputs } from "./StepOutputs";
import { StepReRun } from "./StepReRun";
import AgentLoader from "../../../common/AgentLoader";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { toolDisplayNames } from "../../../utils/utils";
import { Tabs } from "../../../core-ui/Tabs";
import { AgentConfigContext } from "../../../context/AgentContext";
import { SkeletalLoader } from "@ui-components";
import SQLFeedback from "./SQLFeedback";
import StepFollowOn from "./StepFollowOn";
import { CodeEditor } from "./CodeEditor";
import type { AnalysisTreeManager } from "../../analysis-tree-viewer/analysisTreeManager";
import { AnalysisData, ParsedOutput, Step } from "../analysisManager";

export function StepResults({
  analysisId,
  analysisData,
  step,
  keyName,
  token,
  apiEndpoint,
  handleReRun = (...args) => {},
  reRunningSteps = [],
  updateStepData = (...args) => {},
  // toolRunDataCache = {},
  tools = {},
  analysisBusy = false,
  setCurrentQuestion = (...args) => {},
  analysisTreeManager = null,
}: {
  analysisId: string;
  analysisData: AnalysisData;
  step: Step;
  keyName: string;
  token: string;
  apiEndpoint: string;
  handleReRun: (...args: any) => void;
  reRunningSteps: Step[];
  updateStepData: (stepId: string, update: Record<string, any>) => void;
  // toolRunDataCache: any;
  tools: any;
  analysisBusy: boolean;
  setCurrentQuestion: (...args: any) => void;
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
      // but only do batch update when we click on another node
      // so we can prevent react rerendering
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
            <div className="flex flex-row gap-2 tool-action-buttons">
              {/* {edited && ( */}
              <StepReRun
                className="font-mono text-gray-500 border border-gray-200 bg-gray-50 hover:bg-blue-500 hover:text-white active:hover:text-white hover:border-transparent"
                onClick={() => {
                  handleReRun(stepId);
                }}
              ></StepReRun>
            </div>
            <p className="mt-4 mb-2 text-lg">
              {toolDisplayNames[step.tool_name]}
            </p>
            <div className="my-4">
              <p className="mb-4 text-xs text-gray-400">INPUTS</p>
              <StepInputs
                analysisId={analysisId}
                stepId={stepId}
                step={step}
                handleEdit={handleEdit}
              ></StepInputs>
            </div>
            <div className="my-4">
              <p className="mb-4 text-xs text-gray-400">OUTPUTS</p>
              <StepOutputs
                analysisId={analysisId}
                stepId={stepId}
                sql={step?.sql}
                handleEdit={handleEdit}
              ></StepOutputs>
            </div>
            {step?.sql && (
              // get feedback from user if the sql is good or not
              <>
                <SQLFeedback
                  question={step?.inputs?.question}
                  sql={step?.sql}
                  previous_context={step?.inputs?.previous_context}
                  apiEndpoint={apiEndpoint}
                  token={token}
                  keyName={keyName}
                  analysisId={analysisId}
                />
                {step?.reference_queries?.length > 0 ? (
                  <>
                    <p className="mt-8 mb-2 font-mono text-sm">
                      <span className="font-bold dark:text-gray-200">
                        Reference Queries
                      </span>
                      :
                      <span className="dark:text-gray-300">
                        these queries were selected as reference queries, among
                        all the golden queries you uploaded. If the query
                        generated above is not correct, consider adding some
                        related golden queries to help Defog answer your
                        questions correctly.
                      </span>
                    </p>
                    <Tabs
                      disableSingleSelect={true}
                      size="small"
                      defaultSelected="Question 1"
                      // @ts-ignore
                      tabs={step.reference_queries.map((query, i) => ({
                        name: `Question ${i + 1}`,
                        content: (
                          <div>
                            <p className="my-4 ml-2 text-sm font-semibold dark:text-gray-300">
                              {query.question}
                            </p>
                            <CodeEditor
                              className="tool-code-ctr"
                              code={query.sql}
                              language="sql"
                              editable={false}
                            />
                          </div>
                        ),
                      }))}
                    />
                  </>
                ) : null}

                {step.instructions_used && (
                  <>
                    <p className="mt-8 mb-2 font-mono text-sm">
                      <span className="font-bold dark:text-gray-200">
                        Relevant Instructions
                      </span>
                      :
                      <span className="dark:text-gray-300">
                        these instructions were selected to create this SQL
                        query
                      </span>
                    </p>
                    <p className="pl-4 mt-2 mb-4 text-sm leading-relaxed rounded whitespace-break-spaces dark:text-gray-300">
                      {step.instructions_used}
                    </p>
                  </>
                )}
              </>
            )}
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
            {toolDisplayNames[step?.tool_name] || step?.tool_name}
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
