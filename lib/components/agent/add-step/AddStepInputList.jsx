import React, { useCallback, useState, useEffect } from "react";
import { easyToolInputTypes } from "../../utils/utils";
import { ListOptions, BoolOptions, IntOptions, FloatOptions, DataFrameOptions, DBColumnOptions, DropdownSingleSelectOptions } from "./InputTypeComponents";

export const inputTypeToUI = {
  list: ListOptions,
  bool: BoolOptions,
  int: IntOptions,
  float: FloatOptions,
  "pandas.core.frame.DataFrame": DataFrameOptions,
  DBColumn: DBColumnOptions,
  DropdownSingleSelect: DropdownSingleSelectOptions
};

function sanitizeInputType(type) {
  if (typeof type === "string" && type.startsWith("DBColumnList_")) {
    return "DBColumnList";
  }
  return type;
}

export function AddStepInputList({
  toolRunId,
  analysisId,
  toolMetadata,
  inputs = {},
  onEdit = () => {},
  newListValueDefault = "",
  parentNodeData = {},
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
    [toolRunId, toolMetadata]
  );

  const [availableColumns, setAvailableColumns] = useState([]);
  
  useEffect(() => {
    // check if any of the inputs is global_dict.something
    if (!inputs) return [];
    let avail = [];

    console.log("inputs", inputs);
    console.log("parentNodeData", parentNodeData);

    Object.keys(inputs).forEach((input_name) => {
      const input = inputs[input_name];

      if (typeof input !== "string") return;
      if (input?.startsWith("global_dict.")) {
        const id = input.split(".")[1];
        console.log(id);
        const parent = parentNodeData[id];
        console.log("parent", parent);
        if (parent) {
          avail = avail.concat(parent.data.columns);
        }
      }

      console.log("avail", avail);
    });
    setAvailableColumns(avail);
  }, [inputs, parentNodeData, toolRunId]);

  return (
    <div className="" key={toolRunId} ref={ctr}>
      {Object.keys(inputs).map((input_name, i) => {
        const sanitizedType = sanitizeInputType(
          inputMetadata[input_name]?.type
        );
        const input = inputs[input_name];
        const ItemToRender = inputTypeToUI[sanitizedType];

        return (
          <div
            key={i + "_" + toolRunId}
            className="font-mono flex flex-row flex-wrap gap-3 items-center *:my-1 pb-4 text-xs"
          >
            <span className="">
              <span className="rounded-lg p-1 bg-gray-200 text-gray-400 mr-2">
                {easyToolInputTypes[sanitizedType] || sanitizedType}
              </span>
              <span className="font-bold">
                {inputMetadata[input_name].name}
              </span>
            </span>
            {sanitizedType in inputTypeToUI &&
              <ItemToRender
                  inputName={inputMetadata[input_name]?.name}
                  initialValue={input}
                  onEdit={(prop, newVal) => {
                    onEdit(prop, newVal);
                  }}
                  config={{
                    availableParentColumns: [...availableColumns],
                    availableInputDfs: Object.keys(parentNodeData),
                    newListValueDefault,
                    analysisId,
                    toolRunId,
                    inputMetadata,
                    type: inputMetadata[input_name].type,
                  }}
              />
              }
          </div>
        );
      })}
    </div>
  );
}
