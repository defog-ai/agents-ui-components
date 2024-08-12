import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StepResultsTable } from "./StepResultsTable";
import { StepError } from "./StepError";
import { StepInputs } from "./StepInputs";
import { StepOutputs } from "./StepOutputs";
import { StepReRun } from "./StepReRun";
import AgentLoader from "../../../common/AgentLoader";
// import LoadingLottie from "../../../svg/loader.json";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { parseData, toolDisplayNames } from "../../../utils/utils";
import StepResultAnalysis from "./StepResultAnalysis";
import { AddStepUI } from "../../add-step/AddStepUI";
import { Modal } from "antd";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import {
  AgentConfigContext,
  // ReactiveVariablesContext,
} from "../../../context/AgentContext";

function parseOutputs(data, analysisData) {
  let parsedOutputs = {};
  // go through data and parse all tables
  Object.keys(data?.outputs || {}).forEach((k, i) => {
    parsedOutputs[k] = {};
    // check if this has data, reactive_vars and chart_images
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
  activeNode,
  toolSocketManager = null,
  dag = null,
  apiEndpoint,
  setActiveNode = (...args) => {},
  handleReRun = (...args) => {},
  reRunningSteps = [],
  setPendingToolRunUpdates = (...args) => {},
  // toolRunDataCache = {},
  handleDeleteSteps = async (...args) => {},
  tools = {},
  analysisBusy = false,
}) {
  const deleteStepsEndpoint = setupBaseUrl({
    protocol: "http",
    path: "delete_steps",
    apiEndpoint: apiEndpoint,
  });

  const agentConfigContext = useContext(AgentConfigContext);
  const [edited, setEdited] = useState(false);
  const parsedOutputs = useMemo(() => {
    return parseOutputs(step, analysisData);
  }, [step, analysisData]);

  const stepId = step.id;

  const [parentNodeData, setParentNodeData] = useState({});

  const availableOutputNodes = useMemo(
    () => (dag && [...dag?.nodes()].filter((n) => !n.data.isTool)) || [],
    [dag]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleDelete(ev) {
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
  }

  function handleCancel(ev) {
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
  }

  function showModal(ev) {
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
  }
  function handleEdit({ analysis_id, step_id, update_prop, new_val }) {
    if (!step_id) return;
    if (!analysis_id) return;
    if (!update_prop) return;
    if (step_id !== stepId) return;

    if (toolSocketManager && toolSocketManager.send) {
      // if sql, or code_str is present, they are in tool_run_details
      // update toolRunData and send to server
      toolSocketManager.send({
        analysis_id,
        step_id,
        update_prop,
        new_val,
      });
      setEdited(true);
    }
    // edit this in the context too
    // but only do batch update when we click on another node
    // so we can prevent react rerendering
    setPendingToolRunUpdates((prev) => {
      return {
        [step_id]: {
          ...prev[step_id],
          [update_prop]: new_val,
        },
      };
    });
  }

  useEffect(() => {
    if (!activeNode) return;

    async function getAvailableInputDfs() {
      // if is add step node, we still need parent step data
      // const newToolRunDataCache = { ...toolRunDataCache };
      // this is a lot of DRY code, but it's okay for now
      let availableInputDfs = [];
      try {
        if (!activeNode || !activeNode.ancestors) availableInputDfs = [];

        availableInputDfs = [...dag.nodes()]
          .filter(
            (d) =>
              !d.data.isTool &&
              d.data.id !== activeNode.data.id &&
              !d.data.isError &&
              !d.data.isAddStepNode
          )
          .map((ancestor) => ancestor);
      } catch (e) {
        console.log(e);
        availableInputDfs = [];
      }

      let parentIds = availableInputDfs.map((n) => n.data.stepId);

      // get data for all these nodes
      // let parentData = await Promise.all(
      //   parentIds.map((id) => {
      //     // try to get from cache
      //     // if (toolRunDataCache[id]) {
      //     //   return toolRunDataCache[id];
      //     // }
      //     return fetchToolRunDataFromServer(id, apiEndpoint);
      //   })
      // );

      // update toolRunDataCache
      // parentData.forEach((d) => {
      //   if (d.success) {
      //     // parse outputs
      //     d.tool_run_data.parsedOutputs = parseOutputs(
      //       d.tool_run_data,
      //       analysisData
      //     );

      //     // newToolRunDataCache[d.tool_run_data.id] = d;
      //   }
      // });

      // setParentNodeData(
      //   parentData.reduce((acc, d) => {
      //     // for each output add a key to acc
      //     if (d.success) {
      //       Object.keys(d.tool_run_data.parsedOutputs).forEach((k) => {
      //         acc[k] = d.tool_run_data.parsedOutputs[k];
      //       });
      //     }
      //     return acc;
      //   }, {})
      // );
    }
    if (activeNode.data.isAddStepNode) {
      getAvailableInputDfs();
    }
  }, [activeNode, reRunningSteps]);

  const [displayLoadingOverlay, setDisplayLoadingOverlay] = useState(false);

  useEffect(() => {
    if (analysisBusy) {
      setDisplayLoadingOverlay(true);
    } else {
      setDisplayLoadingOverlay(false);
    }
  }, [analysisBusy]);

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
      {displayLoadingOverlay && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 600,
            maxHeight: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            zIndex: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 24,
            color: "#000",
          }}
        >
          Continuing to execute the analysis and moving on to the next step...
          <br />
          Last executed step: {step?.tool_name}
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
          handleReRun={handleReRun}
          parentNodeData={parentNodeData}
          tools={tools}
        />
      ) : step?.error_message && !activeNode.data.isTool ? (
        <StepError error_message={step?.error_message}></StepError>
      ) : (
        <>
          <ErrorBoundary maybeOldAnalysis={true}>
            {step?.error_message && (
              <StepError error_message={step?.error_message}></StepError>
            )}
            <div className="tool-action-buttons flex flex-row gap-2">
              {/* {edited && ( */}
              <StepReRun
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white"
                onClick={() => {
                  handleReRun(stepId);
                }}
              ></StepReRun>
              {/* )} */}
              <StepReRun
                onClick={showModal}
                text="Delete"
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-500 hover:text-white"
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
            <h1 className="text-lg mt-4 mb-2">
              {toolDisplayNames[step.tool_name]}
            </h1>
            <div className="my-4">
              <h1 className="text-gray-400 mb-4">INPUTS</h1>
              <StepInputs
                analysisId={analysisId}
                stepId={stepId}
                step={step}
                availableOutputNodes={availableOutputNodes}
                setActiveNode={setActiveNode}
                handleEdit={handleEdit}
                parentNodeData={parentNodeData}
              ></StepInputs>
            </div>
            <div className="my-4">
              <h1 className="text-gray-400 mb-4">OUTPUTS</h1>
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
          </ErrorBoundary>
          {Object.values(parsedOutputs).map((output) => {
            return (
              <>
                <StepResultsTable
                  stepId={stepId}
                  tableData={output["data"]}
                  apiEndpoint={apiEndpoint}
                  chartImages={output["chart_images"]}
                  reactiveVars={output["reactive_vars"]}
                  nodeId={activeNode.data.id}
                  analysisId={analysisId}
                />
                {agentConfigContext.val.showAnalysisUnderstanding && (
                  <div className="h-60 mt-2 rounded-md text-sm border overflow-scroll w-full mb-2">
                    <div className="relative">
                      <p className="font-bold m-0 sticky top-0 w-full p-2 bg-white shadow-sm border-b">
                        Analysis
                      </p>
                      {output["analysis"] ? (
                        <p
                          style={{ whiteSpace: "pre-wrap" }}
                          className="text-xs"
                        >
                          {output["analysis"]}
                        </p>
                      ) : (
                        <StepResultAnalysis
                          question={analysisData.user_question}
                          data_csv={output["data"]}
                          apiEndpoint={apiEndpoint}
                          image={output["chart_images"]}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })}
        </>
      )}
    </div>
  );
}
