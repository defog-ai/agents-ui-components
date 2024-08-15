import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { DefogAnalysisAgentEmbed } from "../../lib/agent";

function QueryDataPage() {
  return (
    <DefogAnalysisAgentEmbed
      token={import.meta.env.VITE_TOKEN}
      apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      dbs={[
        {
          keyName: "Demo 1",
          name: "Demo 1",
          predefinedQuestions: [
            "Show me any 5 rows from the dataset",
            "Show me any 40 rows from the dataset",
          ],
        },
        {
          keyName: "Demo 2",
          name: "Demo 2",
          predefinedQuestions: ["Show me any 5 rows from the dataset"],
        },
      ]}
      disableMessages={false}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryDataPage />
);
