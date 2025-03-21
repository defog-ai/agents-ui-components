import { SpinningLoader } from "@ui-components";

/**
 * Loading indicator for Oracle Embed
 */
export const OracleLoading = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-400">
      <SpinningLoader /> <span>Loading</span>
    </div>
  );
};
