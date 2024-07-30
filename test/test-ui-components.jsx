import React from "react";
import ReactDOM from "react-dom/client";
import "../lib/styles/index.scss";
import { TextArea, useWindowSize } from "@defogdotai/ui-components";

function TestWindowSizeHook() {
  const size = useWindowSize();
  return (
    <div>
      <TextArea value={size.join(",")} />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    
    <TestWindowSizeHook />
  </React.StrictMode>
);
