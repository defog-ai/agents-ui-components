import { createContext } from "react";
import { Analysis } from "../query-data/analysis/analysisManager";

export interface QueryDataEmbedConfig {
  apiEndpoint: string | null;
  token: string | null;
  hiddenCharts: string[];
  hideSqlTab: boolean;
  hidePreviewTabs: boolean;
  hideRawAnalysis: boolean;
  analysisDataCache: Record<string, Analysis>;
  updateConfig: (config: Partial<QueryDataEmbedConfig>) => void;
}

/**
 * Default agent configuration.
 */
export const defaultQueryDataEmbedConfig: QueryDataEmbedConfig = {
  apiEndpoint: "https://demo.defog.ai",
  hiddenCharts: [],
  hideSqlTab: false,
  hidePreviewTabs: false,
  token: null,
  hideRawAnalysis: true,
  analysisDataCache: {},
  updateConfig: () => {},
};

/**
 * Create analysis configuration.
 */
export function createQueryDataEmbedConfig(
  partialConfig: Partial<QueryDataEmbedConfig> = {}
): QueryDataEmbedConfig {
  // only set defined keys
  const newConfig = Object.assign({}, defaultQueryDataEmbedConfig);

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
export const QueryDataEmbedContext = createContext<QueryDataEmbedConfig>(
  Object.assign({}, defaultQueryDataEmbedConfig)
);
