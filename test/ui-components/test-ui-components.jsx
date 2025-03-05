import React from "react";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { TextArea, useWindowSize } from "@ui-components";

function TestWindowSizeHook() {
  const size = useWindowSize();
  return <div>Run npm run storybook to see the ui components.</div>;
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <TestWindowSizeHook />,
);
