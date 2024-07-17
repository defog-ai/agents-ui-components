import { createContext } from "react";

export const defaultAgentConfig = {
  userItems: {
    analyses: [],
    toolboxes: [],
    metadata: {},
  },
  socketManagers: {
    mainManager: null,
    reRunManager: null,
    toolSocketManager: null,
  },
  dbCreds: {
    dbType: "postgres",
    host: "",
    port: "",
    user: "",
    password: "",
    database: "",
    hasCreds: false,
  },
  recipeShowing: null,
  config: {
    // set things like
    showAnalysis: true,
    showCode: true,
    allowDashboardAdd: true,
  },
};

export const GlobalAgentContext = createContext(null);

export const ToolRunContext = createContext({
  toolRunData: {},
});

export const RelatedAnalysesContext = createContext({});
