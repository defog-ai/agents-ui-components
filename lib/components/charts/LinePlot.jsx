import { useState, useEffect, useRef } from "react";
import { aggregateData, createScaleBasedOnColumnType } from "./chartUtils";
import { line } from "d3";

/**
 * @typedef {Object} LineplotProps
 * @property {Array} columns - Array of column objects we get after passing a column through inferColumnType
 * @property {Array} rows - Array of data objects. each object is a row in the dataset
 * @property {string}xCol - Column name to use for x-axis
 * @property {string} yCol - Column name to use for y-axis
 * @property {string} colorCol - Column name to use for color scale
 * @property {string} facetCol - Column name to use for facetting
 * @property {string} aggregationType - Type of aggregation to use for the line plot. Default is "mean". Cam be ["mean", "median", "max", "min", "sum"]. This will be used if there's multiple y values for an x value in a line.
 * @property {string} lineGroupColumn - Column name to group lines by
 * @property {string} averageLineType - Type of aggregation to use for the average Line. Default is "mean". Cam be ["mean", "median", "max", "min", "sum"].
 * @property {string|number} width - CSS formatted width of the chart.
 * @property {string|number} height - CSS formatted height of the chart.
 * @property {string|function} colorScaleName - Name of the color scale to use. Default is "schemeCategory10". Can be any of the color scales in mplColorsToD3.
 */

/**
 * Creates line plots
 * @param {LineplotProps} props - The props of the component
 */
export default function LinePlot({
  rows,
  columns,
  xCol,
  yCol,
  colorCol,
  facetCol = null,
  lineGroupColumn = null,
  aggregationType = "mean",
  averageLineType = "mean",
  width = "full",
  height = 500,
  colorScaleName = "schemeCategory10",
}) {
  const [processedData, setProcessedData] = useState([]);

  console.log(
    rows,
    columns,
    xCol,
    yCol,
    colorCol,
    aggregationType,
    facetCol,
    lineGroupColumn
  );

  useEffect(() => {
    // Process data based on aggregationType
    const aggregatedData = aggregateData({
      data: rows,
      groupByKeys: {
        x: xCol,
        facet: facetCol,
        lineGroup: lineGroupColumn,
      },
      valueAccessor: (d) => d[yCol],
      aggregationType: aggregationType,
    });

    setProcessedData(aggregatedData);
  }, [rows, xCol, yCol, colorCol, facetCol, aggregationType, lineGroupColumn]);

  const ctr = useRef(null);

  console.log(processedData);

  // Define scales
  const yScale = createScaleBasedOnColumnType({
    columnType: "categorical",
    rows: processedData,
    valAccessor: (d) => d.y,
    range: [100, 0],
  });

  const xScale = createScaleBasedOnColumnType({
    columnType: "categorical",
    rows: processedData,
    valAccessor: (d) => d.x,
    range: [0, 100],
  });

  const path = line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  //   if we have a facetCol, then we will have to make multiple smaller charts in a grid

  return <div></div>;
}
