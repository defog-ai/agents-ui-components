import { useState, useEffect, useRef } from "react";
import { aggregateData, createScaleBasedOnColumnType } from "./utils";
import { line } from "d3";

/**
 * Creates line plots
 * @component
 * @param {Object} props
 * @param {Array} props.columns - Array of column objects we get after passing a column through inferColumnType
 * @param {Array} props.rows - Array of data objects. each object is a row in the dataset
 * @param {string}props.xCol - Column name to use for x-axis
 * @param {string} props.yCol - Column name to use for y-axis
 * @param {string} props.colorCol - Column name to use for color scale
 * @param {string} props.facetCol - Column name to use for facetting
 * @param {string} props.aggregationType - Type of aggregation to use for the line plot. Default is "mean". Cam be ["mean", "median", "max", "min", "sum"]. This will be used if there's multiple y values for an x value in a line.
 * @param {string} props.lineGroupColumn - Column name to group lines by
 * @param {string} props.averageLineType - Type of aggregation to use for the average Line. Default is "mean". Cam be ["mean", "median", "max", "min", "sum"].
 * @param {string|number} props.width - CSS formatted width of the chart.
 * @param {string|number} props.height - CSS formatted height of the chart.
 * @param {string|function} props.colorScaleName - Name of the color scale to use. Default is "schemeCategory10". Can be any of the color scales in mplColorsToD3.
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
