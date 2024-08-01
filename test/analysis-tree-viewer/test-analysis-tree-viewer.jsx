import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { Setup } from "../../lib/components/context/Setup";
import { AnalysisTreeViewer } from "../../lib/agent.ts";
import { AnalysisTreeManager } from "../../lib/components/agent/analysis-tree-viewer/analysisTreeManager";

const dbs = [
  {
    keyName: "Yelp",
    name: "Yelp",
    predefinedQuestions: [
      "Show me any 5 rows from the dataset",
      "Show me any 40 rows from the dataset",
    ],
  },
  {
    keyName: "Restaurants",
    name: "Restaurants",
    predefinedQuestions: ["Show me any 5 rows from the dataset"],
  },
].map((d) => ({
  isTemp: false,
  sqlOnly: false,
  metadata: null,
  data: {},
  metadataFetchingError: false,
  analysisTreeManager: AnalysisTreeManager(
    {},
    d.keyName + "_" + Math.floor(Math.random() * 1000)
  ),
  // do this after so that sqlOnly, and isTemp can be overwritten if defined by the user
  ...d,
}));

// tree viewer can only work with one db at a time

function QueryDataPage() {
  const {
    keyName,
    metadata,
    isTemp,
    analysisTreeManager,
    predefinedQuestions,
  } = dbs[0];
  return (
    <Setup
      token={"bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0"}
      apiEndpoint={"http://localhost:80"}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      disableMessages={false}
    >
      <AnalysisTreeViewer
        keyName={keyName}
        metadata={metadata}
        isTemp={isTemp}
        forceSqlOnly={false}
        analysisTreeManager={analysisTreeManager}
        autoScroll={true}
        sideBarClasses={""}
        searchBarDraggable={true}
        showToggle={true}
        defaultSidebarOpen={true || (window.innerWidth < 768 ? false : true)}
        predefinedQuestions={predefinedQuestions}
      />
    </Setup>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryDataPage />
  </React.StrictMode>
);
