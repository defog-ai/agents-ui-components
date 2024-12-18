import { ChevronRight } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import { useRef, useState } from "react";

export function StepOutputs({
  analysisId,
  stepId,
  step,
  sql = null,
  codeStr = null,
  handleEdit = () => {},
  availableOutputNodes = [],
  setActiveNode,
  showCode = true,
}) {
  //   parse outputs
  //   each output is a node somewhere in the dag

  const codeCtrRef = useRef(null);
  const [codeCollapsed, setCodeCollapsed] = useState(true);

  return (
    <div className="tool-output-list text-xs font-mono">
      <div className="tool-output-data">
        {/* <p className="mb-2 text-gray-400">Datasets</p> */}
        <div className="flex flex-wrap my-2 gap-2">
          {step.outputs_storage_keys.map((output, i) => {
            return (
              <div
                key={i}
                className="cursor-pointer bg-white dark:bg-gray-800 p-2 border border-l-8 border-l-green dark:border-gray-600 dark:border-l-green-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => {
                  const exists = availableOutputNodes.find(
                    (node) => node.data.id === output
                  );
                  if (exists) {
                    setActiveNode(exists);
                  }
                }}
                onMouseOver={(ev) => {
                  // get the closest .analysis-content to the mouseovered element
                  const closest = ev.target.closest(".analysis-content");
                  if (!closest) return;
                  // now get the closest .graph-node with the class name output
                  const node = closest.querySelector(`.graph-node.${output}`);
                  if (!node) return;
                  // add a class highlighted
                  node.classList.add("highlighted");
                }}
                onMouseOut={(ev) => {
                  // get the closest .analysis-content to the mouseovered element
                  const closest = ev.target.closest(".analysis-content");
                  if (!closest) return;
                  // now get the closest .graph-node with the class name output
                  const node = closest.querySelector(`.graph-node.${output}`);
                  if (!node) return;
                  // remove the class highlighted
                  node.classList.remove("highlighted");
                }}
              >
                {output}
              </div>
            );
          })}
        </div>
      </div>
      <div className="tool-code mt-8">
        {sql && (
          <>
            <p className="mb-2 font-bold text-sm">SQL</p>
            <CodeEditor
              key={sql}
              className="tool-code-ctr"
              analysisId={analysisId}
              stepId={stepId}
              code={sql}
              handleEdit={handleEdit}
              updateProp={"sql"}
            ></CodeEditor>
          </>
        )}
        {codeStr && showCode && (
          <>
            <div
              style={{ pointerEvents: "all", cursor: "pointer" }}
              className=""
              onClick={() => {
                setCodeCollapsed(!codeCollapsed);
                // get scroll height of tool-code-ctr inside codeCtrRef
                if (codeCtrRef.current) {
                  const codeCtr =
                    codeCtrRef.current.querySelector(".cm-editor");
                  if (codeCtr) {
                    codeCtrRef.current.style.maxHeight = codeCollapsed
                      ? `${codeCtr.scrollHeight}px`
                      : "0px";
                  }
                }
              }}
            >
              <div className="flex items-center mb-2 my-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <ChevronRight
                  className="w-4 h-4 inline mr-1"
                  style={{
                    transition: "transform 0.3s ease-in-out",
                    marginRight: "3px",
                    top: "1px",
                    transform: codeCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                  }}
                />
                Code
              </div>
            </div>
            <div
              ref={codeCtrRef}
              style={{
                overflow: "hidden",
                maxHeight: "0px",
                transition: "max-height 0.6s ease-in-out",
              }}
            >
              <CodeEditor
                key={codeStr}
                className="tool-code-ctr"
                analysisId={analysisId}
                stepId={stepId}
                code={codeStr}
                language="python"
                handleEdit={handleEdit}
                updateProp={"code_str"}
              ></CodeEditor>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
