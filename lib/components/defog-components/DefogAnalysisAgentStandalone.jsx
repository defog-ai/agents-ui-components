import React, { useContext, useEffect, useState, Fragment } from "react";

import "./standalone-fonts.module.css";
import { v4 } from "uuid";
import {
  defaultAgentConfig,
  GlobalAgentContext,
  RelatedAnalysesContext,
} from "../context/GlobalAgentContext";
import { getAllAnalyses, getAllDashboards } from "../utils/utils";
import ErrorBoundary from "../common/ErrorBoundary";
import setupBaseUrl from "../utils/setupBaseUrl";
import { setupWebsocketManager } from "../utils/websocket-manager";
import { AnalysisVersionViewer } from "./agent/AnalysisVersionViewer";
import { ReactiveVariablesContext } from "../context/ReactiveVariablesContext";
import { AnalysisVersionManager } from "./agent/analysisVersionManager";
import { twMerge } from "tailwind-merge";
import { SpinningLoader } from "../../ui-components/lib/main";

const defaultManager = AnalysisVersionManager();

export function DefogAnalysisAgentStandalone({
  analysisId = v4(),
  token,
  devMode,
  keyName,
  apiEndpoint,
  autoScroll = true,
  sideBarClasses = "",
  searchBarClasses = "",
  searchBarDraggable = true,
  defaultSidebarOpen = null,
  predefinedQuestions = [],
  config = {},
  analysisVersionManager = defaultManager,
  rootClassNames = "",
}) {
  const [agentConfig, setAgentConfig] = useState(
    Object.assign({}, defaultAgentConfig, {
      config: {
        ...defaultAgentConfig.config,
        ...config,
      },
    })
  );

  const [reactiveContext, setReactiveContext] = useState(
    useContext(ReactiveVariablesContext)
  );
  const [relatedAnalysesContext, setRelatedAnalysesContext] = useState(
    useContext(RelatedAnalysesContext)
  );

  // this is the main socket manager for the agent
  const [mainSocketManager, setMainSocketManager] = useState(null);
  // this is for editing tool inputs/outputs
  const [toolSocketManager, setToolSocketManager] = useState(null);
  // this is for handling re runs of tools
  const [reRunManager, setReRunManager] = useState(null);

  const [dashboards, setDashboards] = useState([]);

  useEffect(() => {
    async function setup() {
      const urlToConnect = setupBaseUrl({
        protocol: "ws",
        path: "ws",
        apiEndpoint: apiEndpoint,
      });
      const mainMgr = await setupWebsocketManager(urlToConnect);
      setMainSocketManager(mainMgr);

      const rerunMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/step_rerun")
      );

      setReRunManager(rerunMgr);

      const toolSocketMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/edit_tool_run"),
        (d) => console.log(d)
      );

      setToolSocketManager(toolSocketMgr);

      // setup user items
      const items = agentConfig.userItems;
      // let analyses, dashboards;
      // if(!config.skipAnalysesFetch) {
      // analyses = await getAllAnalyses(keyName, apiEndpoint);
      // }
      // if(!config.skipDashboardsFetch) {
      // let dashboards = await getAllDashboards(token, keyName, apiEndpoint);
      // if (dashboards?.success) {
      //   setDashboards(dashboards.docs);
      // }
      // }

      // if (analyses && analyses.success) {
      //   items.analyses = analyses.analyses;
      // }

      setAgentConfig({
        ...agentConfig,
        userItems: items,
        socketManagers: {
          mainManager: mainMgr,
          reRunManager: rerunMgr,
          toolSocketManager: toolSocketMgr,
        },
      });
    }

    setup();

    return () => {
      if (mainSocketManager && mainSocketManager.close) {
        mainSocketManager.close();
        // also stop the timeout
        mainSocketManager.clearSocketTimeout();
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
            value={{ val: agentConfig, update: setAgentConfig }}
          >
            <div className={twMerge("w-full h-full", rootClassNames)}>
              <div className="editor-container w-full h-full p-0">
                <div className="defog-analysis-container w-full  h-full">
                  <div
                    data-content-type="analysis"
                    className="m-0 h-full w-full"
                    data-analysis-id={analysisId}
                  >
                    {mainSocketManager?.isConnected?.() &&
                    toolSocketManager?.isConnected?.() &&
                    reRunManager?.isConnected?.() ? (
                      <AnalysisVersionViewer
                        analysisVersionManager={analysisVersionManager}
                        apiEndpoint={apiEndpoint}
                        token={token}
                        dashboards={dashboards}
                        devMode={devMode}
                        keyName={keyName}
                        autoScroll={autoScroll}
                        sideBarClasses={sideBarClasses}
                        searchBarClasses={searchBarClasses}
                        searchBarDraggable={searchBarDraggable}
                        defaultSidebarOpen={() =>
                          defaultSidebarOpen ||
                          (window.innerWidth < 768 ? false : true)
                        }
                        predefinedQuestions={predefinedQuestions}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-center items-center ">
                        <div className="mb-2 text-gray-400 text-sm">
                          Setting up
                        </div>
                        <SpinningLoader classNames="w-5 h-5 text-gray-500" />
                      </div>
                    )}
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
