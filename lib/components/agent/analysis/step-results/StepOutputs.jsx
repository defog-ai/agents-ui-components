import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { CodeEditor } from "./CodeEditor";
import { useRef, useState } from "react";
import { Tabs } from "@ui-components";

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
                className="cursor-pointer bg-white p-2 border border-l-8 border-l-green rounded-md"
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
            <p className="mb-2 font-bold">SQL</p>
            <CodeEditor
              key={sql}
              className="tool-code-ctr"
              analysisId={analysisId}
              stepId={stepId}
              code={sql}
              handleEdit={handleEdit}
              updateProp={"sql"}
            ></CodeEditor>

            {
            step?.reference_queries?.length > 0 ?
            <>
              <p className="mt-8">
                <span className="font-bold">Reference Queries</span>: amongst the golden queries you uploaded, these queries were selected as reference queries. If there are no related golden queries, then what you see below might be irrelevant</p>
              <Tabs
                disableSingleSelect={true}
                defaultSelected="Question 1"
                tabs={step.reference_queries.map((query, i) => (
                  {
                    name: `Question ${i + 1}`,
                    content: (
                      <pre key={i} className="text-xs text-gray-600 p-2 bg-gray-100 rounded mb-4 whitespace-break-spaces">
                        <div>Question: {query.question}</div>
                        <br/>
                        <div>{query.sql}</div>
                      </pre>
                    )
                  }
                ))}
              />
            </>: null
            }

            {
              step.instructions_used &&
              <>
                <p className="mt-8">
                  <span className="font-bold">Relevant Instructions</span>: these instructions were selected to create this SQL query
                </p>
                <pre className="text-xs text-gray-600 p-2 bg-gray-100 rounded whitespace-break-spaces max-h-64 overflow-auto">
                  {step.instructions_used}
                </pre>
              </>
            }
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
              <div className="flex items-center mb-2 my-5 text-gray-400">
                <ChevronRightIcon
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
