import React, { useState, useEffect } from "react";
import setupBaseUrl from "../../../utils/setupBaseUrl";

const StepFollowOn = ({
  question,
  keyName,
  apiEndpoint,
  setCurrentQuestion = () => {},
}) => {
  const [followOnQuestions, setFollowOnQuestions] = useState([]);

  async function generateFollowOnQuestions() {
    try {
      const urlToConnect = setupBaseUrl({
        protocol: "http",
        path: "generate_follow_on_questions",
        apiEndpoint: apiEndpoint,
      });

      // send data to the server
      const data = {
        user_question: question,
        key_name: keyName,
      };

      const response = await fetch(urlToConnect, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Error generating follow on questions");
      } else {
        const responseJson = await response.json();
        setFollowOnQuestions(responseJson["follow_on_questions"] || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    generateFollowOnQuestions();
  }, []);

  {
    /* show buttons for follow on questions */
  }
  return (
    <div className="p-4">
      <div className="max-w-[900px] w-full m-auto flex flex-row gap-4 justify-center">
        {followOnQuestions &&
          followOnQuestions.length &&
          followOnQuestions.map((followOnQuestion, index) => (
            <button
              key={index}
              data-testid="follow-on-question"
              className="p-2 m-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm cursor-pointer grow basis-1 dark:border-gray-600 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-gray-200"
              onClick={() => {
                console.log("clicked on follow on question", followOnQuestion);
                setCurrentQuestion(followOnQuestion);
              }}
            >
              {followOnQuestion}
            </button>
          ))}
      </div>
    </div>
  );
};

export default StepFollowOn;
