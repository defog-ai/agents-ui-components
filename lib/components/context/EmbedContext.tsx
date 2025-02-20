import { createContext } from "react";
import { Analysis } from "../agent/analysis/analysisManager";

export interface EmbedConfig {
  apiEndpoint: string | null;
  token: string | null;
  sqliteConn: any;
  hiddenCharts: string[];
  hideSqlTab: boolean;
  hidePreviewTabs: boolean;
  hideRawAnalysis: boolean;
  showAnalysisUnderstanding: boolean;
  analysisDataCache: Record<string, Analysis>;
  updateConfig: (config: Partial<EmbedConfig>) => void;
}

/**
 * Default agent configuration.
 */
export const defaultEmbedConfig: EmbedConfig = {
  apiEndpoint: "https://demo.defog.ai",
  sqliteConn: null,
  hiddenCharts: [],
  hideSqlTab: false,
  hidePreviewTabs: false,
  token: null,
  hideRawAnalysis: true,
  showAnalysisUnderstanding: true,
  analysisDataCache: {},
  updateConfig: () => {},
};

/**
 * Create analysis configuration.
 */
export function createEmbedConfig(
  partialConfig: Partial<EmbedConfig> = {}
): EmbedConfig {
  // only set defined keys
  const newConfig = Object.assign({}, defaultEmbedConfig);

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
export const EmbedContext = createContext<EmbedConfig>(
  Object.assign({}, defaultEmbedConfig)
);
