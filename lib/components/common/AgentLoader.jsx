import React, { Suspense, lazy } from "react";
import { twMerge } from "tailwind-merge";
import { SpinningLoader } from "@defogdotai/ui-components";

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
      {lottieData ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center h-40">
              Loading
              <SpinningLoader classNames="text-gray-400 ml-3" />
            </div>
          }
        >
          <Lottie animationData={lottieData} loop={true} />
          {message && <h3>{message}</h3>}
        </Suspense>
      ) : (
        message && <h3>{message}</h3>
      )}
      {type === "error" && <h2>ERROR</h2>}
      {children && <div className="searchState-child">{children}</div>}
    </div>
  );
};

export default AgentLoader;
