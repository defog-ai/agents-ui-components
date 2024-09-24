import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { DefogAnalysisAgentEmbed } from "../../lib/agent";

function QueryDataPage() {
  const [apiKeyNames, setApiKeyNames] = useState(["Default DB"]);

  const getApiKeyNames = async (token) => {
    const res = await fetch(
      (import.meta.env.VITE_API_ENDPOINT || "") + "/get_api_key_names",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(
        "Failed to get api key names - are you sure your network is working?"
      );
    }
    const data = await res.json();
    setApiKeyNames(data.api_key_names);
  };

  useEffect(() => {
    getApiKeyNames(import.meta.env.VITE_TOKEN);
  }, []);

  return (
    <DefogAnalysisAgentEmbed
      token={import.meta.env.VITE_TOKEN}
      apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      dbs={apiKeyNames.map((name) => ({
        name: name,
        keyName: name,
        predefinedQuestions: [],
      }))}
      disableMessages={false}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
