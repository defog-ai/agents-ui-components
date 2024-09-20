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
          setLoading(false);
          // throw new Error("Error analysing data");
          // return quitely, for backwards compatibility
          return;
        }

        const responseJson = await response.json();

        const analysis = responseJson.model_analysis;
        // analysis is currently a giant blob of text that has full stops in the middle of sentences. It is not very readable. we should split into paragraphs
        // we can split by full stops, but we need to be careful about full stops that are part of numbers, e.g. 1.1

        const paragraphs = analysis.split(". ");
        let newAnalysis = "";
        let currentParagraph = "";
        for (let i = 0; i < paragraphs.length; i++) {
          currentParagraph += paragraphs[i] + ". ";
          if (currentParagraph.length > 100) {
            newAnalysis += currentParagraph + "\n\n";
            currentParagraph = "";
          }
        }

        // if newAnalysis ends with .., remove the last one
        if (newAnalysis.endsWith("..")) {
          newAnalysis = newAnalysis.slice(0, -1);
        }

        setToolRunAnalysis(newAnalysis);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    analyseData();
  }, [data_csv, question]);

  return (
    <div
      style={{ whiteSpace: "pre-wrap" }}
      className="bg-gray-100 rounded my-3 text-sm text-gray-600 p-4"
    >
      {loading === true ? (
        <>
          <p className="small code p-2">
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
