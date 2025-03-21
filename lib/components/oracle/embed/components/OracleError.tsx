import React from "react";

/**
 * Error display component for Oracle Embed
 */
export const OracleError = ({ error }: { error: string }) => {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-rose-50 text-rose-500">
      Error: {error}
    </div>
  );
};
