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
  processedData,
  selectedColumns,
  availableColumns
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

  const chartMarks = getMarks(
    filteredData,
    {
      ...mergedOptions,
    },
    selectedColumns,
    availableColumns
  );

  const xIsDate = mergedOptions.xIsDate || false;

  const plotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions.margin.top,
    marginRight: mergedOptions.margin.right,
    aggregateFunction: "sum",

    marginBottom: mergedOptions.margin.bottom + 50, // Increase bottom margin
    marginLeft: isHorizontalOrientation ? 100 : mergedOptions.margin.left,
    style: {
      backgroundColor: mergedOptions.backgroundColor,
      overflow: "visible",
      fontSize: mergedOptions.fontSize,
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
      // tickRotate: -45, // Rotate x-axis labels
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
export function getMarks(data, options, selectedColumns, availableColumns) {
  const mergedOptions = { ...defaultOptions, ...options };
  const baseMarks = [];
  const chartMarks = getChartSpecificMarks(
    data,
    mergedOptions,
    selectedColumns,
    availableColumns
  );
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
function getChartSpecificMarks(
  data,
  options,
  selectedColumns,
  availableColumns
) {
  const markGenerators = {
    line: getLineMarks,
    bar: getBarMarks,
    scatter: getScatterMarks,
    histogram: getHistogramMarks,
    boxplot: getBoxPlotMarks,
  };

  return (
    markGenerators[options.type]?.(
      data,
      options,
      selectedColumns,
      availableColumns
    ) || []
  );
}

function getTooltipConfig(options, isHorizontalBoxplot = false) {
  const tipFormat = {};

  if (options.xIsDate && !isHorizontalBoxplot) {
    tipFormat.x = (d) => {
      const parseUnix = unix(d);
      // this is already coming in as unix date from ObservablePlot.jsx
      return parseUnix ? timeFormat(options.dateFormat)(parseUnix) : d;
    };
  } else if (options.xIsDate && isHorizontalBoxplot) {
    tipFormat.y = (d) => {
      const parseUnix = unix(d);
      // this is already coming in as unix date from ObservablePlot.jsx
      return parseUnix ? timeFormat(options.dateFormat)(parseUnix) : d;
    };
  } else {
    tipFormat.x = (d) => d;
  }

  return { format: tipFormat };
}

function getLineMarks(data, options, selectedColumns, availableColumns) {
  const marks = [];
  const aggregateFunction = options.aggregateFunction || "sum";

  const { x, y } = options;

  // use a max of 5 categorical columns to add to the tooltip's title
  const categoricalColumnsNotXOrY = availableColumns
    .filter(
      (col) =>
        col.variableType === "categorical" &&
        col.title !== x &&
        col.title !== y &&
        col.title !== selectedColumns.x &&
        col.title !== options.facet &&
        selectedColumns.y.indexOf(col.title) === -1
    )
    .slice(0, 5);

  const lineOptions = {
    x: options.x,
    y: options.y,
    filter: options.filter,
    tip: getTooltipConfig(options),
    title: (row) => {
      const extraInfo = categoricalColumnsNotXOrY
        .map((col) => {
          if (row[col.title] === undefined) {
            return "";
          }
          return `${col.title}: ${row[col.title]}`;
        })
        .join("\n");

      const xValue = options.xIsDate ? unix(row?.unixDateValues?.[x]) : row[x];
      const xInfo = `${options.x}: ${xValue}`;

      const yInfo = selectedColumns.y
        .map((yCol) => {
          const yValue = row[yCol];
          return `${yCol}: ${yValue}`;
        })
        .join("\n");

      return `${xInfo}\n${yInfo}\n${extraInfo}`.replace("\n\n", "\n").trim();
    },
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
  };

  const groupingOptions = {
    y: aggregateFunction,
    title: (d) => {
      try {
        // if there are more than 1 values, show the count at the top
        let prefix = "";
        if (d.length > 1) {
          prefix = `Count: ${d.length}\n----\n`;
        }
        // show only 3 values max
        return prefix + d.slice(0, 3).join("\n----\n");
      } catch (e) {
        return "";
      }
    },
  };

  marks.push(Plot.lineY(data, Plot.groupX(groupingOptions, lineOptions)));

  return marks;
}

function getBarMarks(data, options, selectedColumns, availableColumns) {
  const aggregateFunction = options.aggregateFunction || "sum";

  const { x, y, colorByIsDate, dateFormat } = options;

  // use a max of 5 categorical columns to add to the tooltip's title
  const categoricalColumnsNotXOrY = availableColumns
    .filter(
      (col) =>
        col.variableType === "categorical" &&
        col.title !== x &&
        col.title !== y &&
        col.title !== selectedColumns.x &&
        col.title !== options.facet &&
        selectedColumns.y.indexOf(col.title) === -1
    )
    .slice(0, 5);

  const marks = [];

  const groupingOptions = {
    y: aggregateFunction,
    title: (d) => {
      try {
        // if there are more than 1 values, show the count at the top
        let prefix = "";
        if (d.length > 1) {
          prefix = `Count: ${d.length}\n----\n`;
        }
        // show only 3 values max
        const suffix = d.length > 3 ? `\n----\nand ${d.length - 3} more` : "";

        return prefix + d.slice(0, 3).join("\n----\n") + suffix;
      } catch (e) {
        return "";
      }
    },
  };

  const colorBy = options.colorBy;

  const barOptions = {
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

      const extraInfo = categoricalColumnsNotXOrY
        // also make sure we don't have the favet column in the tooltip repeated
        .filter((d) => d.dataIndex !== options.facet)
        .map((col) => {
          if (row[col.dataIndex] === undefined) {
            return "";
          }

          const value =
            col.dataIndex === colorBy && colorByIsDate
              ? unix(row[col.dataIndex]).format("MMM D, YYYY")
              : row[col.dataIndex];

          return `${col.dataIndex}: ${value}`;
        })
        .join("\n");

      const label = row[options.x];
      const value = row[options.y];

      const yInfo = selectedColumns.y
        .map((yCol) => {
          if (yCol === label || yCol === value || yCol === options.facet) {
            return "";
          }
          const yValue = row[yCol];
          return `${yCol}: ${yValue}`;
        })
        .join("\n");

      if (options.xIsDate && dayjs(xFacetValue).isValid()) {
        // if date, format it
        // convert from unix to date
        const date = unix(xFacetValue).format("YYYY-MM-DD");

        return `${options.facet}: ${date}\n${label}: ${value}\n${yInfo}${extraInfo}`
          .replace("\n\n", "\n")
          .trim();
      } else {
        // simply parse and return
        return `${options.facet}: ${xFacetValue}\n${row[options.x]}: ${row[options.y]}\n${yInfo}\n${extraInfo}`
          .replace("\n\n", "\n")
          .trim();
      }
    },
    fill: options.x,
    sort: options.sort,
  };

  if (aggregateFunction === "none") {
    marks.push(
      Plot.barY(
        data,
        Plot.groupX(
          { y: "sum" },
          {
            ...barOptions,
            x: colorBy ? "color_by_str" : "naive_index_within_facet_str",
            ...(colorBy
              ? { fill: options.colorByIsDate ? "color_by_str" : colorBy }
              : {}),
          }
        )
      )
    );
  } else {
    marks.push(Plot.barY(data, Plot.groupX(groupingOptions, barOptions)));
  }

  return marks;
}

function getScatterMarks(data, options, selectedColumns, availableColumns) {
  const { x, y } = options;

  // use a max of 5 categorical columns to add to the tooltip's title
  const categoricalColumnsNotXOrY = availableColumns
    .filter(
      (col) =>
        col.variableType === "categorical" &&
        col.title !== x &&
        col.title !== y &&
        col.title !== selectedColumns.x &&
        col.title !== options.facet &&
        selectedColumns.y.indexOf(col.title) === -1
    )
    .slice(0, 5);

  return [
    Plot.dot(data, {
      tip: getTooltipConfig(options),
      title: (row) => {
        const extraInfo = categoricalColumnsNotXOrY
          .map((col) => {
            if (row[col.title] === undefined) {
              return "";
            }
            return `${col.title}: ${row[col.title]}`;
          })
          .join("\n");

        const xValue = options.xIsDate
          ? unix(row?.unixDateValues?.[x])
          : row[x];
        const xInfo = `${options.x}: ${xValue}`;

        const yInfo = `${options.y}: ${row[y]}`;

        return `${xInfo}\n${yInfo}\n${extraInfo}\n`
          .replace("\n\n", "\n")
          .trim();
      },
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

function getBoxPlotMarks(data, options, selectedColumns, availableColumns) {
  const { x, y, stroke, opacity, boxplotOrientation, xIsDate, dateFormat } =
    options;

  // use a max of 5 categorical columns to add to the tooltip's title
  const categoricalColumnsNotXOrY = availableColumns
    .filter(
      (col) =>
        col.variableType === "categorical" && col.title !== x && col.title !== y
    )
    .slice(0, 5);

  const boxplotOptions = {
    // fill,
    stroke,
    filter: options.filter,
    fillOpacity: opacity,
  };

  let marks;

  if (boxplotOrientation === "horizontal") {
    marks = [
      Plot.boxX(data, {
        y: x,
        x: y,
        ...boxplotOptions,
        tip: getTooltipConfig(options, true),
        title: function (row) {
          const xValue = row[x];
          const yValue = row[y];

          const extraInfo = categoricalColumnsNotXOrY
            .map((col) => {
              if (row[col.title] === undefined) {
                return "";
              }
              return `${col.title}: ${row[col.title]}`;
            })
            .join("\n");

          if (xIsDate) {
            // if date, format it
            // convert from unix to date
            const dateFormatted =
              timeFormat(dateFormat)(unix(row?.unixDateValues?.[x])) || xValue;

            return `${x}: ${dateFormatted}\n${y}: ${yValue}\n${extraInfo}`
              .replace("\n\n", "\n")
              .trim();
          } else {
            // simply parse and return
            return `${x}: ${xValue}\n${y}: ${yValue}\n${extraInfo}`
              .replace("\n\n", "\n")
              .trim();
          }
        },
      }),

      Plot.axisY({
        label: x,
        ticks: options.xTicks,
        grid: options.yGrid,
        tickFormat: (d, i, ticks) => {
          if (xIsDate) {
            const parseUnix = unix(d);

            // this is already coming in as unix date from ObservablePlot.jsx

            const date = parseUnix
              ? // parse using dayjs. for some reason d3's wasn't giving the correct answer.
                // IF this is parseable using dateToUnix, then it is already coming in as unix date from ObservablePlot.jsx
                // if this isn't parseable using dateToUnix, just leave it as it is
                parseUnix
              : // don't parse. just leave however it is
                d;

            return options.xTicks &&
              i % Math.ceil(ticks.length / options.xTicks) !== 0
              ? ""
              : parseUnix
                ? timeFormat(dateFormat)(date)
                : date;
          }

          return options.xTicks &&
            i % Math.ceil(ticks.length / options.xTicks) !== 0
            ? ""
            : d;
        },
      }),
    ];
  } else {
    marks = [
      Plot.boxY(data, {
        x,
        y,
        ...boxplotOptions,
        tip: getTooltipConfig(options),
        title: function (row) {
          const xValue = row[x];
          const yValue = row[y];

          const extraInfo = categoricalColumnsNotXOrY
            .map((col) => {
              if (row[col.title] === undefined) {
                return "";
              }
              return `${col.title}: ${row[col.title]}`;
            })
            .join("\n");

          if (xIsDate) {
            // if date, format it
            // convert from unix to date
            const dateFormatted =
              timeFormat(dateFormat)(unix(row?.unixDateValues?.[x])) || xValue;

            return `${x}: ${dateFormatted}\n${y}: ${yValue}\n${extraInfo}`
              .replace("\n\n", "\n")
              .trim();
          } else {
            // simply parse and return
            return `${x}: ${xValue}\n${y}: ${yValue}\n${extraInfo}`
              .replace("\n\n", "\n")
              .trim();
          }
        },
      }),
      Plot.axisY({
        label: y,
        ticks: options.yTicks,
        grid: options.yGrid,
      }),
    ];
  }

  // boxplot is a composite mark
  // when we pass the tip and title above, it will show up for all the marks
  // we want to remove the tip and title for all the marks except the dot
  // if there are a lot of elements, then boxplot creates a rule mark instead of showing individual dots
  const boxMarks = marks[0];

  boxMarks.forEach((mark) => {
    if (
      !(mark instanceof Plot.Dot) &&
      !(mark instanceof Plot.RuleY) &&
      !(mark instanceof Plot.RuleX)
    ) {
      mark.tip = null;
      mark.title = null;
    }
    // if these are rules, then
    // if this is a horizontal boxplot, make the anchor top
    // if this is a vertical boxplot, make the anchor right
    // so that it doesn't interfere with the tooltips of the rules/dots
    if (mark instanceof Plot.RuleY || mark instanceof Plot.RuleX) {
      mark.tip = {
        ...mark.tip,
        anchor: boxplotOrientation === "horizontal" ? "top" : "right",
      };

      if (mark.channels) {
        // use the default title if it's a rule
        delete mark.channels.title;
      }
    }
  });
  return marks;
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
