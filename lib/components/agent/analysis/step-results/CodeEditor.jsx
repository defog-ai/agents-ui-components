import React, { useState, useMemo } from "react";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { twMerge } from "tailwind-merge";
import ErrorBoundary from "../../../common/ErrorBoundary";
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

const lightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#4B5563',
    caret: '#3B82F6',
    selection: '#036dd626',
    selectionMatch: '#036dd626',
    lineHighlight: '#8a91991a',
  },
  styles: [
    { tag: t.comment, color: '#787B8099' },
    { tag: t.variableName, color: '#2563EB' },
    { tag: t.string, color: '#059669' },
    { tag: t.keyword, color: '#7C3AED' },
    { tag: [t.function(t.variableName)], color: '#2563EB' },
    { tag: [t.number], color: '#059669' },
  ],
});

const darkTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#1F2937',
    foreground: '#F3F4F6',
    caret: '#93C5FD',
    selection: '#036dd626',
    selectionMatch: '#036dd626',
    lineHighlight: '#8a919966',
  },
  styles: [
    { tag: t.comment, color: '#9CA3AF' },
    { tag: t.variableName, color: '#93C5FD' },
    { tag: t.string, color: '#6EE7B7' },
    { tag: t.keyword, color: '#C4B5FD' },
    { tag: [t.function(t.variableName)], color: '#93C5FD' },
    { tag: [t.number], color: '#6EE7B7' },
  ],
});

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
          theme="light"
          className={twMerge(
            "language-" + language,
            "dark:prose-invert [&_.cm-editor]:dark:!bg-gray-800 [&_.cm-scroller]:dark:!bg-gray-800 [&_.cm-gutters]:dark:!bg-gray-800 [&_.cm-tooltip]:dark:!bg-gray-700 [&_.cm-tooltip]:dark:!border-gray-600 [&_.cm-activeLine]:dark:!bg-gray-700/50 [&_.cm-activeLineGutter]:dark:!bg-gray-700/50",
            className
          )}
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
