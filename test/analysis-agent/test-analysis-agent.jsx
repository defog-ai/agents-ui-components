import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { Setup } from "../../lib/components/context/Setup";
import { AnalysisAgent } from "../../lib/agent.ts";
import { AnalysisTreeManager } from "../../lib/components/agent/analysis-tree-viewer/analysisTreeManager";
import { v4 } from "uuid";

const dbs = [
  {
    keyName: "Yelp",
    name: "Yelp",
    predefinedQuestions: [
      "Show me any 5 rows from the dataset",
      "Show me any 40 rows from the dataset",
    ],
    isTemp: false,
    sqlOnly: false,
  },
  {
    keyName: "Restaurants",
    name: "Restaurants",
    predefinedQuestions: ["Show me any 5 rows from the dataset"],
    isTemp: false,
    sqlOnly: false,
  },
];

// a single analysis can only work with one db at a time
function QueryDataPage() {
  const { keyName, metadata, isTemp } = dbs[0];
  const id = v4();
  return (
    <Setup
      token={import.meta.env.VITE_TOKEN}
      apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      disableMessages={false}
    >
      <AnalysisAgent
        analysisId={id}
        keyName={keyName}
        metadata={metadata}
        isTemp={isTemp}
        forceSqlOnly={false}
      />
    </Setup>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryDataPage />
  </React.StrictMode>
);
