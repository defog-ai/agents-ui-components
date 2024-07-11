import { Divider, Select, Slider, Space } from "antd";
import React, { useState, useRef } from "react";
import Lottie from "lottie-react";
import LoadingLottie from "../../svg/loader.json";
import AgentLoader from "../../common/AgentLoader";
import Writer from "../Writer";
import Search from "antd/es/input/Search";
import { Input } from "../../../../ui-components/lib/main";

export default function Clarify({
  data,
  handleSubmit,
  globalLoading,
  stageDone = true,
  isCurrentStage = false,
}) {
  const [submitted, setSubmitted] = useState(false);
  const answers = useRef(data?.clarification_questions);

  // this will contain all default values or options for the UI elements
  let defaults = [];

  if (data && data.clarification_questions && data.success) {
    data.clarification_questions.map((q, i) => {
      if (q.ui_tool === "multi select") {
        defaults.push(createDropdownOptions(q.ui_tool_options, q));
      } else {
        defaults.push("");
      }
    });
  }

  const [uiDefaults, setUIDefaults] = useState(defaults);

  if (!data || !data.clarification_questions || !data.success)
    return (
      <div className="agent-error">
        Something went wrong, please retry or contact us if it fails again.
      </div>
    );

  const { clarification_questions, success } = data;
  answers.current = clarification_questions;

  // answers has only been initialized with the first element
  // so check this on all subsequent renders
  if (clarification_questions.length > answers.current.length) {
    // add the new elements from clarification_questions
    answers.current = answers.current.concat(
      clarification_questions.slice(answers.current.length)
    );
  }

  function createDropdownOptions(arr, q) {
    if (!Array.isArray(arr) || !arr) {
      return [];
    }
    const opts = arr.map((d) => ({
      label: d,
      value: d,
      className: "analysis-dropdown-item",
    }));

    // sometimes a new option might have been created and selected
    // make sure that one exists in the arr, if it doesn't add an option for it
    // we can also just overwrite on the backend, but easier/faster to do it here
    try {
      q.response.map((d) => {
        if (!arr.includes(d)) {
          opts.push({
            label: d,
            value: d,
            className: "analysis-dropdown-item",
          });
        }
      });
    } catch (e) {
      console.log(e);
    }
    return opts;
  }

  function updateAnswer(newAns, i, formattedReponse = null) {
    answers.current[i].response = newAns;
    if (formattedReponse) {
      answers.current[i].response_formatted = formattedReponse;
    } else {
      answers.current[i].response_formatted = newAns;
    }
  }

  function onSubmit(forceSubmit = false) {
    if (submitted && !forceSubmit) return;
    setSubmitted(true);

    // run the command below after a 100ms delay
    setTimeout(() => {
      handleSubmit({ clarification_questions: answers.current }, "clarify");
    }, 100);
  }

  const UIs = {
    "multi select": (q, i, opts) => {
      const dropdownOpts = uiDefaults[i] || [];

      return (
        <Select
          mode="multiple"
          options={dropdownOpts}
          popupClassName="analysis-dropdown"
          defaultValue={q.response}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: "8px 0" }} />
              <Space style={{ padding: "0 8px 4px" }}>
                <Search
                  placeholder="New item"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onSearch={(value, e, info) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!value || value === "") return;
                    // add this to uiDefaults at index i
                    let newOpts = uiDefaults.slice();
                    newOpts[i] = newOpts[i].concat({
                      label: value,
                      value: value,
                      className: "analysis-dropdown-item",
                    });

                    setUIDefaults(newOpts);
                  }}
                  enterButton="Add"
                  rootClassName="analysis-dropdown-add-item"
                />
              </Space>
            </>
          )}
          onChange={(_, allSel) => {
            return updateAnswer(
              allSel.map((d) => d.value),
              i
            );
          }}
          popupMatchSelectWidth={true}
          placeholder="Select one or more options"
        ></Select>
      );
    },
    "text input": (q, i) => {
      return (
        <Input
          onChange={(ev) => updateAnswer(ev.target.value, i)}
          defaultValue={q.response}
          placeholder="Your response"
          inputClassNames="ring-0 bg-transparent rounded-none border-b border-dotted border-gray-300 focus:border-blue-500 focus:ring-0 focus:border-b-primary-highlight focus:border-solid shadow-none pl-0"
        ></Input>
      );
    },
    "date range selector": (q, i) => {
      let el = null;

      return (
        <>
          <span style={{ fontSize: 12 }}>
            <strong ref={(t) => (el = t)}>{q.response_formatted}</strong>
          </span>
          <Slider
            max={24}
            defaultValue={q.response}
            onChange={function (v) {
              updateAnswer(v, i, v + " months");
              if (el) el.innerText = q.response_formatted;
            }}
            tooltip={{ formatter: (d) => d + " months" }}
          ></Slider>
        </>
      );
    },
  };

  return (
    <div className="p-6 bg-transparent">
      <div
        className="mb-4 text-sm text-gray-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit(true);
          }
        }}
      >
        {success &&
          (clarification_questions.length ? (
            <>
              {/* <p className="font-bold text-left mb-2">
                Please answer these questions to proceed
              </p> */}
              {clarification_questions.map((q, i) => (
                <>
                  <div
                    key={q.question}
                    className="w-full flex place-content-start"
                  >
                    <Writer s={q.question} animate={!stageDone}>
                      <div className="w-full mb-4">
                        <p className="q-desc writer-target m-0 mb-2 text-primary-text"></p>
                        <div className="writer-children">
                          {UIs[q.ui_tool](q, i, q.ui_tool_options)}
                        </div>
                      </div>
                    </Writer>
                  </div>
                </>
              ))}
            </>
          ) : (
            !isCurrentStage && (
              <>
                Your question is clear and we do not need additional
                refinements. Please click on the Run Analysis button to start
                running an analysis that answers this question.
              </>
            )
          ))}
        {stageDone ? (
          <></>
        ) : (
          <AgentLoader
            message={"Thinking about whether I need to clarify the question..."}
            lottie={<Lottie animationData={LoadingLottie} loop={true} />}
          />
        )}
      </div>
      {!stageDone ? (
        <></>
      ) : (
        <button
          className="underline text-gray-400 text-sm mt-4"
          onClick={() => onSubmit(true)}
          disabled={globalLoading}
        >
          Press Enter or click here to submit
        </button>
      )}
    </div>
  );
}
