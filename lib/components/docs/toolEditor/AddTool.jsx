import {
  addTool,
  arrayOfObjectsToObject,
  parseData,
  toolboxDisplayNames,
} from "$utils/utils";
import { useCallback, useContext, useState } from "react";
import ToolCreatorAssistant from "./ToolCreatorAssistant";
import { SparklesIcon } from "@heroicons/react/20/solid";
import DefineTool from "./DefineTool";
import SpinningLoader from "$components/icons/SpinningLoader";
import ToolCodeEditor from "./ToolCodeEditor";
import { twMerge } from "tailwind-merge";
import setupBaseUrl from "$utils/setupBaseUrl";
import {
  MessageManagerContext,
  Modal,
  Toggle,
  Sidebar,
  Input,
  Button,
} from "$ui-components";

const generateToolCodeEndpoint = setupBaseUrl("http", "generate_tool_code");

export default function AddTool({ toolbox, onAddTool = (...args) => {} }) {
  const [modalOpen, setModalOpen] = useState(false);

  const [toolAssistMode, setToolAssistMode] = useState(false);

  const [testingResults, setTestingResults] = useState(null);

  const [tool, setTool] = useState({
    code: "",
    description: "",
    function_name: "",
    input_metadata: {},
    output_metadata: [],
    tool_name: "",
    toolbox: toolbox,
  });

  const toolName = tool.tool_name;
  const toolDocString = tool.description;
  const generatedCode = tool.code;
  const functionName = tool.function_name;

  const messageManager = useContext(MessageManagerContext);

  const [loading, setLoading] = useState(false);

  const handleChange = useCallback(
    (prop, val) => {
      try {
        // if prop doesn't exists on the tool, show error
        if (!tool.hasOwnProperty(prop)) {
          throw new Error(`Tool does not have property ${prop}`);
        }
        setTool((t) => ({ ...t, [prop]: val }));
      } catch (e) {
        messageManager.error(e.message);
      }
    },
    [tool, setTool, messageManager]
  );

  const tryAddTool = async () => {
    setLoading(true);
    try {
      const res = await addTool(tool);

      if (res.success) {
        messageManager.success("Tool added successfully");
        onAddTool(tool);
      } else {
        messageManager.error("Failed to submit tool" + res.error_message);
      }
    } catch (e) {
      console.error(e);
      messageManager.error("Failed to submit tool" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (userQuestion = null) => {
    setLoading(true);
    // if this is first submit
    try {
      const response = await fetch(generateToolCodeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_name: toolName,
          tool_description: toolDocString,
          user_question: userQuestion,
          current_code: generatedCode || null,
        }),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(
          "Failed to generate tool code. " + response.error_message
        );
      }

      const newTool = { ...tool };

      newTool.code = response.generated_code;
      newTool.function_name = response.function_name;

      const newTestingResults = response.testing_results;

      newTestingResults.generatedCode = response.generated_code;

      newTool.input_metadata = arrayOfObjectsToObject(
        newTestingResults.inputs,
        "name",
        ["name", "description", "type"]
      );

      newTool.output_metadata = newTestingResults.outputs.map((d) => ({
        name: "output_df",
        description: "pandas df",
        type: "pandas.core.frame.DataFrame",
      }));

      // go through testing inputs and outputs, and parse all csvs
      newTestingResults.inputs.forEach((input) => {
        // input type contains DataFrame and is string
        if (input.type.indexOf("DataFrame") !== -1) {
          input.parsed = parseData(input.value);
        }
      });

      // go through outputs, and parse the data property on all outputs
      newTestingResults.outputs.forEach((output) => {
        // output type contains DataFrame and is string
        if (output.data) {
          output.parsed = parseData(output.data);
        }
      });

      setTestingResults(newTestingResults);
      setTool(newTool);
    } catch (error) {
      messageManager.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="tool rounded mr-3 mb-3  bg-blue-50 border border-blue-400 flex items-center p-3 cursor-pointer hover:shadow-lg"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center  justify-center text-blue-500">
          <span className="">
            <p className="m-0">+</p>
          </span>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onCancel={(ev) => {
          setModalOpen(false);
        }}
        footer={null}
        className={"w-8/12"}
      >
        <h1 className="text-lg font-bold mb-4">
          Add a tool to the {toolboxDisplayNames[toolbox]} toolbox
        </h1>

        <div className="flex flex-row relative">
          <Sidebar
            location="left"
            title=""
            rootClassNames="min-h-full bg-gray-50"
            contentClassNames={
              "px-2 pt-5 flex flex-col pb-14 rounded-tl-lg relative sm:block grow"
            }
          >
            <div className="pr-4 *:font-sans">
              <DefineTool
                disabled={loading}
                toolName={toolName}
                handleChange={handleChange}
                toolDocString={tool.description}
              />
            </div>
          </Sidebar>

          <div className="content grow flex flex-col items-center justify-center relative pl-8">
            {tool.code ? (
              <>
                <div className="flex flex-row items-start justify-between w-full mb-4 ">
                  <Toggle
                    onToggle={(v) => setToolAssistMode(v)}
                    defaultOn={toolAssistMode}
                    offLabel="Code"
                    onLabel={
                      <span className="flex flex-row items-center">
                        <SparklesIcon className="text-yellow-400 inline w-4 h-4 mr-2"></SparklesIcon>
                        Playground
                      </span>
                    }
                    rootClassNames="self-start"
                  />
                  <Button
                    className={"px-2 text-sm bg-blue-400"}
                    onClick={tryAddTool}
                  >
                    Save
                  </Button>
                </div>

                {toolAssistMode ? (
                  <ToolCreatorAssistant
                    loading={loading}
                    tool={tool}
                    handleChange={handleChange}
                    testingResults={testingResults}
                  />
                ) : (
                  <ToolCodeEditor
                    className="w-full"
                    editable={!loading}
                    toolCode={tool.code}
                    onChange={(v) => handleChange("code", v)}
                  />
                )}
                <Input
                  placeholder="What should we change?"
                  rootClassNames="sticky bottom-0 mt-4 w-full lg:w-6/12 shadow-lg rounded-md"
                  inputClassNames={twMerge(
                    "bg-white border mx-auto h-16 hover:border-blue-500 focus:border-blue-500",
                    loading ? "hover:border-gray-400 focus:border-gray-400" : ""
                  )}
                  disabled={loading}
                  onPressEnter={(ev) => {
                    if (!ev.target.value) {
                      messageManager.error("Can't be blank!");
                      return;
                    }
                    handleSubmit(ev.target.value);
                  }}
                />
              </>
            ) : (
              <div className="">
                <Button
                  className={"p-2 m-4 text-sm border w-60"}
                  disabled={!toolName || !toolDocString || loading}
                  onClick={() => {
                    if (!toolName || !toolDocString) {
                      messageManager.error(
                        "Please fill in the tool name and description"
                      );
                      return;
                    }

                    handleSubmit();
                  }}
                >
                  {loading ? (
                    <>
                      <SpinningLoader fill="text-gray-300" />
                      Generating
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
