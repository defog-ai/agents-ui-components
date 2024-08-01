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
        devMode={false}
        user={"admin"}
        token={
          "bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0"
        }
        keyName={"Manufacturing"}
        docId={docId}
        showAnalysisUnderstanding={false}
        showCode={true}
        allowDashboardAdd={true}
        isTemp={false}
        apiEndpoint={"http://localhost"}
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
