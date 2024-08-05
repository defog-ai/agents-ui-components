import { AnalysisTreeViewer } from "../../lib/agent";
import { AnalysisTreeManager } from "../../lib/components/agent/analysis-tree-viewer/analysisTreeManager";
import "../../lib/styles/index.scss";

import { Setup } from "../../lib/components/context/Setup";

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

export default {
  title: "Agents/AnalysisTreeViewer",
  component: AnalysisTreeViewer,
  parameters: {
    layout: "fullscreen",
    actions: {
      handles: ["click"],
    },
  },
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => {
    const {
      keyName,
      metadata,
      isTemp,
      analysisTreeManager,
      predefinedQuestions,
    } = dbs[0];

    return (
      <Setup
        token={import.meta.env.VITE_TOKEN}
        apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
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
  },
};

export const Primary = {
  args: {
    predefinedQuestions: ["Show me 5 rows"],
  },
};
