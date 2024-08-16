import React, { useState } from "react";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { twMerge } from "tailwind-merge";
import ErrorBoundary from "../../../common/ErrorBoundary";

export function CodeEditor({
  analysisId = null,
  stepId = null,
  code = null,
  language = "sql",
  updateProp = null,
  className = "",
  handleEdit = () => {},
  editable = true,
}) {
  const [toolCode, setToolCode] = useState(code || "");

  const updateCodeAndSql = (newVal) => {
    // update values of the code and the SQL
    if (updateProp !== "sql" && updateProp !== "code_str") return;
    if (!stepId) return;
    if (!analysisId) return;
    if (!newVal) return;

    handleEdit({
      step_id: stepId,
      update_prop: updateProp,
      new_val: newVal,
      analysis_id: analysisId,
    });
    setToolCode(newVal);
  };

  const languageClass = `language-${language} `;

  return (
    <ErrorBoundary>
      <>
        <CodeMirror
          // language={language}
          extensions={[
            language === "python" ? python() : sql(),
            EditorView.lineWrapping,
          ]}
          basicSetup={{
            lineNumbers: false,
          }}
          className={twMerge("language-" + language, className)}
          value={toolCode}
          onChange={(val) => {
            updateCodeAndSql(val);
          }}
          editable={editable}
        />
      </>
    </ErrorBoundary>
  );
}
