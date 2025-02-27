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

  // If there's an error, we'll show an error UI. Otherwise, we show the tabs.
  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-dark-text-primary">
        Function: <span className="font-normal">{function_name}</span>
      </h2>
      {/* Show the question from the step */}
      {question && (
        <p className="mb-2 text-gray-700 dark:text-dark-text-secondary">
          <strong className="text-gray-800 dark:text-dark-text-primary">Question:</strong> {question}
        </p>
      )}

      {/* If the step had an error, show it prominently */}
      {error ? (
        <div className="text-red-600 bg-red-100 p-3 rounded-md dark:bg-red-900/20 dark:text-red-400 dark:border dark:border-red-800">
          <strong>Error:</strong> {error}
        </div>
      ) : (
        <Tabs
          tabs={[
            {
              name: "Results",
              content: (
                <div className="relative">
                  {/* If `df_truncated` is true, you could show a small banner, for example: */}
                  {df_truncated && (
                    <div className="text-sm bg-yellow-50 p-2 rounded mb-2 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                      Note: Results have been truncated
                    </div>
                  )}

                  <Table
                    columns={columns.map((col: string) => ({
                      dataIndex: col,
                      title: col,
                    }))}
                    rows={tableRows}
                  />
                </div>
              ),
            },
            {
              name: "SQL",
              content: (
                <CodeEditor code={sql || ""} language="sql" editable={false} />
              ),
            },
          ]}
          defaultSelected="Results"
        />
      )}
    </div>
  );
}
