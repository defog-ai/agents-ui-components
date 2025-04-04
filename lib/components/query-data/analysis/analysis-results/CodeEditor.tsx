import { useState, useEffect, useRef } from "react";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { twMerge } from "tailwind-merge";
import ErrorBoundary from "../../../common/ErrorBoundary";

export function CodeEditor({
  code = null,
  language = "sql",
  updateProp = null,
  className = "",
  handleEdit,
  editable = true,
}: {
  code?: string;
  language?: string;
  updateProp?: string;
  className?: string;
  handleEdit?: (prop: string, val: string | Array<any>) => void;
  editable?: boolean;
}) {
  const [toolCode, setToolCode] = useState(code || "");
  const editorRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = !!document.querySelector(".dark");
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    const rootObserver = new MutationObserver(checkDarkMode);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
      childList: true,
    });

    // Check for dark mode changes on window events
    window.addEventListener("storage", checkDarkMode);

    // Check for media query changes (system preference)
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      rootObserver.disconnect();
      window.removeEventListener("storage", checkDarkMode);
      mediaQuery.removeEventListener("change", checkDarkMode);
    };
  }, []);

  useEffect(() => {
    setToolCode(code || "");
  }, [code]);

  const updateCodeAndSql = (newVal: string) => {
    // update values of the code and the SQL
    if (!newVal) return;

    // Update local state first
    setToolCode(newVal);

    // Notify parent of the change
    handleEdit(updateProp, newVal);
  };

  const handleCodeChange = (val) => {
    updateCodeAndSql(val);
  };

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
          theme={isDarkMode ? "dark" : "light"}
          className={twMerge(
            "language-" + language,
            "dark:prose-invert [&_.cm-editor]:dark:!bg-gray-800 [&_.cm-scroller]:dark:!bg-gray-800 [&_.cm-gutters]:dark:!bg-gray-800 [&_.cm-tooltip]:dark:!bg-gray-700 [&_.cm-tooltip]:dark:!border-gray-600 [&_.cm-activeLine]:dark:!bg-gray-700/50 [&_.cm-activeLineGutter]:dark:!bg-gray-700/50",
            className
          )}
          value={toolCode}
          onChange={(val) => {
            handleCodeChange(val);
          }}
          editable={editable}
          ref={editorRef}
        />
      </>
    </ErrorBoundary>
  );
}
