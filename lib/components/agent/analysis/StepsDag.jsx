import { useEffect, useState } from "react";
import { Popover } from "antd";
import { toolDisplayNames } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import {
  PlusCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";
import { createDag } from "../../utils/draw-dag";

const nodeCssSize = 15;

export default function StepsDag({
  steps,
  horizontal = false,
  nodeSize = [5, 5],
  nodeGap = null,
  activeNode = null,
  stageDone = true,
  reRunningSteps = [],
  dag = null,
  setDag = () => {},
  dagLinks = [],
  setDagLinks = () => {},
  setActiveNode = () => {},
  skipAddStepNode = false,
  setLastOutputNodeAsActive = true,
  disablePopovers = false,
  onPopoverOpenChange = () => {},
  alwaysShowPopover = false,
  toolIcon = () => <WrenchScrewdriverIcon className="w-3 h-3" />,
  extraNodeClasses = () => "",
}) {
  const [graph, setGraph] = useState({ nodes: {}, links: [] });
  const [nodes, setNodes] = useState([]);
  const effectDep = JSON.stringify(
    steps.map((d) => {
      // only regenerage dag if step's tool name or error message has changed
      return {
        id: d.id,
        tool_name: d.tool_name,
        error_message: d.error_message,
      };
    }) || []
  );

  useEffect(() => {
    let g = { nodes: {}, links: [] };
    steps.forEach((step) => {
      // each step is a node
      // each resulting variable is a node
      // each input from global dictionaries is also node
      // if exists in nodes, don't do anything
      const stepId = step.id;
      // create node for this step
      g["nodes"][stepId] = {
        id: stepId,
        title: step["tool_name"],
        key: step["tool_name"],
        isError: step.error_message,
        name: step?.["outputs_storage_keys"]?.[0],
        isTool: true,
        parents: new Set(),
        children: [],
        step: step,
      };

      // to find if this step could have parents, we will regex search for all matches for "global_dict.*" in the inputs
      // and get unique parents
      let parents = Object.values(step["inputs"]).reduce((acc, input, i) => {
        let inp = input;
        // if input is a string, convert to array and do
        if (!Array.isArray(input)) {
          inp = [input];
        }

        inp.forEach((i) => {
          // if not a string don't do anything
          if (typeof i !== "string") return acc;

          let matches = [...i.matchAll(/(?:global_dict\.)(\w+)/g)];
          matches.forEach(([_, globalDictInput]) => {
            // acc.add(parent);
            // find which step created this globalDictInput
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              if (step.outputs_storage_keys.includes(globalDictInput)) {
                acc.add(step.id);
              }
            }
          });
        });
        return acc;
      }, new Set());

      parents = Array.from(parents);

      parents.forEach((parent) => {
        // add a link from parent to child
        g["links"].push({
          source: parent,
          target: stepId,
        });

        // add this parent to the list of parents for this step
        g["nodes"][stepId]["parents"].add(parent);
        if (!g["nodes"][parent]) {
          console.log("Error: parent not found for step: ", step);
          console.log(parents, g["nodes"], step);
          return;
        }
        // add this step to the list of children for this parent
        g["nodes"][parent]["children"].push(g["nodes"][stepId]);
      });

      // convert set of parents to list
      g["nodes"][stepId]["parents"] = Array.from(g["nodes"][stepId]["parents"]);

      if (!step.error_message && !skipAddStepNode) {
        // "add step" as a child of this child
        let source = step.id;
        const addStepNodeId = source + "-add";

        // add a child that is basically a plus icon to add another node
        g["nodes"][addStepNodeId] = {
          id: addStepNodeId,
          isAddStepNode: true,
          title: "+",
          key: addStepNodeId,
          isTool: false,
          isError: step.error_message,
          parents: [source],
          children: [],
          step: {
            inputs: {},
            tool_name: null,
            parent_step: step,
          },
        };

        // also add a link
        g["links"].push({
          source: source,
          target: addStepNodeId,
        });
        g["nodes"][source]["children"].push(g["nodes"][addStepNodeId]);
      }
      //   });
      // }

      // for each node, figure out it's "level"
      // level is the number of steps away from a node that has 0 parents
      // a node with 0 parents has level 0

      // go through each node, and go through it's parents
      // Object.values(g["nodes"]).forEach((node) => {
      //   if (node["parents"].length == 0) node["level"] = 0;
      //   else {
      //     // find the parent with the highest level
      //     let highest_level = 0;
      //     node["parents"].forEach((parent_id) => {
      //       if (g["nodes"][parent_id]["level"] > highest_level)
      //         highest_level = g["nodes"][parent_id]["level"];
      //     });
      //     node["level"] = highest_level + 1;
      //   }
      // });
    });

    const { dag, width, height } = createDag(
      Object.values(g["nodes"]).map((d) => ({
        ...d,
        parentIds: d.parents,
      })),
      nodeSize,
      nodeGap
    );

    dag.width = horizontal ? height : width;
    dag.height = horizontal ? width : height;

    const n = [...dag.nodes()];

    setGraph(g);
    setDag(dag);
    setDagLinks([...dag.links()]);
    setNodes(n);
    // also set active node to the leaf node
    try {
      // last step node as active
      const lastStep = steps?.[steps.length - 1];
      const lastStepOutputNode = n?.find((d) => d.data.id === lastStep.id);
      if (lastStepOutputNode) {
        setActiveNode(lastStepOutputNode);
      }
      // if (setLastOutputNodeAsActive) {
      //   // get the first output of this step
      //   const lastStepOutput = lastStep?.["outputs_storage_keys"]?.[0];
      // } else {
      //   // set the first step as active
      //   const firstStep = steps?.[0];
      //   const firstStepNode = n?.find((d) => d.data.id === firstStep.id);
      //   if (firstStepNode) {
      //     setActiveNode(firstStepNode);
      //   }
      // }
    } catch (e) {
      console.log("Error setting active node: ", e);
    }
  }, [effectDep]);

  return (
    <div
      className="analysis-graph p-2 rounded-md overflow-auto"
      key={steps?.length}
    >
      {dag ? (
        <div
          className="graph relative m-auto"
          style={{
            height: dag.height + 100 + "px",
            width: dag?.width + nodeCssSize * 3 + "px",
          }}
        >
          <svg
            className="mx-auto"
            width={dag?.width + nodeCssSize * 3}
            height={"100%"}
            xmlns="http://www.w3.org/1999/xhtml"
          >
            {dagLinks.map((d) => {
              // bezier curve
              const source = d.source;
              const target = d.target;
              const source_x =
                nodeCssSize / 2 + (horizontal ? source.y : source.x);
              const source_y = horizontal ? source.x : source.y + nodeCssSize;
              const target_x =
                nodeCssSize / 2 + (horizontal ? target.y : target.x);
              const target_y = horizontal ? target.x : target.y;
              let pathData = `M ${source_x} ${source_y} L ${target_x} ${target_y}`;

              return (
                <path
                  className={
                    "link" +
                    " " +
                    (target.data.isAddStepNode ? "link-add-node" : "")
                  }
                  id={source.data.id + "-" + target.data.id}
                  d={pathData}
                  stroke="black"
                  fill="none"
                  key={source.data.id + " - " + target.data.id + "-" + pathData}
                />
              );
            })}
          </svg>
          <div className="absolute left-0 top-0 w-full h-full">
            {dag &&
              dag.nodes &&
              nodes.map((d) => {
                const extraProps = {};
                if (alwaysShowPopover) {
                  extraProps.open = activeNode?.data?.id === d.data.id;
                }

                const style = {
                  top: horizontal ? d.x : d.y,
                  left: horizontal
                    ? d.y
                    : d.x - (!d.data.isTool ? 0 : nodeSize[0] / 2),
                };

                return (
                  <div
                    key={d.data.id}
                    style={{
                      top: style.top + "px",
                      left: style.left + "px",
                    }}
                    className="absolute"
                  >
                    <Popover
                      {...extraProps}
                      onOpenChange={(visible) =>
                        onPopoverOpenChange(d, visible)
                      }
                      rootClassName={
                        "graph-node-popover pointer-events-auto" +
                        (d.data.isError ? "popover-error" : "")
                      }
                      placement="left"
                      title={
                        !disablePopovers &&
                        (d?.data?.isAddStepNode
                          ? ""
                          : d?.data?.isTool
                            ? toolDisplayNames[d?.data?.step?.tool_name] || null
                            : `Output`)
                      }
                      content={
                        !disablePopovers &&
                        (d?.data?.isAddStepNode
                          ? "Do additional tasks with this data"
                          : d?.data?.isTool
                            ? d?.data?.step?.description || d.data.id
                            : null)
                      }
                    >
                      <div
                        className={twMerge(
                          "graph-node pointer-events-auto max-w-[100px]",
                          d.data.isTool ? "tool" : "var",
                          d.data.isOutput ? " output" : "",
                          activeNode?.data?.id === d.data.id
                            ? "graph-node-active "
                            : "",
                          d.data.isError ? "graph-node-error" : "",
                          `tool-run-${d.data.id}`,
                          d.data.isAddStepNode
                            ? "graph-node-add bg-transparent"
                            : "bg-white",
                          reRunningSteps.some((s) => s.id === d.data.id)
                            ? "graph-node-re-running"
                            : "",
                          extraNodeClasses(d)
                        )}
                        key={d.data.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveNode(d);
                        }}
                      >
                        {d.data.isTool ? (
                          <>{toolIcon(d)}</>
                        ) : d.data.isAddStepNode ? (
                          <PlusCircleIcon className="h-4 w-4 stroke-gray-500 text-transparent bg-transparent hover:fill-blue-400 hover:stroke-none" />
                        ) : (
                          <div className="graph-node-circle rounded-full w-4 h-4"></div>
                        )}
                      </div>
                    </Popover>
                  </div>
                );
              })}
          </div>
          {!stageDone ? (
            // get one of the leafs of the dag and place a loading icon 20 px below it
            dag && dag.leaves && [...dag.leaves()].length > 0 ? (
              <>
                <div className="graph-node-loading">
                  <div
                    className="graph-node-loading-icon"
                    style={{
                      top: horizontal
                        ? [...dag.leaves()][0].x + nodeCssSize
                        : [...dag.leaves()][0].y + nodeCssSize + 10,
                      left: horizontal
                        ? [...dag.leaves()][0].y
                        : [...dag.leaves()][0].x,
                    }}
                  ></div>
                </div>
              </>
            ) : (
              <></>
            )
          ) : (
            <></>
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
