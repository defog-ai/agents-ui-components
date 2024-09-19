import * as Plot from "@observablehq/plot";
import { utcFormat } from "d3";

// Constants
export const defaultOptions = {
  type: "line",
  x: null,
  y: null,
  xLabel: "X Axis",
  yLabel: "Y Axis",
  backgroundColor: "#ffffff",
  fontSize: 12,
  title: "",
  lineColor: "steelblue",
  lineWidth: 2,
  barColor: "steelblue",
  pointColor: "steelblue",
  pointSize: 3,
  yAxisUnitLabel: "",
  yAxisUnitPosition: "suffix",
  showLabels: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  facetX: null,
  dateFormat: "%Y-%m-%d",
  boxplotOrientation: "vertical",
};

export const getObservableOptions = (
  dimensions,
  mergedOptions,
  processedData
) => {
  if (
    dimensions.width === 0 ||
    dimensions.height === 0 ||
    !mergedOptions.x ||
    !mergedOptions.y ||
    (Array.isArray(mergedOptions.y) && mergedOptions.y.length === 0)
  ) {
    return null;
  }

  // Apply the filter to the data
  const filteredData = mergedOptions.filter
    ? processedData.filter(mergedOptions.filter)
    : processedData;

  const isHorizontalOrientation =
    mergedOptions?.boxplotOrientation === "horizontal";

  const plotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions.marginTop,
    marginRight: mergedOptions.marginRight,
    aggregateFunction: "none",

    marginBottom: 90,
    marginLeft: isHorizontalOrientation ? 100 : mergedOptions.marginLeft,
    style: {
      backgroundColor: mergedOptions.backgroundColor,
      overflow: "visible",
    },
    color: {
      scheme: mergedOptions.scheme,
      legend: true,
    },
    y: {
      grid: mergedOptions.yGrid,
      nice: true,

      label: mergedOptions.yLabel || mergedOptions.y,
      labelOffset: 22,
      ticks:
        mergedOptions.yTicks === undefined ? undefined : mergedOptions.yTicks,
    },
    x: {
      grid: mergedOptions.xGrid,
      label: mergedOptions.xLabel || mergedOptions.x,
      ticks:
        mergedOptions.xTicks === undefined ? undefined : mergedOptions.xTicks,
    },
    marks: getMarks(filteredData, {
      ...mergedOptions,
    }),
  };

  if (mergedOptions.facet) {
    plotOptions.facet = {
      data: filteredData,
      x: mergedOptions.facet,
      marginRight: 30,
    };
  }

  return plotOptions;
};
// Main function to generate chart marks
export function getMarks(data, options) {
  const mergedOptions = { ...defaultOptions, ...options };
  const baseMarks = [];
  const chartMarks = getChartSpecificMarks(data, mergedOptions);
  const xAxis = getXAxis(mergedOptions);

  if (mergedOptions.facet) {
    return [
      Plot.frame(),
      ...baseMarks,
      ...(xAxis ? [xAxis] : []),
      ...chartMarks,
    ];
  } else {
    return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
  }
}

function getXAxis(options) {
  const isOrdinalScale = options.type === "bar" || options.type === "boxplot";
  const manyTicks = options.xTicks > 10;

  if (options.boxplotOrientation === "horizontal") {
    return null;
  }
  return Plot.axisX({
    lineWidth: manyTicks ? 9 : 6,
    lineHeight: 1.2,
    fontSize: options.fontSize,
    ticks: options.xTicks,
    tickSize: 0,
    nice: true,
    rotate: manyTicks && isOrdinalScale ? 60 : 0,
    textAnchor: manyTicks ? "start" : null,
    grid: options.xGrid,
    tickFormat: (d, i, ticks) => {
      if (options.boxplotOrientation === "horizontal") {
        return;
      }

      if (options.xIsDate) {
        const date = new Date(d * 1000);
        return isOrdinalScale &&
          options.xTicks &&
          i % Math.ceil(ticks.length / options.xTicks) !== 0
          ? ""
          : utcFormat(options.dateFormat)(date);
      }

      if (isOrdinalScale && options.xTicks) {
        return options.xTicks &&
          i % Math.ceil(ticks.length / options.xTicks) === 0
          ? d
          : "";
      }

      return d;
    },
  });
}

// Chart-specific mark generation functions
function getChartSpecificMarks(data, options) {
  const markGenerators = {
    line: getLineMarks,
    bar: getBarMarks,
    scatter: getScatterMarks,
    histogram: getHistogramMarks,
    boxplot: getBoxPlotMarks,
  };

  return markGenerators[options.type]?.(data, options) || [];
}

function getLineMarks(data, options) {
  const marks = [];
  const addLineMark = (y, lineOptions = {}) => {
    marks.push(
      Plot.line(data, {
        x: options.x,
        y: y,
        filter: options.filter,
        stroke: options.stroke || options.lineColor,
        strokeWidth: lineOptions.strokeWidth || options.lineWidth,
        curve: lineOptions.curve || options.curve,
      })
    );
  };

  const addLabelMark = (y) => {
    if (options.showLabels) {
      marks.push(
        Plot.text(
          data,
          Plot.selectLast({
            x: options.x,
            y: y,
            text: y,
            frameAnchor: "right",
            dx: 3,
            dy: 8,
          })
        )
      );
    }
  };

  const yValues = Array.isArray(options.y) ? options.y : [options.y];
  yValues.forEach((y, index) => {
    const lineOptions = options.lineOptions?.[index] || {};
    addLineMark(y, lineOptions);
    addLabelMark(y);
  });

  return marks;
}

function getBarMarks(data, options) {
  const yLabel =
    options.aggregateFunction === "none"
      ? options.yLabel
      : ["count", "proportion"].includes(options.aggregateFunction)
        ? options.aggregateFunction.charAt(0).toUpperCase() +
          options.aggregateFunction.slice(1).toLowerCase()
        : `${options.y} (${options.aggregateFunction})`;
  const marks = [
    Plot.barY(
      data,
      options.aggregateFunction !== "none"
        ? Plot.groupX(
            { y: options.aggregateFunction },
            {
              x: options.x,
              fill: options.fill || options.barColor,
              filter: options.filter,
              y: options.y,
              sort: options.sort,
            }
          )
        : {
            x: options.x,
            y: options.y,
            fill: options.fill || options.barColor,
            filter: options.filter,
            sort: options.sort,
          }
    ),
    Plot.axisY({
      label: yLabel,
      labelOffset: 18,

      fontSize: options.fontSize,
      ticks: options.yTicks,
      grid: options.yGrid,
    }),
  ];
  return marks;
}

function getScatterMarks(data, options) {
  return [
    Plot.dot(data, {
      x: options.x,
      y: options.y,
      filter: options.filter,
      fill: options.fill || options.pointColor,
      r: options.pointSize,
    }),
  ];
}

function getHistogramMarks(data, options) {
  const { x, binCount, fillColor, normalize, cumulative } = options;

  return [
    Plot.axisY({
      lineWidth: 6,
      lineHeight: 1.2,
      labelOffset: 18,
      fontSize: options.fontSize,
      ticks: options.yTicks,
      tickSize: 0,
      nice: true,
      grid: options.yGrid,
      label: options.yLabel || "Frequency",
    }),
    Plot.rectY(
      data,

      Plot.binX(
        { y: "count" },
        {
          x,
          thresholds: binCount,
          fill: fillColor,

          normalize,
          cumulative,
        }
      )
    ),
    Plot.ruleY([0]),
  ];
}

function getBoxPlotMarks(data, options) {
  const {
    x,
    y,
    fill,
    stroke,
    opacity,
    boxplotOrientation,
    xIsDate,
    dateFormat,
  } = options;

  const boxplotOptions = {
    fill,
    stroke,
    filter: options.filter,
    fillOpacity: opacity,
  };

  const formatDate = (d) => utcFormat(dateFormat)(new Date(d * 1000));

  if (boxplotOrientation === "horizontal") {
    return [
      Plot.boxX(data, {
        y: x,
        x: y,
        ...boxplotOptions,
      }),
      Plot.axisY({
        tickFormat: xIsDate ? formatDate : undefined,
        label: x,
      }),
      Plot.axisX({
        label: y,
      }),
    ];
  } else {
    return [
      Plot.boxY(data, {
        x,
        y,
        ...boxplotOptions,
      }),
    ];
  }
}
