import { useState } from "react";
import {
  AgentConfigContext,
  AnalysisAgent,
  createAgentConfig,
} from "../../lib/agent";

const agentConfig = createAgentConfig({
  apiEndpoint: "https://demo.defog.ai",
  isTemp: false,
  sqlOnly: false,
  token: "23ee021b82afa024bee3b52be4d5a2603a4d0056780dd99c93b0caf0c875ea77",
});

console.log(agentConfig);

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
