import { Input } from "@ui-components";
import { useState, useRef } from "react";
import AgentLoader from "../../common/AgentLoader";

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
      defaults.push("");
    });
  }

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
          (clarification_questions.length
            ? clarification_questions.map((q, i) => (
                <div key={q.question} className="w-full">
                  <div>
                    <p className="q-desc m-0 mb-2 text-primary-text">
                      {q.question}
                    </p>
                    <div className="w-full mb-4 min-w-64">
                      <Input
                        onChange={(ev) => updateAnswer(ev.target.value, i)}
                        defaultValue={q.response}
                        placeholder="Your response. Leave blank if the question above is not relevant"
                        inputClassNames="ring-0 bg-transparent rounded-none border-b border-dotted border-gray-300 focus:border-blue-500 focus:border-solid focus:ring-0 focus:border-b-primary-highlight shadow-none pl-0 w-full"
                      ></Input>
                    </div>
                  </div>
                </div>
              ))
            : !isCurrentStage && (
                <>
                  Your question is clear and we do not need additional
                  refinements. Please click on the Run Analysis button to start
                  running an analysis that answers this question.
                </>
              ))}
        {stageDone ? (
          <></>
        ) : (
          <AgentLoader
            message={"Thinking about whether I need to clarify the question..."}
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
          Click here or press enter to submit
        </button>
      )}
    </div>
  );
}
