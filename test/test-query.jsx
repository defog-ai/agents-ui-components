import React from "react";
import ReactDOM from "react-dom/client";
import "../lib/styles/index.scss";
import { DefogAnalysisAgentEmbed } from "../lib/main";

function QueryDataPage() {
  return (
    <DefogAnalysisAgentEmbed
      token={"bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0"}
      apiEndpoint={"http://localhost:80"}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      dbs={[
        {
          keyName: "Yelp",
          name: "Yelp",
          predefinedQuestions: ["Show me any 5 rows from the dataset"],
        },
        {
          keyName: "Restaurants",
          name: "Restaurants",
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
