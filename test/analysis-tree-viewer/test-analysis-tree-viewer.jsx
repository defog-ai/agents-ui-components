import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { Setup } from "../../lib/components/context/Setup";
import { AnalysisTreeViewer } from "../../lib/agent.ts";
import { AnalysisTreeManager } from "../../lib/components/query-data/analysis-tree-viewer/analysisTreeManager.ts";

const projects = [
  {
    projectName: "Sales",
    name: "Sales",
    predefinedQuestions: [
      "Show me any 5 rows from the dataset",
      "Show me any 40 rows from the dataset",
    ],
  },
  {
    projectName: "Manufacturing",
    name: "Manufacturing",
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
    d.projectName + "_" + Math.floor(Math.random() * 1000),
  ),
  // do this after so that sqlOnly, and isTemp can be overwritten if defined by the user
  ...d,
}));

// tree viewer can only work with one project at a time

function QueryDataPage() {
  const {
    projectName,
    metadata,
    isTemp,
    analysisTreeManager,
    predefinedQuestions,
  } = projects[0];
  return (
    <Setup
      token={import.meta.env.VITE_TOKEN}
      apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      showAnalysisUnderstanding={true}
      disableMessages={false}
    >
      <div className="h-screen">
        <AnalysisTreeViewer
          projectName={projectName}
          metadata={metadata}
          isTemp={isTemp}
          forceSqlOnly={false}
          analysisTreeManager={analysisTreeManager}
          autoScroll={true}
          sideBarClasses={""}
          searchBarDraggable={false}
          showToggle={true}
          defaultSidebarOpen={true || (window.innerWidth < 768 ? false : true)}
          predefinedQuestions={predefinedQuestions}
        />
      </div>
    </Setup>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<QueryDataPage />);
