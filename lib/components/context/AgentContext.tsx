import { createContext } from "react";

export interface AgentConfig {
  devMode: boolean;
  apiEndpoint: string;
  sqliteConn: any;
  user: string | null;
  hiddenCharts: string[];
  hideSqlTab: boolean;
  hidePreviewTabs: boolean;
  token: string | null;
  analyses: any[];
  dashboards: any[];
  analysisDataCache: any;
  toolRunDataCache: any;
  showAnalysisUnderstanding: boolean;
  showCode: boolean;
  allowDashboardAdd: boolean;
}

/**
 * Default agent configuration.
 */
export const defaultAgentConfig: AgentConfig = {
  devMode: false,
  apiEndpoint: "https://demo.defog.ai",
  sqliteConn: null,
  user: null,
  hiddenCharts: [],
  hideSqlTab: false,
  hidePreviewTabs: false,
  token: null,
  analyses: [],
  dashboards: [],
  analysisDataCache: {},
  toolRunDataCache: {},
  showAnalysisUnderstanding: true,
  showCode: true,
  allowDashboardAdd: true,
};

/**
 * Create agent configuration.
 */
export function createAgentConfig(partialConfig: Partial<AgentConfig> = {}): AgentConfig {
  // only set defined keys
  const newConfig = Object.assign({}, defaultAgentConfig);

  Object.keys(partialConfig).forEach((key) => {
    if (partialConfig[key] !== undefined) {
      newConfig[key] = partialConfig[key];
    }
  });

  return newConfig;
}


// defining this so explicitly here only to allow vscode's intellisense to work
// we can also just do createContext()
// but defining this here lets jsdoc + intellisense play together nicely
export const AgentConfigContext = createContext({
  val: Object.assign({}, defaultAgentConfig),
  update: function (newVal: any) {
    // if function is passed, call it with current value
    if (typeof newVal === "function") {
      this.val = newVal(this.val);
    } else {
      // just set
      this.val = Object.assign({}, newVal);
    }
  },
});

export const RelatedAnalysesContext = createContext({
  val: {},
  update: function (newVal: any) {
    // if function is passed, call it with current value
    if (typeof newVal === "function") {
      this.val = newVal(this.val);
    } else {
      // just set
      this.val = Object.assign({}, newVal);
    }
  },
});

export const ReactiveVariablesContext = createContext({});
