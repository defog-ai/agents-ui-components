import { useState } from "react";
import {
  AgentConfigContext,
  AnalysisAgent,
  createAgentConfig,
} from "../../lib/agent";

import "../../lib/styles/index.scss";

const agentConfig = createAgentConfig({
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT,
  isTemp: false,
  sqlOnly: false,
  token: import.meta.env.VITE_TOKEN,
});

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
  argTypes: {},
  render: (args) => {
    const [config, setConfig] = useState(agentConfig);
    return (
      <AgentConfigContext.Provider value={{ val: config, update: setConfig }}>
        <AnalysisAgent {...args} />
      </AgentConfigContext.Provider>
    );
  },
};

export const Primary = {
  args: {},
};
