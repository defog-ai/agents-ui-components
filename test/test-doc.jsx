import { v4 } from "uuid";
import { Doc } from "../lib/doc";
import React from "react";
import ReactDOM from "react-dom/client";
import "../lib/styles/index.scss";

const docId = v4();

import "@blocknote/mantine/style.css";
import {
  MessageMonitor,
  MessageManager,
  MessageManagerContext,
} from "../lib/ui-components/lib/main";

function DocPage() {
  return (
    <MessageManagerContext.Provider value={MessageManager()}>
      <MessageMonitor />
      <div className="w-full">
        <Doc
          user={"admin"}
          docId={docId}
          token={
            "bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0"
          }
        />
      </div>
    </MessageManagerContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DocPage />
  </React.StrictMode>
);
