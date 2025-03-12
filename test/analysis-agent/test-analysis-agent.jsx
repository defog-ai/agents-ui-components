import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { Setup } from "../../lib/components/context/Setup";
import { AnalysisAgent } from "../../lib/agent.ts";

const projects = [
  {
    projectName: "Sales",
    name: "Sales",
    predefinedQuestions: [
      "Show me any 5 rows from the dataset",
      "Show me any 40 rows from the dataset",
    ],
    isTemp: false,
    sqlOnly: false,
  },
  {
    projectName: "Manufacturing",
    name: "Manufacturing",
    predefinedQuestions: ["Show me any 5 rows from the dataset"],
    isTemp: false,
    sqlOnly: false,
  },
];

// a single analysis can only work with one project at a time
function QueryDataPage() {
  const { projectName, metadata, isTemp } = projects[0];
  const id = crypto.randomUUID();
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
        projectName={projectName}
        metadata={metadata}
        isTemp={isTemp}
        forceSqlOnly={false}
      />
    </Setup>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
