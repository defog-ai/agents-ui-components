import { createContext } from "react";

/**
 * @typedef {Object} AgentConfig
 * @property {string|null} keyName - Api key name.
 * @property {boolean|null} isTemp - Whether it is a temporary DB aka CSV upload
 * @property {boolean|null} devMode - Whether it is in development mode.
 * @property {string|null} apiEndpoint - API endpoint.
 * @property {Object|null} metadata - Database's metadata information. Only used in case of CSV uploads.
 * @property {Object|null} sqliteConn - SQLite connection. Used when querying CSVs.
 * @property {Array} analyses - List of analyses for this user.
 * @property {Array} toolboxes - List of toolboxes for this user.
 * @property {Array} dashboards - List of dashboards for this user.
 * @property {Object} analysisDataCache - Cache for analysis data. (Only those that have been opened/created in this "Session")
 * @property {Object} toolRunDataCache - Cache for tool run data. (Only those that have been opened/created in this "Session")
 * @property {string|null} user - User email/name.
 * @property {string|null} token - Token aka hashed password. NOT api key.
 *
 * @property {Object|null} mainManager - Main websocket manager.
 * @property {Object|null} reRunManager - Re-run websocket manager.
 * @property {Object|null} toolSocketManager - Tool websocket manager.
 *
 * @property {boolean} showAnalysisUnderstanding - Poorly named. Whether to show "analysis understanding" aka description of the results of a step under the table of that step.
 * @property {boolean} showCode - Whether to show tool code.
 * @property {boolean} allowDashboardAdd - Whether to allow addition to dashboards.
 * @property {boolean} sqlOnly - Whether the analysis is SQL only.
 */

/**
 * Default agent configuration.
 * @type {AgentConfig}
 */
export const defaultAgentConfig = {
  isTemp: null,
  keyName: null,
  devMode: null,
  apiEndpoint: null,
  metadata: null,
  sqliteConn: null,
  user: null,
  token: null,
  analyses: [],
  toolboxes: [],
  dashboards: [],
  analysisDataCache: {},
  toolRunDataCache: {},
  mainManager: null,
  reRunManager: null,
  toolSocketManager: null,
  showAnalysisUnderstanding: true,
  showCode: true,
  allowDashboardAdd: true,
  sqlOnly: false,
};

/**
 * Create agent configuration.
 * @param {object} partialConfig - Partial agent configuration.
 * @returns {AgentConfig} - Agent configuration.
 */
export function createAgentConfig(partialConfig = {}) {
  // only set defined keys
  const newConfig = Object.assign({}, defaultAgentConfig);

  for (const key in partialConfig) {
    if (partialConfig[key] !== undefined) {
      newConfig[key] = partialConfig[key];
    }
  }

  return newConfig;
}

export const AgentConfigContext = createContext({
  val: Object.assign({}, defaultAgentConfig),
  update: function (newVal) {
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
  update: function (newVal) {
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
