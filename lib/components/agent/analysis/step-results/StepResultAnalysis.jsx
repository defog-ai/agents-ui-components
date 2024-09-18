import { useEffect, useState } from "react";
import { message, Spin } from "antd";
import setupBaseUrl from "../../../utils/setupBaseUrl";

export default function StepResultAnalysis({
  keyName,
  question,
  data_csv,
  apiEndpoint,
  sql,
  image = null,
}) {
  const [toolRunAnalysis, setToolRunAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyseData() {
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
      message.error("Error analysing data");
      return;
    }
    const responseJson = await response.json();
    
    console.log("Received response from server")
    console.log(responseJson);
    setToolRunAnalysis(responseJson.model_analysis);
    setLoading(false);
  }

  useEffect(() => {
    analyseData();
  }, []);

  return (
    <div style={{ whiteSpace: "pre-wrap" }} className="max-w-2xl w-full">
      {loading === true ?
        <>
        <p className="small code p-2">Loading Analysis...</p> <Spin />
        </>
        : <p className="small code p-2">{toolRunAnalysis}</p>
      }
      
    </div>
  );
}
