import React, { useCallback, useState, useEffect } from "react";
import { easyToolInputTypes } from "../../utils/utils";
import {
  ListOptions,
  BoolOptions,
  IntOptions,
  FloatOptions,
  DataFrameOptions,
  DBColumnOptions,
  DropdownSingleSelectOptions,
} from "./InputTypeComponents";

export const inputTypeToUI = {
  list: ListOptions,
  bool: BoolOptions,
  int: IntOptions,
  float: FloatOptions,
  "pandas.core.frame.DataFrame": DataFrameOptions,
  DBColumn: DBColumnOptions,
  DropdownSingleSelect: DropdownSingleSelectOptions,
};

function sanitizeInputType(type) {
  if (typeof type === "string" && type.startsWith("DBColumnList_")) {
    return "DBColumnList";
  }
  return type;
}

export function AddStepInputList({
  stepId,
  analysisId,
  toolMetadata,
  inputs = {},
  onEdit = () => {},
  newListValueDefault = "",
  parentNodeOutputs = {},
  autoFocus = true,
}) {
  const inputMetadata = toolMetadata?.input_metadata || {};
  const ctr = useCallback(
    (node) => {
      if (!autoFocus) return;
      if (node) {
        // hacky as f from here: https://github.com/facebook/react/issues/20863
        // my guess is requestAnimationFrame is needed to ensure browser is finished painting the DOM
        // before we try to focus
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            // put the focus on the first input on first render
            const el = node.querySelector(
              "div.tool-input-value, input.tool-input-value"
            );

            if (!el) return;
            el.focus();
          }, 0);
        });
      }
    },
    [stepId, toolMetadata]
  );

  const [availableColumns, setAvailableColumns] = useState([]);

  console.log("parentNodeOutputs", parentNodeOutputs);
  useEffect(() => {
    // check if any of the inputs is global_dict.something
    if (!inputs) return [];
    let cols = [];

    console.log("inputs", inputs);

    // the inputs prop changes whenever we select change an input from the dropdowns
    // we need to check if any of the inputs is a dataframe, and show the columns of that dataframe
    // as options to any other inputs that might be column names
    // we first find if we have parent node data

    if (!parentNodeOutputs) return;

    // parentNodeOutputs is an object with keys as the names of the output dfs

    // go through any input that is a dataframe, and add the columns of that dataframe to the available columns
    // we get the available columns from parentNodeOutputs

    Object.keys(inputs).forEach((inputName) => {
      const input = inputs[inputName];

      // if not string, return
      if (typeof input !== "string") return;

      if (input?.startsWith("global_dict.")) {
        const dfName = input.split(".")[1];
        const output = parentNodeOutputs[dfName];
        console.log(dfName, output);

        if (output && output.columns) {
          cols = cols.concat(output.columns);
        }
      }
    });

    setAvailableColumns(cols);
  }, [inputs, parentNodeOutputs, stepId]);

  return (
    <div className="" key={stepId} ref={ctr}>
      {Object.keys(inputs).map((inputName, i) => {
        const sanitizedType = sanitizeInputType(inputMetadata[inputName]?.type);
        const input = inputs[inputName];
        const ItemToRender = inputTypeToUI[sanitizedType];

        return (
          <div
            key={i + "_" + stepId}
            className="font-mono flex flex-row flex-wrap gap-3 items-center *:my-1 pb-4 text-xs"
          >
            <span className="">
              <span className="rounded-lg p-1 bg-gray-200 text-gray-400 mr-2">
                {easyToolInputTypes[sanitizedType] || sanitizedType}
              </span>
              <span className="font-bold">{inputMetadata[inputName].name}</span>
            </span>
            {sanitizedType in inputTypeToUI && (
              <ItemToRender
                inputName={inputMetadata[inputName]?.name}
                initialValue={input}
                onEdit={(prop, newVal) => {
                  onEdit(prop, newVal);
                }}
                config={{
                  availableParentColumns: [...availableColumns],
                  availableInputDfs: Object.keys(parentNodeOutputs),
                  newListValueDefault,
                  analysisId,
                  stepId,
                  inputMetadata,
                  type: inputMetadata[inputName].type,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
