import { SpinningLoader } from "@ui-components";

/**
 * Loading indicator for Oracle Embed
 */
export const OracleLoading = ({ message = "Loading" }: { message?: string }) => {
  console.log("Rendering OracleLoading with message:", message);
  return (
    <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-gray-50 text-gray-400">
      <div className="flex items-center">
        <SpinningLoader /> <span className="ml-2">{message}</span>
      </div>
    </div>
  );
};
