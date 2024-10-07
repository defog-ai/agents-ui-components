import * as Plot from "@observablehq/plot";
import { utcFormat } from "d3";
import { unix } from "dayjs";

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
  margin: { top: 20, right: 20, bottom: 80, left: 50 },
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
    marginTop: mergedOptions.margin.top,
    marginRight: mergedOptions.margin.right,
    aggregateFunction: "none",

    marginBottom: mergedOptions.margin.bottom,
    marginLeft: isHorizontalOrientation ? 100 : mergedOptions.margin.left,
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

  if (options.boxplotOrientation === "horizontal") {
    return;
  }
  return Plot.axisX({
    // lineWidth: manyTicks ? 9 : 6,
    lineHeight: 1.2,
    fontSize: options.fontSize,
    ticks: options.xTicks,
    tickSize: 0,
    nice: true,
    // rotate: manyTicks && isOrdinalScale ? 60 : 0,
    // textAnchor: manyTicks ? "start" : null,
    rotate: -90,
    textAnchor: "end",
    grid: options.xGrid,
    tickFormat: (d, i, ticks) => {
      if (options.boxplotOrientation === "horizontal") {
        return;
      }

      if (options.xIsDate) {
        const dateToUnix = options.dateToUnix;
        const isValidUnixDate = dateToUnix(d) ? true : false;

        const date = isValidUnixDate
          ? // parse using dayjs. for some reason d3's wasn't giving the correct answer.
            // IF this is parseable using dateToUnix, then it is already coming in as unix date from ObservablePlot.jsx
            // if this isn't parseable using dateToUnix, just leave it as it is
            unix(d)
          : // don't parse. just leave however it is
            d;

        return isOrdinalScale &&
          options.xTicks &&
          // we want to show every nth tick (depending on the options.xTicks)
          i % Math.ceil(ticks.length / options.xTicks) !== 0
          ? // if it's not the nth tick, don't show anything
            ""
          : // else
            isValidUnixDate
            ? // format unix date
              utcFormat(options.dateFormat)(date)
            : date;
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

function getTooltipConfig(options) {
  const tipFormat = {};

  if (options.xIsDate) {
    tipFormat.x = (d) => {
      const isValidUnixDate = options.dateToUnix(d) && options.dateToUnix?.(d);

      // this is already coming in as unix date from ObservablePlot.jsx
      return isValidUnixDate ? utcFormat(options.dateFormat)(unix(d)) : d;
    };
  } else {
    tipFormat.x = (d) => d;
  }

  return { format: tipFormat };
}

function getLineMarks(data, options) {
  const marks = [];
  const addLineMark = (y, lineOptions = {}) => {
    marks.push(
      Plot.line(data, {
        tip: getTooltipConfig(options),
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
              tip: getTooltipConfig(options),
              x: options.x,
              fill: options.fill || options.barColor,
              filter: options.filter,
              y: options.y,
              sort: options.sort,
            }
          )
        : {
            tip: getTooltipConfig(options),
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
      // textOverflow: "ellipsis",
      // line width 10 ~= 20 characters
      // lineWidth: 3,

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
      tip: getTooltipConfig(options),
      x: options.x,
      y: options.y,
      filter: options.filter,
      fill: options.fill || options.pointColor,
      r: options.pointSize,
    }),
    Plot.axisY({
      // textOverflow: "ellipsis-end",
      // line width 10 ~= 20 characters
      // lineWidth: 3,
    }),
  ];
}

function getHistogramMarks(data, options) {
  const { x, binCount, fillColor, normalize, cumulative } = options;

  return [
    Plot.axisY({
      // textOverflow: "ellipsis",
      // // line width 10 ~= 20 characters
      // lineWidth: 3,
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
          tip: getTooltipConfig(options),
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
        ticks: options.yTicks,
        fontSize: options.fontSize,
        grid: options.xGrid,
      }),
      Plot.axisX({
        label: y,
        ticks: options.xTicks,
        fontSize: options.fontSize,
        grid: options.yGrid,
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
