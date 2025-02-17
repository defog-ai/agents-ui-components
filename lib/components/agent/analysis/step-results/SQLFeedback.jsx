import React, { useState, useCallback, useContext } from "react";
import { MessageManager, Modal, Tabs } from "@ui-components";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { sql as codemirrorSql } from "@codemirror/lang-sql";

const SQLFeedback = ({
  question,
  sql,
  previous_context,
  apiEndpoint,
  token,
  keyName,
  analysisId,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProvidedSql, setUserProvidedSql] = useState("\n\n\n\n\n\n\n");

  const message = useContext(MessageManager);

  const sqlOnChange = useCallback((val, viewUpdate) => {
    setUserProvidedSql(val);
  }, []);

  const uploadFeedback = async (feedbackType, feedbackText) => {
    setLoading(true);
    const url = apiEndpoint + "/feedback";
    const data = {
      previous_context: previous_context,
      feedback: feedbackType,
      text: feedbackText,
      db_name: keyName,
      token: token,
      response: {
        question: question,
        generatedSql: sql,
        questionId: analysisId,
      },
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.status === "received" || result.status === "success") {
      message.success("Feedback submitted successfully");
    } else {
      message.error("Failed to submit feedback");
    }
    setLoading(false);
    setModalVisible(false);
  };

  const updateGoldenQueries = async () => {
    setLoading(true);
    const url = apiEndpoint + "/integration/update_single_golden_query";
    const data = {
      previous_context: previous_context,
      question: question,
      sql: userProvidedSql,
      token: token,
      db_name: keyName,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.status === "received" || result.status === "success") {
      message.success("Feedback submitted successfully");
    } else {
      message.error("Failed to submit feedback");
    }
    setLoading(false);
    setModalVisible(false);
  };

  return (
    <div className="h-10 mt-2">
      {/* thumbs up or thumbs down feedback */}
      <div className="flex items-left h-10 gap-1">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer"
          onClick={() => {
            uploadFeedback("good", "");
          }}
        >
          <span className="text-md">👍</span>
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer"
          onClick={() => {
            // show a modal to get feedback text
            setModalVisible(true);
          }}
        >
          <span className="text-md">👎</span>
        </div>
      </div>
      <Modal
        title="Align the model by providing feedback"
        open={modalVisible}
        loading={loading}
        footer={null}
        width={768}
        onCancel={() => setModalVisible(false)}
      >
        {/* first, a section to provide simple text feedback */}
        <Tabs
          disableSingleSelect={true}
          defaultSelected="Give Feedback"
          tabs={[
            // just a simple text feedback
            {
              name: "Give Feedback",
              content: (
                <div className="mt-4">
                  <p className="mb-2">
                    Teach the model what was wrong with the generated SQL query.
                    This will help improve the model.
                  </p>
                  <textarea
                    className="w-full h-32"
                    placeholder="Add your feedback here"
                    id={`${question}-feedback-text`}
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-xs"
                    onClick={() => {
                      const feedbackText = document.getElementById(
                        `${question}-feedback-text`
                      ).value;
                      uploadFeedback("bad", feedbackText);
                    }}
                  >
                    Give Feedback
                  </button>
                </div>
              ),
            },
            // a section to provide a new SQL query
            {
              name: "Provide Correct SQL",
              content: (
                <div className="mt-4">
                  <p className="mb-2">
                    Optionally, please provide the correct SQL query for
                    answering this question. As a reminder, the question was:{" "}
                    <span className="font-mono font-semibold">{question}</span>
                    <br />
                  </p>
                  <p className="mb-2">
                    The query originally generated by Defog was as follows:
                  </p>
                  <CodeMirror
                    extensions={[codemirrorSql(), EditorView.lineWrapping]}
                    value={sql}
                    basicSetup={{
                      lineNumbers: false,
                    }}
                    editable={false}
                    minHeight={"200px"}
                  />
                  <p className="mb-2">
                    Please provide the correct SQL query below:
                  </p>
                  <CodeMirror
                    extensions={[codemirrorSql(), EditorView.lineWrapping]}
                    value={userProvidedSql}
                    onChange={sqlOnChange}
                    basicSetup={{
                      lineNumbers: false,
                    }}
                    editable={true}
                    minHeight={"200px"}
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-xs"
                    onClick={updateGoldenQueries}
                  >
                    Submit SQL
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default SQLFeedback;
