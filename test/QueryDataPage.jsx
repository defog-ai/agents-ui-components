import { v4 } from "uuid";
import { DefogAnalysisAgentStandalone } from "../lib/main";
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";
import "@blocknote/mantine/style.css";
import {
  MessageMonitor,
  MessageManagerContext,
  MessageManager,
} from "$ui-components";

console.log(process);
function QueryDataPage() {
  return (
    <MessageManagerContext.Provider value={MessageManager()}>
      <MessageMonitor />
      <DefogAnalysisAgentStandalone
        analysisId={"test"}
        token={
          "bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0"
        }
        devMode={false}
        user={"admin"}
        keyName="analysis"
      />
    </MessageManagerContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryDataPage />
  </React.StrictMode>
);
