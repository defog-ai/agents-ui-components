import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StepResultsTable } from "./StepResultsTable";
import { StepError } from "./StepError";
import { StepInputs } from "./StepInputs";
import { StepOutputs } from "./StepOutputs";
import { StepReRun } from "./StepReRun";
import AgentLoader from "../../../common/AgentLoader";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { parseData, toolDisplayNames } from "../../../utils/utils";
import { AddStepUI } from "../../add-step/AddStepUI";
import { Modal } from "antd";
import { Tabs } from "../../../core-ui/Tabs";
import { AgentConfigContext } from "../../../context/AgentContext";
import { SpinningLoader } from "@ui-components";
import { v4 } from "uuid";
import SQLFeedback from "./SQLFeedback";
import StepResultAnalysis from "./StepResultAnalysis";

function parseOutputs(data, analysisData) {
  let parsedOutputs = {};
  // go through data and parse all tables
  Object.keys(data?.outputs || {}).forEach((k, i) => {
    parsedOutputs[k] = {};
    // check if this has data, reactive_vars and chart_images
    parsedOutputs[k].csvString = data.outputs[k].data;
    if (data.outputs[k].data) {
      parsedOutputs[k].data = parseData(data.outputs[k].data);
    }
    if (data.outputs[k].reactive_vars) {
      parsedOutputs[k].reactive_vars = data.outputs[k].reactive_vars;

      // check if title is defined
      if (!parsedOutputs[k]?.reactive_vars?.title) {
        Object.defineProperty(parsedOutputs[k].reactive_vars, "title", {
          get() {
            return analysisData?.user_question;
          },
        });
      }
    }
    if (data.outputs[k].chart_images) {
      parsedOutputs[k].chart_images = data.outputs[k].chart_images;
    }
    if (data.outputs[k].analysis) {
      parsedOutputs[k].analysis = data.outputs[k].analysis;
    }
  });
  return parsedOutputs;
}

export function StepResults({
  analysisId,
  analysisData,
  step,
  keyName,
  token,
  activeNode,
  dag = null,
  apiEndpoint,
  setActiveNode = (...args) => {},
  handleReRun = (...args) => {},
  reRunningSteps = [],
  updateStepData = (...args) => {},
  onCreateNewStep = async (...args) => {},
  // toolRunDataCache = {},
  handleDeleteSteps = async (...args) => {},
  tools = {},
  analysisBusy = false,
  setCurrentQuestion = (...args) => {},
}) {
  const agentConfigContext = useContext(AgentConfigContext);
  const parsedOutputs = useMemo(() => {
    return parseOutputs(step, analysisData);
  }, [step, analysisData]);

  const stepId = step.id;

  const [parentNodeOutputs, setParentNodeOutputs] = useState({});

  const availableOutputNodes = useMemo(
    () => (dag && [...dag?.nodes()].filter((n) => !n.data.isTool)) || [],
    [dag]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCancel = useCallback(
    (ev) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setShowDeleteModal(false);
      // also find out all the descendants of this node
      // add a class to them to-be-deleted

      [...activeNode.descendants()].forEach((d) => {
        const id = d.data.id;
        const node = document.querySelector(`.graph-node.tool-run-${id}`);
        if (!node) return;

        // add a class highlighted
        node.classList.remove("to-be-deleted");
      });
    },
    [activeNode]
  );

  const handleDelete = useCallback(
    async (ev) => {
      try {
        ev.preventDefault();
        ev.stopPropagation();
        // actually delete the steps

        const deleteStepIds = [...activeNode.descendants()]
          .filter((d) => d?.data?.isTool)
          .map((d) => d?.data?.step?.id);

        await handleDeleteSteps(deleteStepIds);
      } catch (e) {
        console.log(e);
      } finally {
        handleCancel();
      }
    },
    [activeNode]
  );

  const showModal = useCallback(
    (ev) => {
      try {
        ev.preventDefault();
        ev.stopPropagation();
        setShowDeleteModal(true);
        // also find out all the descendants of this node
        // add a class to them to-be-deleted

        [...activeNode.descendants()].forEach((d) => {
          const id = d.data.id;
          // get the closest .analysis-content to the mouseovered element
          const closest = ev.target.closest(".analysis-content");
          if (!closest) return;
          // now get the closest .graph-node with the class name output
          const node = closest.querySelector(`.graph-node.tool-run-${id}`);
          if (!node) return;
          // add a class highlighted
          node.classList.add("to-be-deleted");
        });
      } catch (e) {
        console.log(e);
      }
    },
    [activeNode]
  );

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

  useEffect(() => {
    if (!activeNode) return;

    async function getAvailableInputDfs() {
      let availableInputDfs = [];
      try {
        if (!activeNode || !activeNode.ancestors) availableInputDfs = [];

        availableInputDfs = [...dag.nodes()]
          .filter(
            (d) =>
              d.data.id !== activeNode.data.id &&
              !d.data.isError &&
              !d.data.isAddStepNode
          )
          .map((ancestor) => ancestor);
      } catch (e) {
        console.log(e);
        availableInputDfs = [];
      }

      let parentStepIds = availableInputDfs.map((n) => n.data.id);

      // get the data for all those parents
      if (!analysisData || !analysisData?.gen_steps?.steps) return;

      let parentNodeOutputs = analysisData.gen_steps.steps
        .filter((s) => parentStepIds.includes(s.id))
        .reduce((acc, d) => {
          try {
            // i don't trust LLMs
            const parsedOutputs = parseOutputs(d, analysisData);
            Object.keys(parsedOutputs).forEach((k) => {
              acc[k] = parsedOutputs[k]?.data;
            });
          } catch (e) {
            console.log("Error parsing outputs of step: ", d);
            console.log(e);
          }

          return acc;
        }, {});

      setParentNodeOutputs(parentNodeOutputs);
    }

    getAvailableInputDfs();
  }, [activeNode, reRunningSteps]);

  const tabs = useMemo(() => {
    return [
      {
        name: "SQL/Code",
        content: (
          <ErrorBoundary maybeOldAnalysis={true}>
            {step?.error_message && (
              <StepError error_message={step?.error_message}></StepError>
            )}
            <div className="tool-action-buttons flex flex-row gap-2">
              {/* {edited && ( */}
              <StepReRun
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white active:hover:text-white hover:border-transparent"
                onClick={() => {
                  handleReRun(stepId);
                }}
              ></StepReRun>
              {/* )} */}
              <StepReRun
                onClick={showModal}
                text="Delete"
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-500 hover:text-white active:hover:text-white hover:border-transparent"
              ></StepReRun>
              <Modal
                okText={"Yes, delete"}
                okType="danger"
                title="Are you sure?"
                open={showDeleteModal}
                onOk={handleDelete}
                onCancel={handleCancel}
              >
                <p>
                  All child steps (highlighted in red) will also be deleted.
                </p>
              </Modal>
            </div>
            <p className="text-lg mt-4 mb-2">
              {toolDisplayNames[step.tool_name]}
            </p>
            <div className="my-4">
              <p className="text-gray-400 mb-4 text-xs">INPUTS</p>
              <StepInputs
                analysisId={analysisId}
                stepId={stepId}
                step={step}
                availableOutputNodes={availableOutputNodes}
                setActiveNode={setActiveNode}
                handleEdit={handleEdit}
                parentNodeOutputs={parentNodeOutputs}
              ></StepInputs>
            </div>
            <div className="my-4">
              <p className="text-gray-400 mb-4 text-xs">OUTPUTS</p>
              <StepOutputs
                showCode={agentConfigContext.val.showCode}
                analysisId={analysisId}
                stepId={stepId}
                step={step}
                codeStr={step?.code_str}
                sql={step?.sql}
                handleEdit={handleEdit}
                availableOutputNodes={availableOutputNodes}
                setActiveNode={setActiveNode}
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
                    <p className="mt-8 mb-2 text-sm font-mono">
                      <span className="font-bold">Reference Queries</span>:
                      amongst the golden queries you uploaded, these queries
                      were selected as reference queries. If there are no
                      related golden queries, then what you see below might be
                      irrelevant
                    </p>
                    <Tabs
                      disableSingleSelect={true}
                      size="small"
                      defaultSelected="Question 1"
                      tabs={step.reference_queries.map((query, i) => ({
                        name: `Question ${i + 1}`,
                        content: (
                          <pre
                            key={i}
                            className="text-sm text-gray-600 p-2 bg-gray-100 rounded mb-4 whitespace-break-spaces"
                          >
                            <div>Question: {query.question}</div>
                            <br />
                            <div>{query.sql}</div>
                          </pre>
                        ),
                      }))}
                    />
                  </>
                ) : null}

                {step.instructions_used && (
                  <>
                    <p className="mt-8 mb-2 text-sm font-mono">
                      <span className="font-bold">Relevant Instructions</span>:
                      these instructions were selected to create this SQL query
                    </p>
                    <pre className="text-sm mb-2 text-gray-600 p-2 bg-gray-100 rounded whitespace-break-spaces max-h-64 overflow-auto">
                      {step.instructions_used}
                    </pre>
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
          Object.values(parsedOutputs).map((output) => {
            return (
              <div key={v4()}>
                <StepResultsTable
                  stepId={stepId}
                  tableData={output["data"]}
                  apiEndpoint={apiEndpoint}
                  chartImages={output["chart_images"]}
                  reactiveVars={output["reactive_vars"]}
                  nodeId={activeNode.data.id}
                  analysisId={analysisId}
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

                {parsedOutputs &&
                  Object.values(parsedOutputs) &&
                  Object.values(parsedOutputs).length &&
                  Object.values(parsedOutputs)[0]?.csvString && (
                    <StepResultAnalysis
                      keyName={keyName}
                      question={step?.inputs?.question}
                      data_csv={Object.values(parsedOutputs)[0]?.csvString}
                      sql={step?.sql}
                      apiEndpoint={apiEndpoint}
                      setCurrentQuestion={setCurrentQuestion}
                    />
                  )}
              </div>
            );
          })
        ) : step?.error_message ? (
          <StepError error_message={step?.error_message}></StepError>
        ) : (
          <div className="text-gray-400 text-sm h-40 max-w-80 m-auto text-center flex items-center justify-center">
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

  return !activeNode || !activeNode.data || !parsedOutputs || !step ? (
    <></>
  ) : (
    <div
      className="tool-results-ctr w-full h-full"
      data-is-tool={activeNode.data.isTool}
    >
      {/* create a translucent overlay if displayLoadingOverlay is true */}
      {analysisBusy && (
        <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-90 z-20 flex flex-col justify-center items-center text-md">
          <span className="my-1">
            Last executed step:{" "}
            {toolDisplayNames[step?.tool_name] || step?.tool_name}
          </span>
          <span className="my-1">Now executing the next step</span>
          <SpinningLoader classNames="text-gray-500 w-5 h-5" />
        </div>
      )}

      {/* if analysis is busy */}
      {isStepReRunning ? (
        <div className="tool-run-loading">
          <AgentLoader message={"Running analysis..."} />
        </div>
      ) : activeNode && activeNode.data.isAddStepNode ? (
        <AddStepUI
          analysisId={analysisId}
          activeNode={activeNode}
          apiEndpoint={apiEndpoint}
          dag={dag}
          onSubmit={onCreateNewStep}
          parentNodeOutputs={parentNodeOutputs}
          tools={tools}
        />
      ) : step?.error_message && !activeNode.data.isTool ? (
        <StepError error_message={step?.error_message}></StepError>
      ) : (
        <Tabs
          disableSingleSelect={true}
          defaultSelected="Analysis"
          tabs={tabs}
        />
      )}
    </div>
  );
}
