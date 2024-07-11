import React from "react";

const AgentLoader = ({ type, message, svg, lottie, children }) => {
  return (
    <div className="agent-loader">
      {svg && svg}
      {lottie && lottie}
      {type === "error" && <h2>ERROR</h2>}
      {message && <h3>{message}</h3>}
      {children && <div className="searchState-child">{children}</div>}
    </div>
  );
};

export default AgentLoader;
