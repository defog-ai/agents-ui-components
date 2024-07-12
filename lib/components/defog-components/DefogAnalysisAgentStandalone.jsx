import React, {
  useContext,
  useEffect,
  useState,
  Fragment,
  useMemo,
} from "react";

import "./standalone-fonts.module.css";
import { v4 } from "uuid";
import {
  GlobalAgentContext,
  RelatedAnalysesContext,
} from "../context/GlobalAgentContext";
import { getAllAnalyses, getAllDashboards } from "../utils/utils";
import ErrorBoundary from "../common/ErrorBoundary";
import setupBaseUrl from "../utils/setupBaseUrl";
import { setupWebsocketManager } from "../utils/websocket-manager";
import { AnalysisVersionViewer } from "./agent/AnalysisVersionViewer";
import { ReactiveVariablesContext } from "../context/ReactiveVariablesContext";

export function DefogAnalysisAgentStandalone({
  analysisId,
  token,
  devMode,
  keyName,
  apiEndpoint,
  autoScroll = true,
  sideBarClasses = "",
  searchBarClasses = "",
  searchBarDraggable = true,
  defaultSidebarOpen = false,
}) {
  const [id, setId] = useState(analysisId || "analysis-" + v4());
  const [globalAgentContext, setDocContext] = useState(
    useContext(GlobalAgentContext)
  );
  const [reactiveContext, setReactiveContext] = useState(
    useContext(ReactiveVariablesContext)
  );
  const [relatedAnalysesContext, setRelatedAnalysesContext] = useState(
    useContext(RelatedAnalysesContext)
  );

  // this is the main socket manager for the agent
  const [socketManager, setSocketManager] = useState(null);
  // this is for editing tool inputs/outputs
  const [toolSocketManager, setToolSocketManager] = useState(null);
  // this is for handling re runs of tools
  const [reRunManager, setReRunManager] = useState(null);

  const [dashboards, setDashboards] = useState([]);

  useEffect(() => {
    async function setup() {
      // setup user items
      const items = globalAgentContext.userItems;
      const analyses = await getAllAnalyses(keyName, apiEndpoint);
      const dashboards = await getAllDashboards(token, keyName, apiEndpoint);
      if (dashboards?.success) {
        setDashboards(dashboards.docs);
      }

      if (analyses && analyses.success) {
        items.analyses = analyses.analyses;
      }

      const urlToConnect = setupBaseUrl(procotol="ws", path="ws", apiEndpoint=apiEndpoint);
      const mgr = await setupWebsocketManager(urlToConnect);
      setSocketManager(mgr);

      const rerunMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/step_rerun")
      );

      setReRunManager(rerunMgr);

      const toolSocketManager = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/edit_tool_run"),
        (d) => console.log(d)
      );
      setToolSocketManager(toolSocketManager);

      setDocContext({
        ...globalAgentContext,
        userItems: items,
        socketManagers: {
          mainManager: mgr,
          reRunManager: rerunMgr,
          toolSocketManager: toolSocketManager,
        },
      });
    }

    setup();

    return () => {
      if (socketManager && socketManager.close) {
        socketManager.close();
        // also stop the timeout
        socketManager.clearSocketTimeout();
      }
      if (reRunManager && reRunManager.close) {
        reRunManager.close();
        reRunManager.clearSocketTimeout();
      }
      if (toolSocketManager && toolSocketManager.close) {
        toolSocketManager.close();
        toolSocketManager.clearSocketTimeout();
      }
    };
  }, [keyName]);

  return (
    <ErrorBoundary>
      <RelatedAnalysesContext.Provider
        value={{
          val: relatedAnalysesContext,
          update: setRelatedAnalysesContext,
        }}
      >
        <ReactiveVariablesContext.Provider
          value={{ val: reactiveContext, update: setReactiveContext }}
        >
          <GlobalAgentContext.Provider
            value={{ val: globalAgentContext, update: setDocContext }}
          >
            <div className="w-full h-full">
              <div className="editor-container h-full p-0">
                <div className="defog-analysis-container h-full">
                  <div
                    data-content-type="analysis"
                    className="m-0 h-full"
                    data-analysis-id={analysisId}
                  >
                    <AnalysisVersionViewer
                      apiEndpoint={apiEndpoint}
                      token={token}
                      dashboards={dashboards}
                      devMode={devMode}
                      keyName={keyName}
                      autoScroll={autoScroll}
                      sideBarClasses={sideBarClasses}
                      searchBarClasses={searchBarClasses}
                      searchBarDraggable={searchBarDraggable}
                      defaultSidebarOpen={defaultSidebarOpen}
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlobalAgentContext.Provider>
        </ReactiveVariablesContext.Provider>
      </RelatedAnalysesContext.Provider>
    </ErrorBoundary>
  );
}
