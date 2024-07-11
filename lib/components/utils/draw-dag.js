import * as d3dag from "d3-dag";

export function createDag(data, nodeSize, nodeGap) {
  // create our builder and turn the raw data into a graph
  const builder = d3dag.graphStratify();
  const graph = builder(data);

  if (!nodeGap) {
    nodeGap = [nodeSize[0] * 4, nodeSize[1] * 10];
  }

  // -------------- //
  // Compute Layout //
  // -------------- //

  // set the layout functions
  // [y size, x size]
  // const nodeSize = [nodeRadius, nodeRadius];

  // here's the layout operator, uncomment some of the settings
  const layout = d3dag
    .sugiyama()
    // .layering(d3dag.layeringLongestPath())
    // .decross(d3dag.decrossOpt())
    // this centers the nodes
    .coord(d3dag.coordGreedy())
    .nodeSize(nodeSize)
    // [y gap, x gap]
    .gap(nodeGap);
  // .tweaks([shape]);

  // actually perform the layout and get the final size
  const { width, height } = layout(graph);

  return { dag: graph, width, height };
}
