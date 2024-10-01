import React, { useEffect, useMemo, useState } from "react";
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

  const initialTrees = useMemo(() => {
    try {
      const storedTrees = localStorage.getItem("analysisTrees");
      if (storedTrees) {
        return JSON.parse(storedTrees);
      }
    } catch (e) {
      return null;
    }
  }, []);

  return (
    <DefogAnalysisAgentEmbed
      token={import.meta.env.VITE_TOKEN}
      searchBarDraggable={false}
      apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      dbs={apiKeyNames.map((name) => ({
        name: name,
        keyName: name,
        predefinedQuestions: ["show me any 5 rows"],
      }))}
      disableMessages={false}
      initialTrees={initialTrees}
      onTreeChange={(keyName, tree) => {
        try {
          // save in local storage in an object called analysisTrees
          let trees = localStorage.getItem("analysisTrees");
          if (!trees) {
            trees = {};
            localStorage.setItem("analysisTrees", "{}");
          } else {
            trees = JSON.parse(trees);
          }

          trees[keyName] = tree;
          localStorage.setItem("analysisTrees", JSON.stringify(trees));
        } catch (e) {
          console.error(e);
        }
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
