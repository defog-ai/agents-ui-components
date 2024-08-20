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
      getYAxis(mergedOptions),
      ...(xAxis ? [xAxis] : []),
      ...chartMarks,
    ];
  } else {
    return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
  }
}

// Axis generation functions
function getXAxis(options) {
  if (options.x === null) return null;

  return Plot.axisX({
    lineWidth: 6,
    label: options.xLabel,
    fontSize: options.fontSize,
    tickSize: 0,
    tickFormat: options.xIsDate
      ? (d) => utcFormat(options.dateFormat)(new Date(d))
      : undefined,
  });
}

export function getYAxis(options) {
  const axisOptions = {
    tickSize: 0,
    lineAnchor: "bottom",
  };

  if (options.type === "histogram") {
    axisOptions.label = options.yLabel || "Frequency";
  } else {
    axisOptions.tickFormat = (d, i, ticks) => {
      const formattedValue =
        options.yAxisUnitPosition === "prefix"
          ? `${options.yAxisUnitLabel}${d}`
          : `${d}${options.yAxisUnitLabel}`;
      return i === ticks.length - 1 ? formattedValue : d;
    };
  }

  return Plot.axisY(axisOptions);
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
        stroke: lineOptions.stroke || options.lineColor,
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
  return [
    Plot.barY(data, {
      x: options.x,
      y: options.useCount ? "count" : options.y,
      fill: options.barColor,
      title: (d) =>
        `${d[options.x]}: ${d[options.useCount ? "count" : options.y]}`,
    }),
  ];
}

function getScatterMarks(data, options) {
  return [
    Plot.dot(data, {
      x: options.x,
      y: options.y,
      fill: options.pointColor,
      r: options.pointSize,
    }),
  ];
}

function getHistogramMarks(data, options) {
  const { x, binCount, fillColor, normalize, cumulative } = options;

  return [
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
  const { x, y, fill, stroke, opacity } = options;
  return [
    Plot.boxY(data, {
      x,
      y,
      fill,
      stroke,
      fillOpacity: opacity,
    }),
  ];
}

// Utility function to save chart as PNG
export function saveAsPNG(container, bg = "#ffffff") {
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const padding = 20;

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
}
