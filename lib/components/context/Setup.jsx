import { useContext, useEffect, useRef, useState } from "react";
import {
  AgentConfigContext,
  createAgentConfig,
  ReactiveVariablesContext,
  RelatedAnalysesContext,
} from "./AgentContext";
import { getToolboxes } from "../utils/utils";
import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  SpinningLoader,
} from "@ui-components";
import { twMerge } from "tailwind-merge";
import { initializeSQLite } from "../utils/sqlite";

/**
 * @typedef {Object} SetupProps
 * @property {String} token - The hashed password.
 * @property {Object=} user - User email/name. Default is "admin".
 * @property {String} apiEndpoint - The API endpoint to use for the requests. Default is https://demo.defog.ai.
 * @property {Boolean=} devMode -  If the component should be in dev mode.
 * @property {Boolean=} showAnalysisUnderstanding - Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
 * @property {Boolean=} showCode - Whether to show tool code.
 * @property {Boolean=} allowDashboardAdd - Whether to allow addition to dashboards.
 * @property {Object=} sqliteConn - The sqlite connection object
 * @property {Boolean=} disableMessages - Whether to disable messages
 * @property {Function=} onSetupComplete - The function to run after the setup is complete.
 * @property {String=} loaderRootClassNames - The class names for the loader.
 * @property {React.ReactNode} children - The children to render.
 */

/**
 * Helps with the context setup. Shows a loader till the sockets connection is established.
 * Sets up all the necessary context that will be used by either of AnalysisTreeViewer, AnalysisAgent, or DefogAnalysisAgentEmbed.
 * @param {SetupProps} props - The props
 */
export function Setup({
  token,
  user = "admin",
  apiEndpoint = "https://demo.defog.ai",
  devMode = false,
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  disableMessages = false,
  onSetupComplete = () => {},
  loaderRootClassNames = "",
  children,
}) {
  const [socketsConnected, setSocketsConnected] = useState(false);

  const [sqliteConn, setSqliteConn] = useState(null);

  const [agentConfig, setAgentConfig] = useState(
    createAgentConfig({
      user,
      token,
      showAnalysisUnderstanding,
      showCode,
      allowDashboardAdd,
      devMode,
      apiEndpoint,
    })
  );

  // update on props change
  useEffect(() => {
    setAgentConfig((prev) => ({
      ...prev,
      user,
      token,
      showAnalysisUnderstanding,
      showCode,
      allowDashboardAdd,
      devMode,
      apiEndpoint,
    }));
  }, [
    user,
    token,
    showAnalysisUnderstanding,
    showCode,
    allowDashboardAdd,
    devMode,
    apiEndpoint,
  ]);

  const messageManager = useRef(MessageManager());

  const [reactiveContext, setReactiveContext] = useState(
    useContext(ReactiveVariablesContext)
  );

  const [relatedAnalysesContext, setRelatedAnalysesContext] = useState(
    useContext(RelatedAnalysesContext)
  );

  useEffect(() => {
    async function setup() {
      // setup user items
      const userItems = {};

      const toolboxes = await getToolboxes(token, apiEndpoint);
      if (toolboxes && toolboxes.success) {
        userItems.toolboxes = toolboxes.toolboxes;
      }

      let conn = null;
      try {
        conn = await initializeSQLite();
      } catch (e) {
        conn = null;
        console.log(e);
      }

      setSqliteConn(conn);

      setAgentConfig({
        ...agentConfig,
        ...userItems,
        sqliteConn: conn,
      });

      setSocketsConnected(true);

      await onSetupComplete();
    }

    setup();
  }, [apiEndpoint, token]);

  return (
    <RelatedAnalysesContext.Provider
      value={{
        val: relatedAnalysesContext,
        update: setRelatedAnalysesContext,
      }}
    >
      <ReactiveVariablesContext.Provider
        value={{ val: reactiveContext, update: setReactiveContext }}
      >
        <AgentConfigContext.Provider
          value={{ val: agentConfig, update: setAgentConfig }}
        >
          <MessageManagerContext.Provider value={messageManager.current}>
            <MessageMonitor
              rootClassNames={"absolute left-0 right-0"}
              disabled={disableMessages}
            />
            {socketsConnected ? (
              children
            ) : (
              <div
                className={twMerge(
                  "w-full h-full min-h-60 flex flex-col justify-center items-center ",
                  loaderRootClassNames
                )}
              >
                <div className="mb-2 text-gray-400 text-sm">
                  Connecting to servers
                </div>
                <SpinningLoader classNames="w-5 h-5 text-gray-500" />
              </div>
            )}
          </MessageManagerContext.Provider>
        </AgentConfigContext.Provider>
      </ReactiveVariablesContext.Provider>
    </RelatedAnalysesContext.Provider>
  );
}
