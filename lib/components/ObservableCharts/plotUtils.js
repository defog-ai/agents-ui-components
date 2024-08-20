import * as Plot from "@observablehq/plot";
import { utcFormat } from "d3";
import dayjs from "dayjs";

// Default options for chart configuration
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
  xDateFormat: "%Y-%m-%d",
  yDateFormat: "%Y-%m-%d",
};

// Main function to get chart marks based on data and options
export const getMarks = (data, mergedOptions) => {
  const baseMarks = [];
  const chartMarks = getChartSpecificMarks(data, mergedOptions);

  const xAxis =
    mergedOptions.x !== null
      ? Plot.axisX({
          lineWidth: 6,
          label: mergedOptions.xLabel,
          fontSize: mergedOptions.fontSize,
          tickSize: 0,
          tickFormat: mergedOptions.xIsDate
            ? (d) => utcFormat("%b  %Y")(new Date(d))
            : undefined,
        })
      : null;

  if (mergedOptions.facet) {
    return [
      Plot.frame(),
      ...baseMarks,
      getYAxis(mergedOptions),
      ...(xAxis ? [xAxis] : []),
      ...chartMarks,
    ];
  } else {
    return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
  }
};

// Function to get Y-axis configuration
export const getYAxis = (mergedOptions) => {
  if (mergedOptions.type === "histogram") {
    return Plot.axisY({
      label: mergedOptions.yLabel || "Frequency",
      tickSize: 0,
    });
  }

  return Plot.axisY({
    tickSize: 0,
    tickFormat: (d, i, ticks) => {
      const formattedValue =
        mergedOptions.yAxisUnitPosition === "prefix"
          ? `${mergedOptions.yAxisUnitLabel}${d}`
          : `${d}${mergedOptions.yAxisUnitLabel}`;
      return i === ticks.length - 1 ? formattedValue : d;
    },
    lineAnchor: "bottom",
  });
};

// Function to get chart-specific marks based on chart type

export const getChartSpecificMarks = (data, mergedOptions) => {
  switch (mergedOptions.type) {
    case "line":
      return getLineMarks(data, mergedOptions);
    case "bar":
      return getBarMarks(data, mergedOptions);
    case "scatter":
      return getScatterMarks(data, mergedOptions);
    case "histogram":
      return getHistogramMarks(data, mergedOptions);
    case "boxplot":
      return getBoxPlotMarks(data, mergedOptions);
    default:
      return [];
  }
};

// Function to get box plot marks
const getBoxPlotMarks = (data, mergedOptions) => {
  const { x, y, fill, stroke, opacity } = mergedOptions;
  return [
    Plot.boxY(data, {
      x,
      y,
      fill,
      stroke,
      fillOpacity: opacity,
    }),
  ];
};

// Function to get bar chart marks
const getBarMarks = (data, mergedOptions) => {
  return [
    Plot.barY(data, {
      x: mergedOptions.x,
      y: mergedOptions.useCount ? "count" : mergedOptions.y,
      fill: mergedOptions.barColor,
      title: (d) =>
        `${d[mergedOptions.x]}: ${d[mergedOptions.useCount ? "count" : mergedOptions.y]}`,
    }),
  ];
};

// Function to get scatter plot marks
const getScatterMarks = (data, mergedOptions) => {
  console.log("scatter", mergedOptions, data);
  return [
    Plot.dot(data, {
      x: mergedOptions.x,
      y: mergedOptions.y,
      fill: mergedOptions.pointColor,
      r: mergedOptions.pointSize,
    }),
  ];
};

// Function to get line chart marks
const getLineMarks = (data, mergedOptions) => {
  console.log("line", mergedOptions, data);
  const marks = [];

  const addLineMark = (y, lineOptions = {}) => {
    marks.push(
      Plot.line(data, {
        x: mergedOptions.x,
        y: y,
        stroke: lineOptions.stroke || mergedOptions.lineColor,
        strokeWidth: lineOptions.strokeWidth || mergedOptions.lineWidth,
        curve: lineOptions.curve || mergedOptions.curve,
      })
    );
  };

  const addLabelMark = (y) => {
    if (mergedOptions.showLabels) {
      marks.push(
        Plot.text(
          data,
          Plot.selectLast({
            x: mergedOptions.x,
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

  if (Array.isArray(mergedOptions.y)) {
    mergedOptions.y.forEach((y, index) => {
      const lineOptions = mergedOptions.lineOptions?.[index] || {};
      addLineMark(y, lineOptions);
      addLabelMark(y);
    });
  } else {
    addLineMark(mergedOptions.y);
    addLabelMark(mergedOptions.y);
  }

  return marks;
};

const getHistogramMarks = (data, mergedOptions) => {
  const { x, binCount, fillColor, normalize, cumulative } = mergedOptions;

  const histogramOptions = {
    x: x,
    thresholds: binCount,
    fill: fillColor,
    normalize: normalize,
    cumulative: cumulative,
  };

  return [
    Plot.rectY(data, Plot.binX({ y: "count" }, histogramOptions)),
    Plot.ruleY([0]),
  ];
};

// Function to save the chart as PNG
export const saveAsPNG = (container, bg = "#ffffff") => {
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const padding = 20; // Padding size for the image

  img.onload = () => {
    canvas.width = svg.width.baseVal.value + 2 * padding;
    canvas.height = svg.height.baseVal.value + 2 * padding;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, padding, padding);

    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = "chart.png";
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  img.src = "data:image/svg+xml," + encodeURIComponent(svgData);
};
