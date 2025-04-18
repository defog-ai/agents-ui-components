import React, { StrictMode, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { QueryDataEmbed } from "@agent";
import { SpinningLoader } from "@ui-components";

function QueryDataPage() {
  const [apiProjectNames, setApiProjectNames] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const getApiProjectNames = async (token) => {
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
      },
    );
    if (!res.ok) {
      throw new Error(
        "Failed to get project names - are you sure your network is working?",
      );
    }
    const data = await res.json();
    setApiProjectNames(data.db_names);
  };

  useEffect(() => {
    getApiProjectNames(import.meta.env.VITE_TOKEN);
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

  const projectList = useMemo(() => {
    return !apiProjectNames
      ? null
      : apiProjectNames.map((name) => ({
          name,
          predefinedQuestions: ["show me any 5 rows"],
        }));
  }, [apiProjectNames]);

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
          {projectList ? (
            <QueryDataEmbed
              initialProjectList={projectList}
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
              disableMessages={false}
              initialTrees={initialTrees}
              onTreeChange={(projectName, tree) => {
                try {
                  // save in local storage in an object called analysisTrees
                  let trees = localStorage.getItem("analysisTrees");
                  if (!trees) {
                    trees = {};
                    localStorage.setItem("analysisTrees", "{}");
                  } else {
                    trees = JSON.parse(trees);
                  }

                  trees[projectName] = tree;
                  localStorage.setItem("analysisTrees", JSON.stringify(trees));
                } catch (e) {
                  console.error(e);
                }
              }}
            />
          ) : (
            <SpinningLoader />
          )}
        </div>
      </div>
    </StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
