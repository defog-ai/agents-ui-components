import React, { useState } from "react";
import ErrorBoundary from "./common/ErrorBoundary";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { twMerge } from "tailwind-merge";

export function CodeEditor({
  analysisId = null,
  toolRunId = null,
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
    if (!toolRunId) return;
    if (!analysisId) return;
    if (!newVal) return;

    handleEdit({
      tool_run_id: toolRunId,
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
