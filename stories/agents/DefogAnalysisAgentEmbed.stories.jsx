import { DefogAnalysisAgentEmbed } from "../../lib/agent";
import "../../lib/styles/index.scss";

const dbs = [
  {
    keyName: "Manufacturing",
    name: "Manufacturing",
    predefinedQuestions: [
      "What is the average rejection rate by lot?",
      "Is there a difference in the plasticity of components that are rejected vs accepted?",
    ],
  },
  {
    keyName: "Sales",
    name: "Sales",
    predefinedQuestions: [
      "Who are our top 5 customers by revenue?",
      "What was the month on month change in revenue?",
    ],
  },
];

export default {
  title: "Agents/DefogAnalysisAgentEmbed",
  component: DefogAnalysisAgentEmbed,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {},
};

export const Primary = {
  args: {
    token: import.meta.env.VITE_TOKEN,
    apiEndpoint: import.meta.env.VITE_API_ENDPOINT,
    dbs: dbs,
  },
};
