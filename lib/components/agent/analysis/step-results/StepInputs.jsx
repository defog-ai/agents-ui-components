// import { message } from "antd";
import { useEffect, useState } from "react";
import { Input, SingleSelect, TextArea } from "@ui-components";
import { Trash2, CirclePlus, X } from "lucide-react";
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
                    className="inline w-4 h-4 ml-1 stroke-gray-600 dark:stroke-gray-400 fill-gray-200 dark:fill-gray-700"
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
                  className="inline w-4 h-4 ml-1 stroke-gray-600 dark:stroke-gray-400 fill-gray-200 dark:fill-gray-700"
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
                alert(
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
  setActiveNode = () => {},
  handleEdit = () => {},
  parentNodeOutputs = {},
}) {
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
    <div className="text-sm text-gray-700 tool-input-list dark:text-gray-300">
      {/* Question Input */}
      {inputs.question && (
        <div className="mb-6">
          <div className="flex flex-row flex-wrap items-center gap-3 font-mono text-xs">
            <span className="p-1 mr-2 text-gray-400 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-400">
              String
            </span>
            <span className="font-bold">question</span>
          </div>
          <div className="mt-2">
            <TextArea
              rootClassNames="w-full"
              textAreaClassNames="resize-none overflow-auto text-sm"
              value={inputs.question}
              defaultRows={1}
              onChange={(ev) => {
                onEdit("question", ev.target.value);
              }}
            />
          </div>
        </div>
      )}

      {/* Hard Filters */}
      {inputs.hard_filters && (
        <div className="space-y-4">
          <div className="flex flex-row flex-wrap items-center gap-3 font-mono text-xs">
            <span className="p-1 mr-2 text-gray-400 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-400">
              List
            </span>
            <span className="font-bold">hard_filters</span>
          </div>
          <div className="space-y-2">
            {inputs.hard_filters.map((filter, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="flex-1 px-2"
                  rootClassNames="px-2"
                  size="medium"
                  value={filter}
                  placeholder="New Value"
                  onChange={(ev) => {
                    const newFilters = [...inputs.hard_filters];
                    newFilters[i] = ev.target.value;
                    onEdit("hard_filters", newFilters);
                  }}
                />
                <button
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    const newFilters = inputs.hard_filters.filter(
                      (_, idx) => idx !== i
                    );
                    onEdit("hard_filters", newFilters);
                  }}
                >
                  <span className="sr-only">Remove</span>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onEdit("hard_filters", [...(inputs.hard_filters || []), ""])
              }
              className="flex items-center gap-1.5 mb-4 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              <span>+</span> Add Filter
            </button>
          </div>
        </div>
      )}

      {/* Other Inputs */}
      {Object.keys(inputs)
        .filter(
          (i) =>
            ![
              "global_dict",
              "previous_context",
              "question",
              "hard_filters",
            ].includes(i)
        )
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
                <span className="p-1 mr-2 text-gray-400 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-400">
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
                    availableOutputNodes: [],
                    setActiveNode,
                    availableParentColumns: [],
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
