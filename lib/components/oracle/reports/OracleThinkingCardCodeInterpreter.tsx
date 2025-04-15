import { CodeEditor } from "../../../../lib/components/query-data/analysis/analysis-results/CodeEditor";
import { marked } from "marked";
import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import { twMerge } from "tailwind-merge";

export interface ThinkingStepCode {
  id: string;
  function_name: string;
  inputs: {
    question: string;
    [key: string]: any;
  };
  result: {
    analysis_id: string;
    question: string;
    code: string;
    result: string;
    error: string;
    sql: string;
  };
}

export default function OracleThinkingCard({
  step,
}: {
  step: ThinkingStepCode;
}) {
  const { function_name, inputs } = step;
  const { result, sql, code, error } = step.result;

  const [showCode, setShowCode] = useState<boolean>(false);
  const [showSql, setShowSql] = useState<boolean>(false);

  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-dark-text-primary">
        Function: <span className="font-normal">{function_name}</span>
      </h2>

      {/* Show the question from the inputs */}
      {inputs?.question && (
        <div className="mb-3 text-gray-700 dark:text-dark-text-secondary">
          <p className="mb-1 font-medium text-gray-800 dark:text-dark-text-primary">
            Question
          </p>
          <p className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md border-l-2 border-blue-500 dark:border-blue-600 italic text-gray-700 dark:text-dark-text-secondary">
            {inputs.question}
          </p>
        </div>
      )}

      <div
        className="prose dark:prose-invert prose-sm max-w-none py-1"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(marked.parse(result || error)),
        }}
      ></div>

      <div className="flex flex-col gap-4">
        <div>
          {code && (
            <>
              <button
                onClick={() => setShowCode(!showCode)}
                className="w-fit text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded px-2 py-1 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {showCode ? "Hide Code" : "Show Code"}
              </button>
              <div
                className={twMerge(
                  "transition-all",
                  showCode ? "h-96 overflow-scroll" : "h-0 overflow-hidden"
                )}
              >
                <CodeEditor code={code} editable={false} language="python" />
              </div>
            </>
          )}
        </div>

        <div>
          {sql && (
            <>
              <button
                onClick={() => setShowSql(!showSql)}
                className="w-fit text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-t px-2 py-1 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {showSql ? "Hide SQL" : "Show SQL"}
              </button>

              <div
                className={twMerge(
                  "transition-all",
                  showSql ? "h-auto overflow-scroll" : "h-0 overflow-hidden"
                )}
              >
                <CodeEditor code={sql} editable={false} language="sql" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
