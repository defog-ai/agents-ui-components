import { useState, useCallback, useContext } from "react";
import { MessageManagerContext, Modal, Tabs } from "@ui-components";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { sql as codemirrorSql } from "@codemirror/lang-sql";
import { QueryDataEmbedContext } from "@agent";

const SQLFeedback = ({ projectName, question, sql }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProvidedSql, setUserProvidedSql] = useState("\n\n\n\n\n\n\n");
  const { apiEndpoint, token } = useContext(QueryDataEmbedContext);

  const message = useContext(MessageManagerContext);

  const sqlOnChange = useCallback((val) => {
    setUserProvidedSql(val);
  }, []);

  const updateGoldenQueries = async () => {
    setLoading(true);
    const url = apiEndpoint + "/integration/update_golden_queries";
    const data = {
      token: token,
      db_name: projectName,
      golden_queries: [
        {
          question: question,
          sql: userProvidedSql,
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success === true) {
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
          className="flex items-center justify-center w-40 h-10 rounded-full cursor-pointer"
          onClick={() => {
            // show a modal to get feedback text
            setModalVisible(true);
          }}
        >
          <span className="text-xs">Bad result? Teach model to do better.</span>
        </div>
      </div>
      <Modal
        title="Align the model by providing feedback"
        open={modalVisible}
        footer={null}
        onCancel={() => setModalVisible(false)}
        contentClassNames="overflow-auto"
      >
        {/* first, a section to provide simple text feedback */}
        <div className="mt-4 dark:text-gray-200">
          <p className="mb-2">
            Please provide the correct SQL query for answering this question.
            The question was:{" "}
            <span className="font-mono dark:text-blue-300 text-blue-500">
              {question}
            </span>
            <br />
          </p>
          <p className="mb-2">The query originally generated by Defog was:</p>
          <CodeMirror
            theme={"dark"}
            extensions={[codemirrorSql(), EditorView.lineWrapping]}
            value={sql}
            basicSetup={{
              lineNumbers: false,
            }}
            editable={false}
            minHeight={"200px"}
            className="dark:bg-gray-800 rounded-md"
          />
          <p className="mb-2">Please enter the correct SQL query below:</p>
          <CodeMirror
            theme={"dark"}
            extensions={[codemirrorSql(), EditorView.lineWrapping]}
            value={userProvidedSql}
            onChange={sqlOnChange}
            basicSetup={{
              lineNumbers: false,
            }}
            editable={true}
            minHeight={"200px"}
            className="dark:bg-gray-800 rounded-md"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-800 font-bold py-2 px-4 rounded text-xs"
            onClick={updateGoldenQueries}
          >
            Submit SQL
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SQLFeedback;
