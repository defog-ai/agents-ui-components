import { SpinningLoader } from "@ui-components";
import { ToolFlow } from "./ToolFlow";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";

export default function ToolCreatorAssistant({
  tool,
  loading,
  handleChange = (...args) => {},
  testingResults = null,
}) {
  const toolName = tool.tool_name;
  const toolCode = tool.code;
  const setToolCode = (v) => handleChange("code", v);

  return (
    <div className="relative rounded-md min-h-60 w-full">
      {loading && (
        <div className="overlay w-full absolute top-0 left-0 grid place-content-center h-full z-[3] ">
          <div className="absolute top-0 left-0 bg-gray-100 bg-opacity-90 w-full h-full rounded-md"></div>
          <div className="text-gray-800">
            <SpinningLoader />
            Generating
          </div>
        </div>
      )}

      {testingResults.generatedCode !== toolCode && (
        <div className="pointer-events-none text-xs text-rose-400 inset-y-0 my-3 flex items-center">
          <ExclamationCircleIcon className="h-3 w-3 fill-rose-400 mr-1" /> The
          code has been edited since these tests were run. Results might not be
          accurate.
        </div>
      )}

      {testingResults && (
        <ToolFlow
          toolName={toolName}
          testingResults={testingResults}
          code={toolCode}
          handleCodeChange={(v) => setToolCode(v)}
        />
      )}
    </div>
  );
}
