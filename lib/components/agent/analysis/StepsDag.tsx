import { useEffect, useState } from "react";
import { Popover } from "antd";
import { toolDisplayNames } from "../../utils/utils";
import { twMerge } from "tailwind-merge";
import { CirclePlus, Wrench } from "lucide-react";
import { createDag } from "../../utils/draw-dag";
import { Step } from "./analysisManager";

export interface DagNode {
  id: string;
  title: string;
  key: string;
  isError?: string | null;
  name?: string;
  isTool: boolean;
  parents: string[] | Set<string>;
  children: DagNode[];
  step: Partial<Step>;
  isAddStepNode?: boolean;
  isOutput?: boolean;
  data?: {
    id: string;
    isAddStepNode?: boolean;
    isTool?: boolean;
    isError?: string;
    step?: Step;
    isOutput?: boolean;
    name?: string;
  };
  x: number;
  y: number;
  descendants?: () => DagNode[];
  ancestors?: DagNode[];
}

export interface DagLink {
  source: DagNode;
  target: DagNode;
}

interface Graph {
  nodes: Record<string, DagNode>;
  links: DagLink[];
}

export interface DagResult {
  dag: {
    nodes: () => DagNode[];
    links: () => DagLink[];
    leaves: () => DagNode[];
    width: number;
    height: number;
  };
  width: number;
  height: number;
}

interface StepsDagProps {
  steps: Step[];
  horizontal?: boolean;
  nodeSize?: [number, number];
  nodeGap?: number | number[] | null;
  activeNode?: DagNode | null;
  stageDone?: boolean;
  reRunningSteps?: Step[];
  dag?: DagResult["dag"] | null;
  setDag?: (dag: DagResult["dag"]) => void;
  dagLinks?: DagLink[];
  setDagLinks?: (links: DagLink[]) => void;
  setActiveNode?: (node: DagNode) => void;
  skipAddStepNode?: boolean;
  setLastOutputNodeAsActive?: boolean;
  disablePopovers?: boolean;
  onPopoverOpenChange?: (node: DagNode, open: boolean) => void;
  alwaysShowPopover?: boolean;
  toolIcon?: (node: DagNode) => React.ReactNode;
  extraNodeClasses?: (node: DagNode) => string;
}

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
  toolIcon = () => <Wrench className="w-3 h-3" />,
  extraNodeClasses = () => "",
}: StepsDagProps) {
  const [graph, setGraph] = useState<Graph>({ nodes: {}, links: [] });
  const [nodes, setNodes] = useState<DagNode[]>([]);

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
    let g: Graph = { nodes: {}, links: [] };
    steps.forEach((step) => {
      const stepId = step.id;
      g.nodes[stepId] = {
        id: stepId,
        title: step.tool_name || "",
        key: step.tool_name || "",
        isError: step.error_message,
        name: step.outputs_storage_keys?.[0],
        isTool: true,
        parents: new Set<string>(),
        children: [],
        step: step,
        x: 0,
        y: 0,
      };

      let parents = Object.values(step.inputs).reduce(
        (acc: Set<string>, input) => {
          let inp = Array.isArray(input) ? input : [input];

          inp.forEach((i) => {
            if (typeof i !== "string") return;

            let matches = [...i.matchAll(/(?:global_dict\.)(\w+)/g)];
            matches.forEach(([_, globalDictInput]) => {
              for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step.outputs_storage_keys.includes(globalDictInput)) {
                  acc.add(step.id);
                }
              }
            });
          });
          return acc;
        },
        new Set<string>()
      );

      const parentIds = Array.from(parents);

      parentIds.forEach((parentId) => {
        if (!g.nodes[parentId]) {
          console.log("Error: parent not found for step: ", step);
          console.log(parentIds, g.nodes, step);
          return;
        }

        g.links.push({
          source: g.nodes[parentId],
          target: g.nodes[stepId],
        });

        (g.nodes[stepId].parents as Set<string>).add(parentId);
        g.nodes[parentId].children.push(g.nodes[stepId]);
      });

      g.nodes[stepId].parents = Array.from(
        g.nodes[stepId].parents as Set<string>
      );

      if (!step.error_message && !skipAddStepNode) {
        const source = step.id;
        const addStepNodeId = source + "-add";

        g.nodes[addStepNodeId] = {
          id: addStepNodeId,
          title: "+",
          key: addStepNodeId,
          isTool: false,
          isError: step.error_message,
          parents: [source],
          children: [],
          step: {
            id: addStepNodeId,
            tool_name: null,
            outputs_storage_keys: [],
            inputs: {},
            parent_step: step,
          },
          isAddStepNode: true,
          x: 0,
          y: 0,
        };

        g.links.push({
          source: g.nodes[source],
          target: g.nodes[addStepNodeId],
        });
        g.nodes[source].children.push(g.nodes[addStepNodeId]);
      }
    });

    const {
      dag: newDag,
      width,
      height,
    } = createDag(
      Object.values(g.nodes).map((d) => ({
        ...d,
        parentIds: Array.isArray(d.parents) ? d.parents : Array.from(d.parents),
        data: {
          id: d.id,
          isAddStepNode: d.isAddStepNode,
          isTool: d.isTool,
          isError: d.isError,
          step: d.step,
          isOutput: d.isOutput,
        },
      })),
      nodeSize,
      nodeGap
    ) as unknown as DagResult;

    newDag.width = horizontal ? height : width;
    newDag.height = horizontal ? width : height;

    const n = [...newDag.nodes()];

    setGraph(g);
    setDag(newDag);
    setDagLinks([...newDag.links()]);
    setNodes(n);

    try {
      const lastStep = steps[steps.length - 1];
      const lastStepOutputNode = n.find((d) => d.data?.id === lastStep?.id);
      if (lastStepOutputNode && setLastOutputNodeAsActive) {
        setActiveNode(lastStepOutputNode);
      }
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
              const source = d.source;
              const target = d.target;
              const source_x =
                nodeCssSize / 2 + (horizontal ? source.y : source.x);
              const source_y = horizontal ? source.x : source.y + nodeCssSize;
              const target_x =
                nodeCssSize / 2 + (horizontal ? target.y : target.x);
              const target_y = horizontal ? target.x : target.y;
              const pathData = `M ${source_x} ${source_y} L ${target_x} ${target_y}`;

              return (
                <path
                  className={twMerge(
                    "link",
                    target.data?.isAddStepNode ? "link-add-node" : ""
                  )}
                  id={source.data?.id + "-" + target.data?.id}
                  d={pathData}
                  stroke="black"
                  fill="none"
                  key={
                    source.data?.id + " - " + target.data?.id + "-" + pathData
                  }
                />
              );
            })}
          </svg>
          <div className="absolute left-0 top-0 w-full h-full">
            {dag &&
              nodes.map((d) => {
                const extraProps: { open?: boolean } = {};
                if (alwaysShowPopover) {
                  extraProps.open = activeNode?.data?.id === d.data?.id;
                }

                const style = {
                  top: horizontal ? d.x : d.y,
                  left: horizontal
                    ? d.y
                    : d.x - (!d.data?.isTool ? 0 : nodeSize[0] / 2),
                };

                return (
                  <div
                    key={d.data?.id}
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
                      rootClassName={twMerge(
                        "graph-node-popover pointer-events-auto",
                        d.data?.isError ? "popover-error" : ""
                      )}
                      placement="left"
                      title={
                        !disablePopovers &&
                        (d.data?.isAddStepNode
                          ? ""
                          : d.data?.isTool
                            ? toolDisplayNames[d.data?.step?.tool_name || ""] ||
                              null
                            : `Output`)
                      }
                      content={
                        !disablePopovers &&
                        (d.data?.isAddStepNode
                          ? "Do additional tasks with this data"
                          : d.data?.isTool
                            ? d.data?.step?.description || d.data?.id
                            : null)
                      }
                    >
                      <div
                        className={twMerge(
                          "graph-node pointer-events-auto max-w-[100px]",
                          d.data?.isTool ? "tool" : "var",
                          d.data?.isOutput ? " output" : "",
                          activeNode?.data?.id === d.data?.id
                            ? "graph-node-active"
                            : "",
                          d.data?.isError ? "graph-node-error" : "",
                          `tool-run-${d.data?.id}`,
                          d.data?.isAddStepNode
                            ? "graph-node-add bg-transparent"
                            : "bg-white",
                          reRunningSteps.some((s) => s.id === d.data?.id)
                            ? "graph-node-re-running"
                            : "",
                          extraNodeClasses(d)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveNode(d);
                        }}
                      >
                        {d.data?.isTool ? (
                          <>{toolIcon(d)}</>
                        ) : d.data?.isAddStepNode ? (
                          <CirclePlus className="h-4 w-4 stroke-gray-500 text-transparent bg-transparent hover:fill-blue-400 hover:stroke-none" />
                        ) : (
                          <div className="graph-node-circle rounded-full w-4 h-4"></div>
                        )}
                      </div>
                    </Popover>
                  </div>
                );
              })}
          </div>
          {!stageDone && dag.leaves && [...dag.leaves()].length > 0 ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
