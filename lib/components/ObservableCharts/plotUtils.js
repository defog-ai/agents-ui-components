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

export const getPlotOptions = (dimensions, mergedOptions, processedData) => {
  if (
    dimensions.width === 0 ||
    dimensions.height === 0 ||
    !mergedOptions.x ||
    !mergedOptions.y
  ) {
    return null;
  }

  const isHorizontalOrientation =
    mergedOptions?.boxplotOrientation === "horizontal";

  const plotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions.marginTop,
    marginRight: mergedOptions.marginRight,
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
      labelOffset: 22,
      ticks: mergedOptions.yTicks,
    },
    x: {
      grid: mergedOptions.xGrid,
    },

    marks: getMarks(processedData, {
      ...mergedOptions,
      y: mergedOptions.useCount ? "count" : mergedOptions.y,
    }),
  };

  if (mergedOptions.facet) {
    plotOptions.facet = {
      data: processedData,
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

  return Plot.axisX({
    lineWidth: manyTicks ? 9 : 6,
    lineHeight: 1.2,
    fontSize: options.fontSize,
    ticks: isOrdinalScale ? undefined : options.xTicks,
    tickSize: 0,
    nice: true,
    rotate: manyTicks && isOrdinalScale ? 60 : 0,
    textAnchor: manyTicks ? "start" : null,
    grid: options.xGrid,
    tickFormat: (d, i) => {
      if (options.xIsDate) {
        const date = new Date(d * 1000);
        return isOrdinalScale && i % Math.ceil(20 / options.xTicks) !== 0
          ? ""
          : utcFormat(options.dateFormat)(date);
      }

      if (isOrdinalScale) {
        return i % Math.ceil(20 / options.xTicks) === 0 ? d : "";
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
  const marks = [
    Plot.barY(data, {
      x: options.x,
      filter: options.filter,
      y: options.useCount ? "count" : options.y,
      fill: options.fill || options.barColor,
    }),
  ];
  return marks;
}

function getScatterMarks(data, options) {
  console.log(options);
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
  const { x, y, fill, stroke, opacity, boxplotOrientation } = options;

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
      // Plot.ruleX([0]),
      Plot.axisY({
        label: x,
      }),
    ];
  } else {
    return [
      // Plot.ruleY([0]),
      Plot.boxY(data, {
        x,
        y,
        ...boxplotOptions,
      }),
    ];
  }
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
