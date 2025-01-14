import React from "react";
import { twMerge } from "tailwind-merge";
import { SpinningLoader } from "@ui-components";

const AgentLoader = ({
  type = null,
  message = null,
  svg = null,
  children = null,
  classNames,
}: {
  type?: string | null;
  message?: string | null;
  svg?: React.ReactNode;
  children?: React.ReactNode;
  classNames?: string;
}) => {
  return (
    <div className={twMerge("agent-loader", classNames)}>
      {svg && svg}
      <div className="w-full h-40 flex text-sm flex-col items-center justify-center">
        {message}
        <SpinningLoader classNames="text-gray-400 mt-3 mx-0" />
      </div>
      {type === "error" && <h2>ERROR</h2>}
      {children && <div className="searchState-child">{children}</div>}
    </div>
  );
};

export default AgentLoader;
