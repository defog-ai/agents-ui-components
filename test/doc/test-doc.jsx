import { v4 } from "uuid";
import { Doc } from "../../lib/doc";
import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";

const docId = v4();

import "@blocknote/mantine/style.css";

function DocPage() {
  return (
    <div className="w-full">
      <Doc
        token={import.meta.env.VITE_TOKEN}
        apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
        devMode={false}
        user={"admin"}
        keyName={"Manufacturing"}
        docId={docId}
        showAnalysisUnderstanding={false}
        showCode={true}
        allowDashboardAdd={true}
        isTemp={false}
        metadata={null}
        sqlOnly={false}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  <DocPage />
  // </React.StrictMode>
);
