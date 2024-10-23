import * as Plot from "@observablehq/plot";
import { timeFormat } from "d3";
import dayjs, { unix } from "dayjs";
import * as d3Colors from "d3-scale-chromatic";

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
  pointColor: "steelblue",
  yAxisUnitLabel: "",
  yAxisUnitPosition: "suffix",
  showLabels: false,
  margin: { top: 20, right: 20, bottom: 80, left: 50 },
  dateFormat: "%Y-%m-%d",
  boxplotOrientation: "vertical",
  color: { legend: true },
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

  const chartMarks = getMarks(filteredData, {
    ...mergedOptions,
  });

  const xIsDate = mergedOptions.xIsDate || false;

  const plotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions.margin.top,
    marginRight: mergedOptions.margin.right,
    aggregateFunction: "sum",

    marginBottom: mergedOptions.margin.bottom,
    marginLeft: isHorizontalOrientation ? 100 : mergedOptions.margin.left,
    style: {
      backgroundColor: mergedOptions.backgroundColor,
      overflow: "visible",
    },
    color: {
      legend: true,
      tickFormat: (d) => {
        if (xIsDate && dayjs(d).isValid()) {
          return timeFormat(mergedOptions.dateFormat)(unix(d));
        } else {
          return d;
        }
      },
      swatchSize: 10,
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
      // padding: Array.isArray(mergedOptions.y) ? 1.0 / mergedOptions.y.length : 0,
    },
    marks: chartMarks,
  };

  if (mergedOptions.facet) {
    plotOptions.facet = {
      data: filteredData,
      x: mergedOptions.facet,
      ticks: 10,
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
      // Plot.frame(),
      ...baseMarks,
      ...(xAxis ? [xAxis] : []),
      ...chartMarks,
    ];
  } else {
    return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
  }
}

function getXAxis(options) {
  const isOrdinalScale = options.type === "boxplot";

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
      if (options.type === "bar") {
        return;
      }

      if (options.boxplotOrientation === "horizontal") {
        return;
      }

      if (options.xIsDate) {
        const parseUnix = unix(d);

        // this is already coming in as unix date from ObservablePlot.jsx

        const date = parseUnix
          ? // parse using dayjs. for some reason d3's wasn't giving the correct answer.
            // IF this is parseable using dateToUnix, then it is already coming in as unix date from ObservablePlot.jsx
            // if this isn't parseable using dateToUnix, just leave it as it is
            parseUnix
          : // don't parse. just leave however it is
            d;

        return isOrdinalScale &&
          options.xTicks &&
          // we want to show every nth tick (depending on the options.xTicks)
          i % Math.ceil(ticks.length / options.xTicks) !== 0
          ? // if it's not the nth tick, don't show anything
            ""
          : // else
            parseUnix
            ? // format unix date
              timeFormat(options.dateFormat)(date)
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
      const parseUnix = unix(d);
      // this is already coming in as unix date from ObservablePlot.jsx
      return parseUnix ? timeFormat(options.dateFormat)(parseUnix) : d;
    };
  } else {
    tipFormat.x = (d) => d;
  }

  return { format: tipFormat };
}

function getLineMarks(data, options) {
  const marks = [];
  const aggregateFunction = options.aggregateFunction || "sum";

  marks.push(
    Plot.lineY(
      data,
      Plot.groupX(
        { y: aggregateFunction },
        {
          x: options.x,
          y: options.y,
          filter: options.filter,
          tip: getTooltipConfig(options),
          stroke: "label",
          strokeWidth: (d) => {
            // d is an array here for some reason.
            const label = d?.[0]?.["label"];
            // if options.lineOptions[d["label"]] exists, use that
            if (
              options.lineOptions[label] &&
              options.lineOptions[label].strokeWidth
            ) {
              return options.lineOptions[label].strokeWidth;
            } else {
              // else use the default lineColor
              return options.lineWidth;
            }
          },
          curve: options.lineOptions.curve || options.curve,
        }
      )
    )
  );

  return marks;
}

function getBarMarks(data, options) {
  const aggregateFunction = options.aggregateFunction || "sum";

  const marks = [];

  marks.push(
    Plot.barY(
      data,
      Plot.groupX(
        { y: aggregateFunction },
        {
          x: options.x,
          y: options.y,
          filter: options.filter,
          tip: getTooltipConfig(options),
          // this poorly named title prop is a "channel" (also poorly named).
          // this controls the tooltip's text content
          title: (row) => {
            // in a bar chart:
            // the chart is faceted along the x direction by the selected facet column.
            // within each facet,
            // we have the "label", and the "value" columns.
            // where each bar's x location resides in option.x and is the "label" column name
            // and each bar's y location resides in option.y and is the "value" column name

            // first we get the facet x column value (aka which "group" this bar is in)
            const xFacetValue = row[options.facet];

            if (options.xIsDate && dayjs(xFacetValue).isValid()) {
              // if date, format it
              // convert from unix to date
              const label = row[options.x];
              const value = row[options.y];
              const date = unix(xFacetValue).format("YYYY-MM-DD");

              return `${options.facet} ${date}\n${label} ${value}`;
            } else {
              // simply parse and return
              return `${options.facet} ${xFacetValue}\n${row[options.x]} ${row[options.y]}`;
            }
          },
          fill: options.x,
          sort: options.sort,
        }
      )
    )
  );

  // // we will push a custom tooltip mark for bar charts
  // marks.push(
  //   Plot.tip(
  //     data,
  //     Plot.pointerX({
  //       fx: (d) => d[options.x],
  //     })
  //   )
  // );

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
      fillOpacity: 0.7,
    }),
  ];
}

function getHistogramMarks(data, options) {
  const { x, binCount, fill, fillColor, normalize, cumulative } = options;

  return [
    Plot.rectY(
      data,

      Plot.binX(
        { y: "count" },
        {
          tip: getTooltipConfig(options),
          x,
          thresholds: binCount,
          fill: fill || fillColor,

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

  if (boxplotOrientation === "horizontal") {
    return [
      Plot.boxX(data, {
        y: x,
        x: y,
        ...boxplotOptions,
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

/**
 *
 * Tries to find the corresponding color scheme. If it doesn't exist, returns the default scheme which is schemeCategory10.
 *
 * Only works with schemes, not interpolators. If the value returned from d3 is not an array, schemeCategory10 is returned.
 *
 * @param {string} scheme
 *
 * @returns {{colorScheme: Array<string> | function, schemeName: string}}
 */
export const getColorScheme = (scheme) => {
  const schemeKey = `scheme${scheme}`;
  const interpolatorKey = `interpolate${scheme}`;

  if (d3Colors[schemeKey]) {
    const isDiverging = Array.isArray(d3Colors[schemeKey].slice(-1)[0]);

    // return 5 colors by default if it's diverging
    return {
      colorScheme: isDiverging ? d3Colors[schemeKey][5] : d3Colors[schemeKey],
      schemeName: schemeKey,
    };
  } else if (d3Colors[interpolatorKey]) {
    return {
      colorScheme: d3Colors[interpolatorKey],
      schemeName: interpolatorKey,
    };
  }
  return { colorScheme: null, schemeName: null };
};
