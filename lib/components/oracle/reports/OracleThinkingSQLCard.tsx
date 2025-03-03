import React from "react";
import { Table, Tabs } from "@ui-components";
import { CodeEditor } from "../../../../lib/components/query-data/analysis/analysis-results/CodeEditor";

export interface SqlResult {
  analysis_id: string;
  question: string;
  sql: string;
  columns: string[];
  rows: string;
  df_truncated: boolean;
  error: string;
}

export interface ThinkingStepSQL {
  id: string;
  function_name: string;
  inputs: {
    db_name: string;
    question: string;
    [key: string]: any;
  };
  result: SqlResult;
}

export default function OracleThinkingSQLCard({
  step,
}: {
  step: ThinkingStepSQL;
}) {
  let { function_name, result } = step;

  if (!result) {
    result = {} as SqlResult;
  }

  const {
    question,
    sql,
    columns = [],
    rows = "[]",
    error: errorText = "",
    df_truncated = false,
  } = result;

  let error = errorText
    ? errorText
    : !columns || !columns.length
      ? "No results"
      : "";

  // The rows come as a JSON string in `rows`
  let tableRows = [];
  if (rows && !errorText) {
    try {
      tableRows = JSON.parse(rows);
    } catch (err) {
      console.error("Failed to parse rows JSON:", err);
      error = "Failed to parse rows JSON";
    }
  }

  // Count number of rows to display in the badge
  const resultCount = tableRows.length;

  // If there's an error, we'll show an error UI. Otherwise, we show the tabs.
  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border max-h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-dark-text-primary flex items-center">
        <span className="mr-2">SQL Query</span>
        {!error && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
            {resultCount} {resultCount === 1 ? "row" : "rows"}
          </span>
        )}
      </h2>

      {/* Show the question from the step */}
      {question && (
        <div className="mb-3 text-gray-700 dark:text-dark-text-secondary">
          <p className="mb-1 font-medium text-gray-800 dark:text-dark-text-primary">
            Question
          </p>
          <p className="bg-gray-50 dark:bg-dark-bg-tertiary p-2 rounded-md border-l-2 border-blue-500 dark:border-blue-600 italic">
            {question}
          </p>
        </div>
      )}

      {/* Database label */}
      {step.inputs?.db_name && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
            </svg>
            {step.inputs.db_name}
          </span>
        </div>
      )}

      {/* If the step had an error, show it prominently */}
      {error ? (
        <div className="text-red-600 bg-red-100 p-3 rounded-md dark:bg-red-900/20 dark:text-red-400 dark:border dark:border-red-800">
          <div className="flex items-center mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Query Error</strong>
          </div>
          <p>{error}</p>
        </div>
      ) : (
        <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <Tabs
            tabs={[
              {
                name: "Results",
                content: (
                  <div className="relative p-3">
                    {/* If `df_truncated` is true, show a small banner */}
                    {df_truncated && (
                      <div className="text-sm bg-yellow-50 p-2 rounded mb-3 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Results have been truncated
                      </div>
                    )}

                    <Table
                      columns={columns.map((col: string) => ({
                        dataIndex: col,
                        title: col,
                      }))}
                      rows={tableRows}
                      rootClassNames="shadow-sm"
                    />
                  </div>
                ),
              },
              {
                name: "SQL",
                content: (
                  <div className="bg-gray-50 dark:bg-gray-900 p-3">
                    <CodeEditor
                      code={sql || ""}
                      language="sql"
                      editable={false}
                    />
                  </div>
                ),
              },
            ]}
            defaultSelected="Results"
          />
        </div>
      )}
    </div>
  );
}
