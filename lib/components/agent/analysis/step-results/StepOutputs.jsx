import { CodeEditor } from "./CodeEditor";

export function StepOutputs({
  analysisId,
  stepId,
  sql = null,
  handleEdit = (...args) => {},
}) {
  return (
    <div className="tool-output-list text-xs font-mono">
      <div className="tool-code mt-8">
        {sql && (
          <>
            <p className="mb-2 font-bold text-sm">SQL</p>
            <CodeEditor
              className="tool-code-ctr"
              analysisId={analysisId}
              stepId={stepId}
              code={sql}
              handleEdit={handleEdit}
              updateProp={"sql"}
            ></CodeEditor>
          </>
        )}
      </div>
    </div>
  );
}
