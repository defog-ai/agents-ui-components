import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnalysisOutputsTable } from "./AnalysisOutputTable";
import { AnalysisError } from "./AnalysisError";
import { AnalysisInputs } from "./AnalysisInputs";

import { StepReRun } from "./StepReRun";
import AgentLoader from "../../../common/AgentLoader";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { toolDisplayNames } from "@utils/utils";
import { Tabs } from "../../../core-ui/Tabs";

import { EmbedContext } from "@agent";
import { Button, SkeletalLoader, SpinningLoader } from "@ui-components";
import SQLFeedback from "./SQLFeedback";
import { AnalysisFollowOn } from "./AnalysisFollowOn";
import { CodeEditor } from "./CodeEditor";
import type { AnalysisTreeManager } from "../../analysis-tree-viewer/analysisTreeManager";
import type { Analysis, AnalysisData } from "../analysisManager";
import { Database } from "lucide-react";
import React from "react";
const toolIcons = {
  data_fetcher_and_aggregator: Database,
};

export function AnalysisResults({
  dbName,
  analysis,
  analysisBusy = false,
  handleReRun = (...args: any[]) => {},
  submitFollowOn = (followOnQuestion: string) => {},
  analysisTreeManager = null,
}: {
  dbName: string;
  analysis: Analysis;
  analysisBusy?: boolean;
  handleReRun: (...args: any[]) => void;
  submitFollowOn: (...args: any[]) => void;
  analysisTreeManager: AnalysisTreeManager;
}) {
  const { hideSqlTab } = useContext(EmbedContext);
  const analysisData = analysis?.data;
  const analysisId = analysis?.analysis_id;

  const handleEdit = useCallback(
    ({ update_prop, new_val }) => {
      if (!update_prop) return;

      console.log(update_prop, new_val);

      // // edit this in the context too
      // updateStepData(stepId, {
      //   [update_prop]: new_val,
      // });
    },
    [analysisData]
  );

  const tabs = useMemo(() => {
    return [
      {
        name: "SQL/Code",
        content: (
          <ErrorBoundary maybeOldAnalysis={true}>
            {analysisData?.error && (
              <AnalysisError
                error_message={analysisData?.error}
              ></AnalysisError>
            )}
            <div className="flex ">
              <div className="w-full">
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
                        <AnalysisInputs
                          initialInputs={analysisData?.inputs}
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
                          code={analysisData?.sql || ""}
                          language="sql"
                          editable={true}
                          handleEdit={handleEdit}
                          updateProp={"sql"}
                        />
                      </div>
                    </div>

                    {/* Relevant Instructions */}
                    {analysisData?.instructions_used && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-gray-400 uppercase">
                          Instructions used for this query
                        </h3>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-break-spaces">
                            {analysisData.instructions_used}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SQL Feedback preserved as is */}
                    <div className="flex justify-between mt-auto">
                      <SQLFeedback
                        dbName={dbName}
                        question={analysisData?.inputs?.question}
                        sql={analysisData?.sql}
                      />
                      {/* Re-run Button - Bottom Right */}
                      <div className="flex justify-end ">
                        <Button
                          disabled={analysisBusy}
                          className="h-10 px-4 py-2 font-mono text-white bg-gray-600 border border-gray-200 hover:bg-blue-500 hover:text-white active:hover:text-white hover:border-transparent"
                          onClick={() => handleReRun(analysisId)}
                        >
                          Re run
                        </Button>
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
        content: (
          <div key={crypto.randomUUID()}>
            <AnalysisOutputsTable
              dbName={dbName}
              analysis={analysis}
              analysisTreeManager={analysisTreeManager}
            />
            {analysisData?.sql && (
              // get feedback from user if the sql is good or not
              <SQLFeedback
                dbName={dbName}
                question={analysisData?.inputs?.question}
                sql={analysisData?.sql}
              />
            )}
            <AnalysisFollowOn
              dbName={dbName}
              question={analysisData?.inputs?.question}
              submitFollowOn={submitFollowOn}
            />
          </div>
        ),
        // ) : analysisData?.error ? (
        //   <AnalysisError error_message={analysisData?.error}></AnalysisError>
        // ) : (
        //   <div className="flex items-center justify-center h-40 m-auto text-sm text-center text-gray-400 dark:text-gray-500 max-w-80">
        //     No data found when we ran the SQL query. Are you sure that data for
        //     the question you asked is available in the database
        //   </div>
        // ),
      },
    ];
  }, [analysisData, analysisBusy]);

  return !analysisData?.parsedOutput ? (
    <></>
  ) : (
    <div className="w-full h-full tool-results-ctr">
      {/* create a translucent overlay if displayLoadingOverlay is true */}
      {analysisBusy && (
        <div className="absolute top-0 left-0 z-20 flex flex-col items-center justify-center w-full h-full bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 text-md dark:text-gray-300">
          <span className="my-1">
            <SpinningLoader></SpinningLoader>Running
          </span>
          <SkeletalLoader classNames="text-gray-500 dark:text-gray-400 w-5 h-5" />
        </div>
      )}

      {/* if analysis is busy */}
      {analysisBusy ? (
        <div className="tool-run-loading">
          <AgentLoader message={"Running analysis..."} />
        </div>
      ) : analysisData?.error ? (
        <AnalysisError error_message={analysisData?.error}></AnalysisError>
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
