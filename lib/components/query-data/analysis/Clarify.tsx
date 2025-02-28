import { Input } from "@ui-components";
import { useState, useRef } from "react";
import AgentLoader from "../../common/AgentLoader";

interface ClarificationQuestion {
  question: string;
  response?: string;
}

export default function Clarify({
  questions,
  handleSubmit,
  globalLoading,
}: {
  questions: ClarificationQuestion[];
  handleSubmit: (
    answers: { clarification_questions: ClarificationQuestion[] },
    type: "clarify"
  ) => void;
  globalLoading: boolean;
}) {
  const answers = useRef(questions);

  if (!questions)
    return (
      <div className="agent-error">
        Something went wrong, please retry or contact us if it fails again.
      </div>
    );

  return (
    <div className="p-6 bg-transparent">
      <div
        className="mb-4 text-sm text-gray-500 dark:text-gray-400"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit(
              { clarification_questions: answers.current },
              "clarify"
            );
          }
        }}
      >
        {questions.length
          ? questions.map((q, i) => (
              <div key={q.question} className="w-full">
                <div>
                  <p className="q-desc m-0 mb-2 text-primary-text dark:text-gray-200">
                    {q.question}
                  </p>
                  <div className="w-full mb-4 min-w-64">
                    <Input
                      onChange={(ev) => {
                        answers.current[i].response = ev.target.value;
                      }}
                      defaultValue={q.response}
                      placeholder="Your response. Leave blank if the question above is not relevant"
                      inputClassNames="ring-0 bg-transparent rounded-none border-b border-dotted border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:border-solid focus:ring-0 focus:border-b-primary-highlight shadow-none pl-0 w-full dark:text-gray-200"
                    ></Input>
                  </div>
                </div>
              </div>
            ))
          : null}
        <button
          className="underline text-gray-400 dark:text-gray-500 text-sm mt-4 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() =>
            handleSubmit(
              { clarification_questions: answers.current },
              "clarify"
            )
          }
          disabled={globalLoading}
        >
          Click here or press enter to submit
        </button>
      </div>
    </div>
  );
}
