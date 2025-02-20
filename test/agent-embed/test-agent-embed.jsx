import React, { StrictMode, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { DefogAnalysisAgentEmbed } from "../../lib/agent";

function QueryDataPage() {
  const [apiDbNames, setApiDbNames] = useState(["Default DB"]);
  const [darkMode, setDarkMode] = useState(false);

  const getApiDbNames = async (token) => {
    const res = await fetch(
      (import.meta.env.VITE_API_ENDPOINT || "") + "/get_db_names",
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
    setApiDbNames(data.db_names);
  };

  useEffect(() => {
    getApiDbNames(import.meta.env.VITE_TOKEN);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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
    <StrictMode>
      <div className="flex flex-col">
        <nav className="bg-gray-800 p-2 text-white h-12 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Query Data</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </nav>
        <div
          className={`h-screen ${darkMode ? "dark bg-gray-900" : "bg-white"}`}
        >
          <DefogAnalysisAgentEmbed
            hiddenCharts={["boxplot", "histogram"]}
            token={import.meta.env.VITE_TOKEN}
            searchBarDraggable={false}
            hidePreviewTabs={false}
            apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
            // these are the ones that will be shown for new csvs uploaded
            uploadedCsvPredefinedQuestions={[
              "Show me any 5 rows from the dataset",
            ]}
            showAnalysisUnderstanding={true}
            dbs={apiDbNames.map((name) => ({
              name: name,
              dbName: name,
              predefinedQuestions: ["show me any 5 rows"],
            }))}
            disableMessages={false}
            initialTrees={initialTrees}
            onTreeChange={(dbName, tree) => {
              try {
                // save in local storage in an object called analysisTrees
                let trees = localStorage.getItem("analysisTrees");
                if (!trees) {
                  trees = {};
                  localStorage.setItem("analysisTrees", "{}");
                } else {
                  trees = JSON.parse(trees);
                }

                trees[dbName] = tree;
                localStorage.setItem("analysisTrees", JSON.stringify(trees));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>
      </div>
    </StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
