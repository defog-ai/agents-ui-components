import { useContext, useEffect, useRef, useState } from "react";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { MessageManagerContext, SpinningLoader } from "@ui-components";

export default function StepResultAnalysis({
  keyName,
  question,
  data_csv,
  apiEndpoint,
  sql,
}) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const messageManager = useContext(MessageManagerContext);

  useEffect(() => {
    async function analyseData() {
      try {
        const urlToConnect = setupBaseUrl({
          protocol: "http",
          path: "analyse_data",
          apiEndpoint: apiEndpoint,
        });

        // send data to the server
        const data = {
          question: question,
          data_csv: data_csv,
          sql: sql,
          key_name: keyName,
        };

        setLoading(true);
        const response = await fetch(urlToConnect, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Error analysing data");
        }

        const responseJson = await response.json();
        setToolRunAnalysis(responseJson.model_analysis);
      } catch (error) {
        console.error(error);
        messageManager.error("Error analysing data");
      } finally {
        setLoading(false);
      }
    }

    analyseData();
  }, []);

  return (
    <div
      style={{ whiteSpace: "pre-wrap" }}
      className="bg-gray-100 rounded my-3 text-xs text-gray-400 p-4"
    >
      {loading === true ? (
        <>
          <p className="">
            <SpinningLoader />
            Loading Analysis
          </p>
        </>
      ) : (
        <p className="">{toolRunAnalysis}</p>
      )}
    </div>
  );
}
