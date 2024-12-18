import { AnalysisAgent, Setup } from "../../lib/agent";

import "../../lib/styles/index.scss";

export default {
  title: "Agents/AnalysisAgent",
  component: AnalysisAgent,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Analysis Agent component. This needs to be used with AgentContext to work. See examples below.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    searchBarPlaceholder: {
      control: "text",
    },
    onClick: { control: null },
  },
  render: (args) => {
    return (
      <Setup
        token={import.meta.env.VITE_TOKEN}
        apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
        // these are the ones that will be shown for new csvs uploaded
        uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
        showAnalysisUnderstanding={true}
        disableMessages={false}
      >
        <AnalysisAgent {...args} />
      </Setup>
    );
  },
};

const id = crypto.randomUUID();
export const Primary = {
  args: { analysisId: id, keyName: "Restaurants" },
};
