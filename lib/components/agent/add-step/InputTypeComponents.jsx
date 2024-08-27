import React, { useState, useEffect } from 'react'
import { TextArea, SingleSelect, Input } from "@ui-components";

const onHover = (ev, label, analysisId) => {
  // get the closest .analysis-content to the mouseovered element
  const closest = document.querySelector(
    `div[data-analysis-id="${analysisId}"]`
  );
  if (!closest) return;
  // now get the closest .graph-node with the class name output
  const node = closest.querySelector(`.graph-node.${label}`);
  if (!node) return;
  // add a class highlighted
  node.classList.add("highlighted");
};
const onHoverOut = (ev, label, analysisId) => {
  // get the closest .analysis-content to the mouseovered element
  const closest = document.querySelector(
    `div[data-analysis-id="${analysisId}"]`
  );
  if (!closest) return;
  // now get the closest .graph-node with the class name output
  const node = closest.querySelector(`.graph-node.${label}`);
  if (!node) return;
  // remove the class highlighted
  node.classList.remove("highlighted");
};



export function ListOptions({
  inputName,
  initialValue,
  onEdit,
}) {
  if (!initialValue || !Array.isArray(initialValue)) initialValue = [];
  return (
    <span className="tool-input-value tool-input-type-list">
      <span className="list-bracket">[</span>
      {initialValue.map((val, i) => {
        return (
          <span key={inputName}>
            <Input
              value={val}
              size="small"
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
      <span className="list-bracket">]</span>
    </span>
  );
}

export function BoolOptions({
  inputName,
  initialValue,
  onEdit,
}) {
  return (
    <SingleSelect
      placeholder="Select a value"
      value={initialValue || null}
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
}

export function IntOptions({
  inputName,
  initialValue,
  onEdit,
}) {
  return (
    <TextArea
      rootClassNames="tool-input-value lg:w-80"
      textAreaClassNames="resize-none"
      defaultRows={1}
      value={initialValue || ""}
      onChange={(ev) => {
        onEdit(inputName, parseFloat(ev.target.value));
      }}
    />
  );
}

export function FloatOptions({
  inputName,
  initialValue,
  onEdit,
}) {
  return (
    <TextArea
      rootClassNames="tool-input-value lg:w-80"
      textAreaClassNames="resize-none"
      defaultRows={1}
      value={initialValue || ""}
      onChange={(ev) => {
        onEdit(inputName, parseFloat(ev.target.value));
      }}
    />
  );
}

export function DataFrameOptions({
  inputName,
  initialValue,
  onEdit,
  config = {
    availableInputDfs: [],
    analysisId: "",
    setSelectedInputDf: () => {},
  }
}) {
  const [options, setOptions] = useState(
    config?.availableInputDfs?.map((df) => {
      return { label: df, value: "global_dict." + df };
    }) || []
  );

  useEffect(() => {
    setOptions(
      config?.availableInputDfs?.map((df) => {
        return { label: df, value: "global_dict." + df };
      }) || []
    );
  }, [config.availableInputDfs]);
  
  return (
    <SingleSelect
      allowCreateNewOption={false}
      size="small"
      placeholder="Select a value"
      onChange={(val) => {
        onEdit(inputName, val);
      }}
      value={initialValue}
      optionRenderer={(option, focus, selected) => {
        return (
          <div
            className="p-2 text-sm bg-white text-gray-500 rounded-lg border-l-8 border-l-lime-400"
            onMouseOver={(ev) => onHover(ev, option.label, config.analysisId)}
            onMouseOut={(ev) =>
              onHoverOut(ev, option.label, config.analysisId)
            }
          >
            <span>{option?.label}</span>
          </div>
        );
      }}
      popupClassName="add-step-df-dropdown"
      options={options}
    />
  );
}

export function DBColumnOptions({
  inputName,
  initialValue,
  onEdit,
  config = {
    availableParentColumns: [],
    toolRunId: "",
  }
}) {
  const [options, setOptions] = useState(
    config?.availableParentColumns?.map((column) => {
      return { label: column.title, value: column.title };
    }) || []
  );

  useEffect(() => {
    setOptions(
      config?.availableParentColumns?.map((column) => {
        return { label: column.title, value: column.title };
      }) || []
    );
  }, [config.availableParentColumns]);

  return (
    <SingleSelect
      value={initialValue}
      key={config.toolRunId + "_" + inputName}
      size="small"
      popupClassName="tool-input-value-dropdown"
      options={options}
      placeholder="Select a column name"
      onChange={(val) => {
        onEdit(inputName, val);
      }}
    />
  );
}


export function DropdownSingleSelectOptions({
  inputName,
  initialValue,
  onEdit,
  config = {
    availableParentColumns: [],
    toolRunId: "",
    inputMetadata: {},
  }
}) {
  const [options, setOptions] = useState(config?.inputMetadata?.[inputName]?.default || []);

  useEffect(() => {
    setOptions(config?.inputMetadata?.[inputName]?.default || []);
  }, [config.availableParentColumns]);

  return (
    <SingleSelect
      value={initialValue}
      size="small"
      popupClassName="tool-input-value-dropdown"
      options={options.map((option) => {
        return { label: option, value: option };
      })}
      placeholder="Select a value"
      onChange={(val) => {
        onEdit(inputName, val);
      }}
    />
  );
}

export function StringOptions({
  inputName,
  initialValue,
  onEdit,
}) {
  return (
    <Input
      rootClassNames="tool-input-value lg:w-80"
      textAreaClassNames="resize-none"
      defaultRows={1}
      value={initialValue || ""}
      onChange={(ev) => {
        onEdit(inputName, ev.target.value);
      }}
    />
  );
}