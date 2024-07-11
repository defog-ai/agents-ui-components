import React, { useState, useEffect, useRef } from "react";
import {
  aggregateData,
  createScaleBasedOnColumnType,
  mplColorsToD3,
  parseChartDim,
} from "./utils";
import { max, min } from "d3";
import { ChartLayout } from "./chart-layout/ChartLayout";

/**
 * Creates boxplots
 * @component
 * @param {Object} props
 * @param {Array} props.columns - Array of column objects we get after passing a column through inferColumnType
 * @param {Array} props.rows - Array of data objects. each object is a row in the dataset
 * @param {string}props.xCol - Column name to use for x-axis
 * @param {string} props.yCol - Column name to use for y-axis
 * @param {boolean} props.facet - Whether to facet the boxplots. Default is false.
 * @param {string} props.facetCol - Column name to use for facetting
 * @param {string} props.color - Color of the boxplot. Default is "#000000".
 * @param {number} props.opacity - Opacity of the points. Default is 0.4.
 * @param {string|number} props.width - CSS formatted width of the chart.
 * @param {string|number} props.height - CSS formatted height of the chart.
 * @param {number} props.padding - Padding between boxplots of each x category. Default is 0.05.
 *
 * @returns {React.Component}
 */
export default function Boxplot({
  rows,
  columns,
  xCol,
  yCol,
  facet = false,
  facetCol,
  color = "#000000",
  opacity = 0.3,
  width = "full",
  height = 500,
  padding = 0.05,
}) {
  const [processedData, setProcessedData] = useState([]);
  const ctr = useRef(null);

  useEffect(() => {
    // Process data based on aggregationType
    // because we want no aggregation here, we set aggregationType to null
    // we also will only group by the x column
    const aggregatedData = aggregateData({
      data: rows,
      groupByKeys: {
        x: xCol,
      },
      valueAccessor: (d) => d[yCol],
      aggregationType: null,
      returnStats: true,
    });
    setProcessedData(aggregatedData);
  }, [rows, xCol, yCol]);

  // y is quantitative
  const yScale = createScaleBasedOnColumnType({
    columnType: "quantitative",
    rows: processedData,
    domain: [
      min(processedData, (d) => d.stats.min),
      max(processedData, (d) => d.stats.max),
    ],
    range: [100, 0],
  });

  const xScale = createScaleBasedOnColumnType({
    columnType: "categorical",
    rows: processedData,
    valAccessor: (d) => d.x,
    range: [0, 100],
    padding: padding,
  });

  const bandwidth = xScale.bandwidth();

  // get the dimensions of the chart
  const chartBody = (
    <svg
      className="w-full h-full overflow-visible"
      viewBox={`0 0 ${100} ${100}`}
      preserveAspectRatio="none"
    >
      {processedData.map((d) => {
        const x = xScale(d.x) + bandwidth / 2;
        const yMax = yScale(d.stats.max);
        const yMin = yScale(d.stats.min);
        const yQ1 = yScale(d.stats.q1);
        const yQ3 = yScale(d.stats.q3);
        const yMedian = yScale(d.stats.median);

        const lines = [
          {
            x1: x - bandwidth / 2,
            x2: x + bandwidth / 2,
            y1: yMax,
            y2: yMax,
          },
          { x1: x, x2: x, y1: yMax, y2: yQ3 },
          {
            x1: x - bandwidth / 2,
            x2: x + bandwidth / 2,
            y1: yMin,
            y2: yMin,
          },
          { x1: x, x2: x, y1: yMin, y2: yQ1 },
          {
            x1: x - bandwidth / 2,
            x2: x + bandwidth / 2,
            y1: yMedian,
            y2: yMedian,
          },
        ];

        return (
          <g key={d.x}>
            {lines.map((line, i) => (
              <>
                <line
                  key={i}
                  x1={line.x1}
                  x2={line.x2}
                  y1={line.y1}
                  y2={line.y2}
                  stroke={color}
                  className="stroke-[0.5]"
                />
              </>
            ))}
            <rect
              x={x - bandwidth / 2}
              y={yQ3}
              width={bandwidth}
              height={yQ1 - yQ3}
              fill={color}
              opacity={opacity}
            />
            {/* also plot the points inside d.dataEntries */}
            {d.dataEntries.map((entry, i) => {
              const y = yScale(entry[yCol]);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1"
                  fill={color}
                  opacity={opacity}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );

  const yAxis = (
    <div className="w-full h-full">
      {yScale.ticks().map((tick, i) => (
        <div
          key={i}
          // we have to keep these h-0 because we want to keep the central dash of the tick in line with this
          // yScale(xx) position. kooky but works.
          className="tick absolute flex items-center justify-center h-0"
          style={{
            width: "100%",
            left: 0,
            top: `${yScale(tick)}%`,
          }}
        >
          {tick || "label"}
          <div className="w-[5px] h-[1px] bg-gray-800 ml-2"></div>
        </div>
      ))}
    </div>
  );

  const xAxis = (
    <div className="w-full h-12">
      {xScale.domain().map((d, i) => (
        <div
          key={i}
          className="tick absolute flex flex-col items-center justify-center w-0 text-center"
          style={{
            left: `${xScale(d) + bandwidth / 2}%`,
          }}
        >
          <div className="w-[1px] h-[5px] bg-gray-800"></div>
          {d || "label"}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-[700px]" ref={ctr}>
      <ChartLayout chartBody={chartBody} yAxis={yAxis} xAxis={xAxis} />
    </div>
  );
}
