import { useCallback, useEffect, useRef, useState } from "react";
import { ToolEditorInput } from "./ToolEditorInput";
import { Table, Modal } from "../../../ui-components/lib/main";
import { CodeBracketSquareIcon } from "@heroicons/react/20/solid";
import ToolCodeEditor from "./ToolCodeEditor";

export function ToolFlow({
  toolName,
  testingResults,
  code,
  handleCodeChange = (...args) => {},
  showCode = true,
}) {
  const inputsCtr = useRef(null);
  const outputsCtr = useRef(null);
  const toolNameNode = useRef(null);
  const svg = useRef(null);
  const [activeInput, setActiveInput] = useState(null);

  const redraw = useCallback(() => {
    if (
      !inputsCtr.current ||
      !outputsCtr.current ||
      !toolNameNode.current ||
      !svg.current
    )
      return;

    // draw bezeir curves from each input's center right
    // to the tool name's left center
    const inputs = inputsCtr.current.childNodes;
    const outputs = outputsCtr.current.childNodes;
    const toolName = toolNameNode.current;
    const svgEl = svg.current;

    const svgRect = svgEl.getBoundingClientRect();

    // first remove all paths

    svgEl.innerHTML = "";

    const inputCoords = Array.from(inputs).map((input) => {
      // relative to svg
      const inputRect = input.getBoundingClientRect();
      return {
        x: inputRect.right - svgRect.left,
        y: inputRect.top - svgRect.top + inputRect.height / 2,
      };
    });

    const outputCoords = Array.from(outputs).map((output) => {
      const outputRect = output.getBoundingClientRect();
      return {
        x: outputRect.left - svgRect.left,
        y: outputRect.top - svgRect.top + outputRect.height / 2,
      };
    });

    const toolNameRect = toolName.getBoundingClientRect();
    const toolNameCoords = {
      x: toolNameRect.left - svgRect.left,
      y: toolNameRect.top - svgRect.top + toolNameRect.height / 2,
      width: toolNameRect.width,
    };

    inputCoords.forEach((inputCoord, i) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute(
        "d",
        `M ${inputCoord.x} ${inputCoord.y} C ${
          inputCoord.x + 100
        } ${inputCoord.y} ${toolNameCoords.x - 100} ${toolNameCoords.y} ${
          toolNameCoords.x
        } ${toolNameCoords.y}`
      );
      path.setAttribute("stroke", "black");
      path.setAttribute("fill", "transparent");
      svgEl.appendChild(path);
    });

    outputCoords.forEach((outputCoord, i) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute(
        "d",
        `M ${toolNameCoords.x + toolNameCoords.width} ${toolNameCoords.y} C ${
          toolNameCoords.x + 100
        } ${toolNameCoords.y} ${outputCoord.x - 100} ${outputCoord.y} ${
          outputCoord.x
        } ${outputCoord.y}`
      );
      path.setAttribute("stroke", "black");
      path.setAttribute("fill", "transparent");
      svgEl.appendChild(path);
    });
  }, []);

  useEffect(() => {
    redraw();
  }, [testingResults]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, []);

  return (
    <>
      {activeInput && (
        <Modal
          open={activeInput}
          onCancel={() => setActiveInput(null)}
          footer={null}
          title={activeInput.type.toUpperCase()}
        >
          {activeInput.type === "table" && (
            <Table
              rows={activeInput.data}
              columns={activeInput.columns}
              skipColumns={["index"]}
              rootClassNames="w-full h-96 border border-gray-200 px-1"
            />
          )}
          {/* render base64 data of the image using input.data */}
          {activeInput.type === "image" && (
            <img
              src={`data:image/png;base64,${activeInput.data}`}
              alt="chart"
            />
          )}
          {/* if code, just show a mono div with code inside */}
          {activeInput.type === "code" && (
            <>
              <ToolCodeEditor
                editable
                toolCode={activeInput.code}
                className="h-96 overflow-scroll"
                onChange={handleCodeChange}
              />
            </>
          )}
        </Modal>
      )}
      <div className="flex flex-row items-center justify-between">
        <div className="absolute left-0 right-0 w-full h-full pointer-events-none">
          <svg ref={svg} width={"100%"} height={"100%"} />
        </div>
        {/* <div className="mb-4 font-bold">Inputs</div> */}
        <div
          className="flex flex-col overflow-auto justify-center items-start z-[1]"
          ref={inputsCtr}
        >
          {testingResults.inputs.map((input, i) => (
            <div
              className="flex flex-col m-4 rounded-md min-w-20 h-20 border shadow-sm"
              key={i}
            >
              <ToolEditorInput
                input={input}
                onClick={(inp) =>
                  setActiveInput({ type: "table", ...inp.parsed })
                }
                isTable={input.type.indexOf("DataFrame") > -1}
              />
            </div>
          ))}
        </div>

        <div
          className="font-bold flex flex-row items-center "
          ref={toolNameNode}
        >
          <div className="rounded-md bg-blue-500 text-white p-1 px-2 ">
            {toolName}
          </div>
          {showCode && (
            <CodeBracketSquareIcon
              className="h-6 w-6 inline-block ml-2 text-blue-200 cursor-pointer hover:text-blue-400 z-[2] bg-white"
              onClick={() => setActiveInput({ type: "code", code: code })}
            />
          )}
        </div>

        <div className="flex flex-col" ref={outputsCtr}>
          {testingResults.outputs.map((output, i) => (
            <div className="flex flex-row m-4" key={i}>
              <div className="flex flex-col m-4 min-w-20 h-20 rounded-md border shadow-sm">
                {output.data && output.parsed && (
                  <ToolEditorInput
                    name="Table"
                    isTable={true}
                    input={output}
                    onClick={(out) =>
                      setActiveInput({ type: "table", ...out.parsed })
                    }
                  />
                )}
              </div>
              {output?.chart_images?.length ? (
                <div className="m-4 w-20 rounded-md border shadow-sm">
                  {output.chart_images.map((d) => (
                    <ToolEditorInput
                      key={d.data}
                      name="Image"
                      isImage={true}
                      input={d}
                      onClick={(d) => {
                        setActiveInput({ type: "image", data: d.data });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <></>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
