import React from "react";
import ReactDOM from "react-dom/client";
import "../lib/styles/index.scss";
import { DefogAnalysisAgentEmbed } from "../lib/main";

function QueryDataPage() {
  return (
    <DefogAnalysisAgentEmbed
      searchBarDraggable={false}
      apiEndpoint={"https://localhost:80/"}
      token={"23ee021b82afa024bee3b52be4d5a2603a4d0056780dd99c93b0caf0c875ea77"}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      dbs={[
        {
          keyName: "Manufacturing",
          name: "Manufacturing",
          predefinedQuestions: ["Show me any 5 rows from the dataset"],
        },
        {
          keyName: "Sales",
          name: "Sales",
          predefinedQuestions: ["Show me any 5 rows from the dataset"],
        },
      ]}
      disableMessages={false}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryDataPage />
  </React.StrictMode>
);
