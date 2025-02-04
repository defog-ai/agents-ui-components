// import { message } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Input, SingleSelect, TextArea } from "@ui-components";
import { Trash2, CirclePlus } from "lucide-react";
import { easyToolInputTypes } from "../../../utils/utils";

const inputTypeToUI = {
  list: (stepId, inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = [];
    return (
      <span className="tool-input-value tool-input-type-list">
        <span className="list-bracket">[</span>
        {initialValue.map((val, i) => {
          return (
            <span key={stepId + "_" + inputName}>
              <Input
                value={val}
                size="small"
                suffix={
                  <Trash2
                    className="w-4 h-4 inline ml-1 stroke-gray-600 dark:stroke-gray-400 fill-gray-200 dark:fill-gray-700"
                    onClick={() =>
                      onEdit(
                        inputName,
                        initialValue.filter((v, j) => j !== i)
                      )
                    }
                  />
                }
                onChange={(ev) => {
                  // replace the value at i with the new value
                  const newVal = initialValue.map((v, j) => {
                    if (i === j) {
                      return ev.target.value;
                    }
                    return v;
                  });
                  onEdit(inputName, newVal);
                }}
              />
              {i !== initialValue.length - 1 ? (
                <span className="list-separator">, </span>
              ) : (
                <></>
              )}
            </span>
          );
        })}
        <div className="list-add">
          <CirclePlus
            className="w-3 h-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => {
              onEdit(inputName, [...initialValue, "New Value"]);
            }}
          ></CirclePlus>
        </div>
        <span className="list-bracket">]</span>
      </span>
    );
  },
  str: (stepId, inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = "";
    return (
      <TextArea
        rootClassNames="tool-input-value lg:w-80"
        textAreaClassNames="resize-none overflow-auto"
        value={initialValue}
        key={stepId + "_" + inputName}
        defaultRows={1}
        onChange={(ev) => {
          onEdit(inputName, ev.target.value);
        }}
      />
    );
  },
  bool: (stepId, inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = false;
    return (
      <SingleSelect
        allowClear
        rootClassNames="tool-input-value"
        value={String(initialValue)}
        key={stepId + "_" + inputName}
        size="small"
        popupClassName="tool-input-value-dropdown"
        options={[
          { label: "true", value: true },
          { label: "false", value: false },
        ]}
        onChange={(val) => {
          onEdit(inputName, val);
        }}
      />
    );
  },
  int: (stepId, inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = 0;

    return (
      <TextArea
        rootClassNames="tool-input-value lg:w-80"
        key={stepId + "_" + inputName}
        value={initialValue}
        textAreaClassNames="resize-none"
        onChange={(ev) => {
          onEdit(inputName, parseFloat(ev.target.value));
        }}
      />
    );
  },
  float: (stepId, inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = 0.0;
    return (
      <TextArea
        rootClassNames="tool-input-value lg:w-80"
        value={initialValue}
        key={stepId + "_" + inputName}
        defaultRows={1}
        onChange={(ev) => {
          onEdit(inputName, parseFloat(ev.target.value));
        }}
      />
    );
  },
  "pandas.core.frame.DataFrame": (
    stepId,
    inputName,
    initialValue,
    onEdit,
    config = {
      availableOutputNodes: [],
      setActiveNode: () => {},
    }
  ) => {
    if (!initialValue) initialValue = "";
    const name_clipped = initialValue?.replace(/global_dict\./g, "");
    const exists = config.availableOutputNodes.find(
      (node) => node.data.id === name_clipped
    );

    return (
      <span
        className="tool-input-value type-df"
        onClick={() => {
          if (exists) {
            config.setActiveNode(exists);
          }
        }}
        onMouseOver={(ev) => {
          // get the closest .analysis-content to the mouseovered element
          const closest = ev.target.closest(".analysis-content");
          if (!closest) return;
          // now get the closest .graph-node with the class name name_clipped
          const node = closest.querySelector(`.graph-node.${name_clipped}`);
          if (!node) return;
          // add a class highlighted
          node.classList.add("highlighted");
        }}
        onMouseOut={(ev) => {
          // get the closest .analysis-content to the mouseovered element
          const closest = ev.target.closest(".analysis-content");
          if (!closest) return;
          // now get the closest .graph-node with the class name name_clipped
          const node = closest.querySelector(`.graph-node.${name_clipped}`);
          if (!node) return;
          // remove the class highlighted
          node.classList.remove("highlighted");
        }}
      >
        {name_clipped}
      </span>
    );
  },
  DBColumn: (
    stepId,
    inputName,
    initialValue,
    onEdit,
    config = {
      availableOutputNodes: [],
      setActiveNode: () => {},
      availableParentColumns: [],
    }
  ) => {
    // dropdown with available columns
    const options =
      config?.availableParentColumns?.map((column) => {
        return { label: column.title, value: column.title };
      }) || [];

    // return
    return (
      <SingleSelect
        showSearch
        rootClassNames="tool-input-value"
        value={initialValue}
        key={stepId + "_" + inputName}
        size="small"
        popupClassName="tool-input-value-dropdown"
        options={options}
        placeholder="Select a column name"
        allowClear
        onChange={(val) => {
          onEdit(inputName, val);
        }}
      />
    );
  },
  DBColumnList: (
    stepId,
    inputName,
    initialValue,
    onEdit,
    config = {
      availableOutputNodes: [],
      setActiveNode: () => {},
      availableParentColumns: [],
      type: "",
    }
  ) => {
    // find the min and max from the type
    // usually exists as DBColumnList_min_max
    // where max is optional
    let min, max;

    try {
      const minMax = config.type.split("_").slice(1);
      min = +minMax[0];
      if (minMax.length === 1) minMax.push(minMax[0]);
      max = +minMax[1];

      // if max is 0, then it's infinity
      if (max === 0) {
        max = Infinity;
      }
    } catch (e) {
      min = 0;
      max = Infinity;
    }

    // dropdown with available columns
    const options =
      config?.availableParentColumns?.map((column) => {
        return { label: column.title, value: column.title };
      }) || [];

    // similar to list, just that the new value and existing values are dropdowns
    if (!initialValue) initialValue = [];
    return (
      <span className="tool-input-value tool-input-type-list tool-input-type-column-list">
        <span className="list-bracket">[</span>
        {initialValue.map((val, i) => {
          return (
            <span key={stepId + "_" + inputName + "_" + i}>
              <SingleSelect
                value={val}
                showSearch
                size="small"
                rootClassNames="tool-input-value"
                placeholder="Select a column name"
                allowClear
                popupClassName="tool-input-value-dropdown"
                options={options}
                onChange={(val) => {
                  // replace the value at i with the new value
                  const newVal = initialValue.map((v, j) => {
                    if (i === j) {
                      return val;
                    }
                    return v;
                  });
                  onEdit(inputName, newVal);
                }}
              />
              <div className="list-remove">
                <Trash2
                  className="w-4 h-4 inline ml-1 stroke-gray-600 dark:stroke-gray-400 fill-gray-200 dark:fill-gray-700"
                  onClick={() => {
                    // if the length is already at min, don't remove
                    if (initialValue.length <= min) {
                      // message.error(
                      alert(`${inputName} requires at least ${min} column(s)`);
                      return;
                    }

                    onEdit(
                      inputName,
                      initialValue.filter((v, j) => j !== i)
                    );
                  }}
                />
              </div>
              {i !== initialValue.length - 1 ? (
                <span className="list-separator">, </span>
              ) : (
                <></>
              )}
            </span>
          );
        })}
        <div className="list-add">
          <CirclePlus
            className="w-3 h-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => {
              // if the length is already at max, don't add
              if (initialValue.length >= max) {
                message.error(
                  `Maximum number of columns (${max}) reached for ${inputName}`
                );
                return;
              }

              onEdit(inputName, [...initialValue, ""]);
            }}
          ></CirclePlus>
        </div>
        <span className="list-bracket">]</span>
      </span>
    );
  },
  DropdownSingleSelect: (
    stepId,
    inputName,
    initialValue,
    onEdit,
    config = {
      availableOutputNodes: [],
      setActiveNode: () => {},
      availableParentColumns: [],
      inputMetadata,
    }
  ) => {
    const options =
      Object.values(config?.inputMetadata || [])?.find(
        (sig) => sig.name === inputName
      )?.default || [];

    return (
      <SingleSelect
        allowClear
        value={initialValue}
        key={stepId + "_" + inputName}
        size="small"
        rootClassNames="tool-input-value"
        popupClassName="tool-input-value-dropdown"
        options={options.map((opt) => {
          return { label: opt, value: opt };
        })}
        placeholder="Select a value"
        showSearch
        onChange={(val) => {
          onEdit(inputName, val);
        }}
      />
    );
  },
};

function sanitizeInputType(type) {
  if (typeof type === "string" && type.startsWith("DBColumnList_")) {
    return "DBColumnList";
  }
  return type;
}

export function StepInputs({
  analysisId,
  stepId,
  step,
  availableOutputNodes = [],
  setActiveNode = (...args) => {},
  handleEdit = (...args) => {},
  parentNodeOutputs = {},
}) {
  // parse inputs
  // if inputs doesn't start with global_dict, then it's it's type is whatever typeof returns
  // if it does start with global_dict, then it is a pandas dataframe
  // with a corresponding node somewhere in the dag
  // if there's parsedOutputs, use the .columns property from that
  let availableParentColumns = [];

  Object.keys(parentNodeOutputs).forEach((output_df_name) => {
    if (
      !parentNodeOutputs[output_df_name]?.columns ||
      !parentNodeOutputs[output_df_name]?.data
    )
      return;

    availableParentColumns = availableParentColumns.concat(
      parentNodeOutputs?.[output_df_name]?.columns || []
    );
  });

  const [inputs, setInputs] = useState(step.inputs);
  const [inputMetadata, setInputMetadata] = useState(step.input_metadata);

  const ctr = useCallback(
    (node) => {
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
    [stepId]
  );

  // prop is input name, newVal is the new value
  function onEdit(prop, newVal) {
    const newInputs = { ...inputs };
    newInputs[prop] = newVal;
    setInputs(newInputs);

    handleEdit({
      analysis_id: analysisId,
      step_id: stepId,
      update_prop: "inputs",
      new_val: newInputs,
    });
  }

  useEffect(() => {
    setInputs(step.inputs);
    setInputMetadata(step.input_metadata);
  }, [step]);

  // in case any input is a pd dataframe, and one of the inputs is either DBColumn or list[DBColumn]
  // we need to find all available db columns in that pd dataframe
  // check the cache if we have tool run data available

  return (
    <div className="tool-input-list text-sm text-gray-700 dark:text-gray-300">
      {Object.keys(inputs)
        .filter((i) => i !== "global_dict" && i !== "previous_context")
        .map((input_name, i) => {
          const sanitizedType = sanitizeInputType(
            inputMetadata[input_name]?.type
          );
          const input = inputs[input_name];

          return (
            <div
              key={i + "_" + stepId}
              className="font-mono flex flex-row flex-wrap gap-3 items-center *:my-1 pb-4 text-xs"
            >
              <span className="">
                <span className="rounded-lg p-1 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-400 mr-2">
                  {easyToolInputTypes[sanitizedType] || sanitizedType}
                </span>
                <span className="font-bold">
                  {inputMetadata[input_name]?.name}
                </span>
              </span>

              {inputTypeToUI[sanitizedType] ? (
                inputTypeToUI[sanitizedType](
                  stepId,
                  inputMetadata[input_name].name,
                  input,
                  function (prop, newVal) {
                    onEdit(prop, newVal);
                  },
                  {
                    availableOutputNodes,
                    setActiveNode,
                    availableParentColumns,
                    inputMetadata,
                    type: inputMetadata[input_name].type,
                  }
                )
              ) : (
                <span className="tool-input-value" contentEditable>
                  {step.inputs.length - 1 < i
                    ? String(inputMetadata[input_name].default)
                    : String(input)}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}
