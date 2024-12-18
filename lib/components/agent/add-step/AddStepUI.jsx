import { useContext, useEffect, useState } from "react";
import { AddStepInputList } from "./AddStepInputList";
import { createInitialToolInputs } from "../../utils/utils";
import { MessageManagerContext, SingleSelect } from "@ui-components";
import { StepReRun } from "../analysis/step-results/StepReRun";

export function AddStepUI({
  analysisId,
  activeNode,
  onSubmit = async (...args) => {},
  parentNodeOutputs = {},
  tools = {},
}) {
  const toolOptions = Object.keys(tools).map((tool) => {
    return { value: tool, label: tools[tool]?.tool_name };
  });

  const [selectedTool, setSelectedTool] = useState(
    activeNode?.data?.step?.tool_name
  );

  const messageManager = useContext(MessageManagerContext);

  const [inputs, setInputs] = useState(activeNode?.data?.step?.inputs || {});
  const [outputs, setOutputs] = useState(["output_" + crypto.randomUUID().split("-")[0]]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedTool(activeNode?.data?.step?.tool_name);
    setInputs(activeNode?.data?.step?.inputs || {});
    setLoading(activeNode?.data?.step?.loading || false);
  }, [activeNode?.data?.id]);

  return !activeNode ? (
    <>Something went wrong</>
  ) : (
    <div className="add-step-ctr min-h-60 lg:min-h-0">
      <h1 className="text-lg font-bold my-2">New Task</h1>
      <div className="tool-action-buttons">
        {/* this is a simple Re-Run button */}
        <StepReRun
          text="Run"
          loading={loading || selectedTool === null}
          onClick={async () => {
            setLoading(true);
            console.groupCollapsed("AddStepUI: Run button clicked");
            console.log("inputs", inputs);
            console.log("outputs", outputs);
            console.groupEnd();

            try {
              await onSubmit({
                tool_name: selectedTool,
                inputs: inputs,
                analysis_id: analysisId,
                outputs_storage_keys: outputs,
              });
            } catch (e) {
              messageManager.error(e.message);
              console.log(e.stack);
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
      <SingleSelect
        rootClassNames="w-6/12 min-w-52"
        options={toolOptions}
        value={selectedTool}
        onChange={(value) => {
          if (!activeNode.data?.step?.inputs) return;
          if (!value) {
            setSelectedTool(null);
            setInputs({});
            return;
          }
          const initialInputs = createInitialToolInputs(
            tools,
            value,
            activeNode?.data?.parentIds
          );

          setInputs(initialInputs);

          setSelectedTool(value);

          activeNode.data.step.tool_name = value;
          activeNode.data.step.inputs = initialInputs;
        }}
        placeholder="What would you like to do?"
        allowCreateNewOption={false}
      />
      {!selectedTool ? (
        <></>
      ) : (
        <>
          {/* these are all the options that are available for a given input list */}
          <h1 className="my-2 mb-4">INPUTS</h1>
          <AddStepInputList
            stepId={activeNode.data.id}
            toolMetadata={tools[selectedTool]}
            analysisId={analysisId}
            inputs={inputs}
            onEdit={(prop, newVal) => {
              activeNode.data.step.inputs[prop] = newVal;
              setInputs(Object.assign({}, activeNode.data?.step?.inputs));
            }}
            parentNodeOutputs={parentNodeOutputs}
          />
          {/* <h1 className="inputs-header">OUTPUTS</h1> */}
          {/* a little kooky, but */}
          {/* just reuse AddStepInputList to store outputs */}
          {/* <AddStepInputList
            stepId={activeNode.data.id}
            toolMetadata={{
              input_metadata: [
                {
                  name: "output_names",
                  default: [],
                  type: "list",
                },
              ],
            }}
            autoFocus={false}
            newListValueDefault={() => "output_" + crypto.randomUUID().split("-")[0]}
            inputs={[outputs]}
            onEdit={(prop, newVal) => {
              // don't need to worry about idx, because it's always 0
              setOutputs(newVal);
            }}
            parentNodeOutputs={parentNodeOutputs}
          /> */}
        </>
      )}
    </div>
  );
}
