import { useEffect, useState } from "react";
import { setupWebsocketManager } from "../../utils/websocket-manager";
import { message } from "antd";
import setupBaseUrl from "../../utils/setupBaseUrl";
import { SpinningLoader } from "../../../ui-components/lib/main";

export default function ToolRunAnalysis({ question, data_csv, apiEndpoint, image = null }) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");
  const [socketManager, setSocketManager] = useState(null);

  function onMessage(event) {
    try {
      if (!event.data) {
        message.error(
          "Something went wrong. Please try again or contact us if this persists."
        );
      }

      const response = JSON.parse(event.data);

      if (response && response.model_analysis) {
        setToolRunAnalysis((prev) => {
          return (prev ? prev : "") + response.model_analysis;
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    async function setup() {
      const urlToConnect = setupBaseUrl(protocol="ws", path="analyse_data", apiEndpoint=apiEndpoint);
      try {
        const mgr = await setupWebsocketManager(urlToConnect, onMessage);
        setSocketManager(mgr);
        mgr.send({
          question,
          data: data_csv,
          image: image ? image[0]?.path : null,
        });
      } catch (error) {
        console.log(error);
      }
    }

    setup();

    return () => {
      if (socketManager && socketManager.close) {
        socketManager.close();
        // also stop the timeout
        socketManager.clearSocketTimeout();
      }
    };
  }, []);

  return (
    toolRunAnalysis.slice(0, 4) !== "NONE" && (
      <div style={{ whiteSpace: "pre-wrap" }} className="max-w-2xl w-full">
        {!toolRunAnalysis || toolRunAnalysis === "" ? (
          <div>
            <SpinningLoader classNames="text-gray-800 mr-0" /> Loading
            analysis...
          </div>
        ) : (
          <p className="small code p-2">{toolRunAnalysis}</p>
        )}
      </div>
    )
  );
}
