import { useEffect, useRef, useState } from "react";
import { EmbedContext, createEmbedConfig } from "./EmbedContext";
import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  SkeletalLoader,
} from "@ui-components";
import { twMerge } from "tailwind-merge";
import { initializeSQLite } from "../utils/sqlite";

interface SetupProps {
  /**
   * The hashed password.
   */
  token: string;
  /**
   * User email/name. Default is "admin".
   */
  user: Object;
  /**
   * Hide the raw analysis of results.
   */
  hideRawAnalysis: boolean;
  /**
   * The list of charts that *will be hidden* for.
   */
  hiddenCharts: Array<string>;
  /**
   * Whether to hide the SQL/Code tab for.
   */
  hideSqlTab: boolean;
  /**
   * Whether to hide the "view data structure" and "preview data" tabs for.
   */
  hidePreviewTabs: boolean;
  /**
   * The API endpoint to use for the requests. Default is https://demo.defog.ai.
   */
  apiEndpoint: string;
  /**
   * Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
   */
  showAnalysisUnderstanding: boolean;
  /**
   * Whether to show tool code.
   */
  showCode: boolean;
  /**
   * Whether to allow addition to dashboards.
   */
  allowDashboardAdd: boolean;

  /**
   * Whether to disable messages
   */
  disableMessages: boolean;
  /**
   * The function to run after the setup is complete.
   */
  onSetupComplete?: Function;
  /**
   * The class names for the loader.
   */
  loaderRootClassNames?: string;
  /**
   * The children to render.
   */
  children: React.ReactNode;
}

/**
 * Helps with the context setup. Shows a loader till the sockets connection is established.
 * Sets up all the necessary context that will be used by either of AnalysisTreeViewer, AnalysisAgent, or DefogAnalysisAgentEmbed.
 */
export function Setup({
  token,
  user = "admin",
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  apiEndpoint = "https://demo.defog.ai",
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  disableMessages = false,
  onSetupComplete = () => {},
  loaderRootClassNames = "",
  children,
}: SetupProps) {
  const [socketsConnected, setSocketsConnected] = useState(false);

  const [sqliteConn, setSqliteConn] = useState(null);

  const [analysisConfig, setAnalysisConfig] = useState(
    createEmbedConfig({
      token,
      hideRawAnalysis,
      hiddenCharts,
      showAnalysisUnderstanding,
      hideSqlTab,
      hidePreviewTabs,
      apiEndpoint,
    })
  );

  // update on props change
  useEffect(() => {
    setAnalysisConfig((prev) => ({
      ...prev,
      user,
      token,
      hideRawAnalysis,
      hiddenCharts,
      hideSqlTab,
      hidePreviewTabs,
      showAnalysisUnderstanding,
      showCode,
      allowDashboardAdd,
      apiEndpoint,
      updateConfig: (updates) => {
        setAnalysisConfig((prev) => ({ ...prev, ...updates }));
      },
    }));
  }, [
    user,
    token,
    hideRawAnalysis,
    hiddenCharts,
    hideSqlTab,
    hidePreviewTabs,
    showAnalysisUnderstanding,
    showCode,
    allowDashboardAdd,
    apiEndpoint,
  ]);

  const messageManager = useRef(MessageManager());

  useEffect(() => {
    async function setup() {
      // setup user items
      const userItems = {};

      let conn = null;
      try {
        conn = await initializeSQLite();
      } catch (e) {
        conn = null;
        console.log(e);
      }

      setSqliteConn(conn);

      setAnalysisConfig({
        ...analysisConfig,
        ...userItems,
        sqliteConn: conn,
      });

      setSocketsConnected(true);

      await onSetupComplete();
    }

    setup();
  }, [apiEndpoint, token]);

  return (
    <EmbedContext.Provider value={analysisConfig}>
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
            <div className="mb-2 text-sm text-gray-400">
              Connecting to servers
            </div>
            <SkeletalLoader classNames="w-5 h-5 text-gray-500" />
          </div>
        )}
      </MessageManagerContext.Provider>
    </EmbedContext.Provider>
  );
}
