import { DefogAnalysisAgentEmbed } from "../../lib/agent";
import "../../lib/styles/index.scss";

const dbs = [
  {
    dbName: "Restaurants",
    name: "Restaurants",
    predefinedQuestions: [
      "Show me 5 rows",
      "Is there a difference in the plasticity of components that are rejected vs accepted?",
    ],
  },
  {
    dbName: "Yelp",
    name: "Yelp",
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

export const SingleDB = {
  title: "Only one DB autoselect",
  args: {
    token: import.meta.env.VITE_TOKEN,
    apiEndpoint: import.meta.env.VITE_API_ENDPOINT,
    dbs: dbs.slice(1),
  },
};
