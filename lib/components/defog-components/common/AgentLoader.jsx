import React, { Suspense, lazy } from "react";
import { twMerge } from "tailwind-merge";

const Lottie = lazy(() => import("lottie-react"));

const AgentLoader = ({
  type = null,
  message = null,
  svg = null,
  lottieData = null,
  children = null,
  classNames,
}) => {
  return (
    <div className={twMerge("agent-loader", classNames)}>
      {svg && svg}
      {lottieData && (
        <Suspense fallback={<div>Loading...</div>}>
          <Lottie animationData={lottieData} loop={true} />
        </Suspense>
      )}
      {type === "error" && <h2>ERROR</h2>}
      {message && <h3>{message}</h3>}
      {children && <div className="searchState-child">{children}</div>}
    </div>
  );
};

export default AgentLoader;
