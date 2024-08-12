import dayjs from "dayjs";

import {
  interpolateBlues,
  interpolateBrBG,
  interpolateBuGn,
  interpolateBuPu,
  interpolateCividis,
  interpolateGnBu,
  interpolateGreens,
  interpolateGreys,
  interpolateInferno,
  interpolateMagma,
  interpolateOrRd,
  interpolateOranges,
  interpolatePRGn,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePuBu,
  interpolatePuBuGn,
  interpolateTurbo,
  interpolateViridis,
  interpolatePuOr,
  interpolatePuRd,
  interpolatePurples,
  interpolateRdBu,
  interpolateRdGy,
  interpolateRdPu,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateReds,
  interpolateSpectral,
  interpolateYlGn,
  interpolateYlGnBu,
  interpolateYlOrBr,
  interpolateYlOrRd,
  interpolateRainbow,
  interpolateWarm,
  interpolateCool,
  interpolateCubehelixDefault,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
  schemePastel1,
  schemePastel2,
  schemeGreys,
  schemePaired,
  schemeCategory10,
} from "d3-scale-chromatic";

import { scaleBand, scaleLinear } from "d3-scale";
import {
  extent,
  mean,
  median,
  max,
  min,
  sum,
  flatGroup,
  mode,
  quantile,
} from "d3-array";
import { useLayoutEffect, useState } from "react";
import { useEffect } from "react";

export const chartColors = [
  "#D52D68",
  "#540CC9",
  "#2B59FF",
  "#FFB536",
  "#3EE0D5",
  "#561981",
];

// Helper function to get the appropriate D3 aggregation function
function getAggregateFunction(type) {
  switch (type) {
    case "mean":
      return mean;
    case "median":
      return median;
    case "max":
      return max;
    case "min":
      return min;
    case "sum":
      return sum;
    default:
      return type;
  }
}

// colType
// numeric
// sorter
// title
// variableType

export function createScaleBasedOnColumnType({
  columnType,
  rows,
  domain = null,
  valAccessor = (d) => d,
  range,
  padding = 0.2,
}) {
  // if quantitative, return scaleLinear
  // if categorical, return scaleBand
  if (columnType === "quantitative") {
    if (!domain) {
      domain = extent(rows, valAccessor);
    }

    return scaleLinear().domain(domain).range(range);
  } else if (columnType === "categorical") {
    return scaleBand()
      .domain(Array.from(new Set(rows.map(valAccessor))))
      .padding(padding)
      .range(range);
  }

  // if neither throw error
  throw new Error(`Unsupported column type: ${columnType}`);
}

export function aggregateData({
  // rows of data: array of objects
  data,
  // keys is an object that contains the keys to group by
  // example: {x: "xCol", y: "yCol", facet: "facetCol", group: "groupCol"}...
  // the keys can be any names
  // example: {apple: "xCol", banana: "yCol", orange: "facetCol", pineapple: "groupCol"}...
  // the values are the column names to group by
  // the return value will look like:
  // [{apple: "xVal", banana: "yVal", orange: "facetVal", pineapple: "groupVal", value: aggregatedValue, dataEntries: [originalValues]}]
  groupByKeys = {},
  // this is the final value you want in each group
  // this is what will be agregated
  valueAccessor = (d) => d,
  // can be ["mean", "median", "max", "min", "sum"]
  // or a custom function
  aggregationType = null,
  // whether you want to return stats about the values in each group or not
  // will return mean, median, mode, max, min, sum, count, 3 quantiles, interquartile range
  returnStats = false,
}) {
  const keyNames = Object.keys(groupByKeys);

  const keyAccessors = keyNames
    .filter((d) => d)
    .map((k) => (d) => {
      return d[groupByKeys[k]];
    });

  // Group data by x and y keys and facet key
  const groupedData = flatGroup(data, ...keyAccessors);

  // Aggregate values based on the specified aggregation type
  const aggregateFunction = getAggregateFunction(aggregationType);

  const aggregatedData = groupedData.map((group) => {
    // flatGroup has the format: [key1, key2, key3,..., keyN, values]
    // the values are the last element. get them.
    const values = group.slice(-1)[0];

    // create an object with keyName: keyValue pairs
    const keyValues = keyNames.reduce((acc, key, i) => {
      if (key) {
        acc[key] = group[i];
      }
      return acc;
    }, {});

    let aggregated = null;

    if (aggregateFunction) {
      aggregated = aggregateFunction(values.map(valueAccessor));
    } else {
      aggregated = values.map(valueAccessor);
    }

    const stats = {};
    if (returnStats) {
      stats.mean = mean(values.map(valueAccessor));
      stats.median = median(values.map(valueAccessor));
      stats.mode = mode(values.map(valueAccessor));
      stats.max = max(values.map(valueAccessor));
      stats.min = min(values.map(valueAccessor));
      stats.sum = sum(values.map(valueAccessor));
      stats.count = values.length;
      stats.q1 = quantile(values.map(valueAccessor), 0.25);
      stats.q2 = quantile(values.map(valueAccessor), 0.5);
      stats.q3 = quantile(values.map(valueAccessor), 0.75);
      stats.iqr = stats.q3 - stats.q1;
    }

    return {
      ...keyValues,
      value: aggregated,
      dataEntries: values,
      stats,
    };
  });

  return aggregatedData;
}

export const mapToObject = (
  map = new Map(),
  parentNestLocation = [],
  processValue = (d) => d,
  // hook will allow you to do extra computation on every recursive call to this function
  hook = (...args) => {}
) =>
  Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => {
      // also store nestLocation for all of the deepest children
      value.nestLocation = parentNestLocation.slice();
      value.nestLocation.push(key);
      hook(key, value);

      return value instanceof Map
        ? [key, mapToObject(value, value.nestLocation, processValue)]
        : [key, processValue(value)];
    })
  );

// parse the width/height passed to a chart
export const parseChartDim = (dim) => {
  // if it's a number, treat it as pixels
  // if string, return as is

  if (typeof dim === "number") {
    return `${dim}px`;
  }
  return dim;
};

export function sanitiseData(data, chart = false) {
  // check if it's not an array or undefined
  if (!Array.isArray(data) || !data) {
    return [];
  }

  // filter out null elements from data array
  // for the remaining rows, check if the whole row is null
  let cleanData;
  if (!chart) {
    cleanData = data
      .filter((d) => d)
      .filter((d) => !d.every((val) => val === null));
  } else {
    cleanData = data;

    // remove percentage signs from data
    cleanData.forEach((d) => {
      Object.entries(d).forEach(([key, value]) => {
        if (typeof value === "string" && value.endsWith("%")) {
          d[key] = +value.slice(0, -1);
        }
      });
    });
  }
  return cleanData;
}

export function getColValues(data = [], columns = []) {
  if (!columns.length || !data || !data.length) return [];

  // if single column, just return that column value
  // if multiple, join the column values with separator
  const vals = new Set();
  data.forEach((d) => {
    const val = columns.reduce((acc, c, i) => {
      if (i > 0) {
        acc += "-";
      }
      acc += d[c];
      return acc;
    }, "");

    vals.add(val);
  });

  return Array.from(vals);
}

export function createChartData(data, columns) {
  // find if there's a date column
  const dateColumns = columns?.filter((d) => d.colType === "date");
  // date comes in as categorical column, but we use that for the x axis, so filter that out also
  const categoricalColumns = columns?.filter(
    (d) => d?.variableType?.[0] === "c" && d.colType !== "date"
  );

  // y axis columns are only numeric non date columns
  const yAxisColumns = columns?.filter(
    (d) => d?.variableType?.[0] !== "c" && d.colType !== "date"
  );

  const xAxisColumns = columns?.slice();

  // find unique values for each of the x axis columns for the dropdowns
  // this we'll use for "labels" prop for chartjs
  const xAxisColumnValues = {};
  xAxisColumns?.forEach((c) => {
    xAxisColumnValues[c.key] = getColValues(data, [c.key]);
  });

  const cleanedData = sanitiseData(data, true);

  return {
    xAxisColumns: xAxisColumns ? xAxisColumns : [],
    categoricalColumns: categoricalColumns ? categoricalColumns : [],
    yAxisColumns: yAxisColumns ? yAxisColumns : [],
    dateColumns: dateColumns ? dateColumns : [],
    xAxisColumnValues,
    cleanedData: cleanedData,
  };
}

export const mplColorsToD3 = {
  magma: interpolateMagma,
  inferno: interpolateInferno,
  plasma: interpolatePlasma,
  viridis: interpolateViridis,
  cividis: interpolateCividis,
  turbo: interpolateTurbo,
  Blues: interpolateBlues,
  BrBG: interpolateBrBG,
  BuGn: interpolateBuGn,
  BuPu: interpolateBuPu,
  GnBu: interpolateGnBu,
  Greens: interpolateGreens,
  Greys: interpolateGreys,
  OrRd: interpolateOrRd,
  Oranges: interpolateOranges,
  PRGn: interpolatePRGn,
  PiYG: interpolatePiYG,
  PuBu: interpolatePuBu,
  PuBuGn: interpolatePuBuGn,
  PuOr: interpolatePuOr,
  PuRd: interpolatePuRd,
  Purples: interpolatePurples,
  RdBu: interpolateRdBu,
  RdGy: interpolateRdGy,
  RdPu: interpolateRdPu,
  RdYlBu: interpolateRdYlBu,
  RdYlGn: interpolateRdYlGn,
  Reds: interpolateReds,
  Spectral: interpolateSpectral,
  YlGn: interpolateYlGn,
  YlGnBu: interpolateYlGnBu,
  YlOrBr: interpolateYlOrBr,
  YlOrRd: interpolateYlOrRd,
  cool: interpolateCool,
  coolwarm: interpolateWarm,
  rainbow: interpolateRainbow,
  afmhot: null,
  autumn: null,
  binary: null,
  bone: null,
  brg: null,
  bwr: null,
  copper: null,
  cubehelix: interpolateCubehelixDefault,
  flag: null,
  gist_earth: null,
  gist_gray: null,
  gist_heat: null,
  gist_ncar: null,
  gist_rainbow: null,
  gist_stern: null,
  gist_yarg: null,
  gnuplot: null,
  gnuplot2: null,
  gray: schemeGreys,
  hot: null,
  hsv: null,
  jet: null,
  nipy_spectral: null,
  ocean: null,
  pink: null,
  prism: null,
  seismic: null,
  spring: null,
  summer: null,
  terrain: null,
  winter: null,
  Accent: null,
  Dark2: null,
  Paired: schemePaired,
  Pastel1: schemePastel1,
  Pastel2: schemePastel2,
  Set1: schemeSet1,
  Set2: schemeSet2,
  Set3: schemeSet3,
  tab10: schemeTableau10,
  tab20: schemeTableau10,
  schemeCategory10: schemeCategory10,
};

export function createChartJSConfig(
  data,
  xAxisColumns,
  yAxisColumns,
  selectedXValues,
  xAxisIsDate
) {
  if (
    !xAxisColumns.length ||
    !yAxisColumns.length ||
    !selectedXValues ||
    !data ||
    !data.length
  ) {
    return {
      chartLabels: [],
      chartData: [],
    };
  }

  // chart labels are just selectedXValues
  const chartLabels = selectedXValues?.map((d) => d.label);

  // go through data and find data points for which the x value exists in chartLabels
  let filteredData = data.filter((d) => {
    const xLab = getColValues(
      [d],
      xAxisColumns.map((d) => d.label)
    )[0];

    d.__xLab__ = xLab;
    return chartLabels?.includes(xLab);
  });

  // if there's multiple data rows for an x axis label, sum all the yAxisColumns for them
  // this is the data that will be used for the chart
  // don't use d3 while doing this, since d3 is not imported in this file
  // use native js instead
  filteredData = filteredData.reduce((acc, curr) => {
    const key = curr.__xLab__;

    if (!acc[key]) {
      acc[key] = {};
      yAxisColumns.forEach((col) => {
        acc[key][col.label] = 0;
      });
    }

    yAxisColumns.forEach((col) => {
      acc[key][col.label] += curr[col.label];
    });
    return acc;
  }, {});

  // if x axis is not date,
  // sort labels and fitleredData by the first yAxisColumn
  if (!xAxisIsDate) {
    chartLabels?.sort(
      (a, b) =>
        filteredData[b][yAxisColumns[0].label] -
        filteredData[a][yAxisColumns[0].label]
    );
  } else {
    const colDetails = xAxisColumns[0].__data__;

    const dateToUnix = colDetails?.dateToUnix || ((d) => d);
    // if we do, then run the dateToUnix function on each label
    chartLabels.sort((a, b) => dateToUnix(a) - dateToUnix(b));
  }

  // convert filteredData to an array of objects
  // this is the format that chartjs expects
  filteredData = Object.entries(filteredData).map(([key, value]) => {
    const obj = { __xLab__: key };
    yAxisColumns.forEach((col) => {
      obj[col.label] = value[col.label];
    });
    return obj;
  });

  if (xAxisIsDate) {
    // sort filtered data according to the labels
    filteredData.sort((a, b) => {
      if (xAxisIsDate) {
        return (
          chartLabels.indexOf(a.__xLab__) - chartLabels.indexOf(b.__xLab__)
        );
      }
    });
  }

  // use chartjs parsing to create chartData
  // for each yAxisColumn, there is a chartjs "dataset"
  const chartData = yAxisColumns?.map((col, i) => ({
    label: col.label,
    data: filteredData,
    backgroundColor: chartColors[i % chartColors.length],
    parsing: {
      xAxisKey: "__xLab__",
      yAxisKey: col.label,
      // for pie charts
      key: col.label,
    },
  }));

  return { chartData, chartLabels };
}

function formatTime(val) {
  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };
  
  const dateFormats = [
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DD",
    "YYYY-MM",
    "YYYY-MMM",
  ];

  const dateFormats = [
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DD",
    "YYYY-MM",
    "YYYY-MMM",
  ];

  // convert all values to date
  val = toTitleCase(val);
  // check if it matches any of the date formats
  const date = dayjs(val, dateFormats, true);
  if (date.isValid()) {
    return date.format("D MMM 'YY");
  } else {
    return val;
  }
}

export function setChartJSDefaults(
  ChartJSRef,
  title = "",
  xAxisIsDate = false,
  theme,
  pieChart = false
) {
  ChartJSRef.defaults.scale.grid.drawOnChartArea = false;
  ChartJSRef.defaults.interaction.axis = "x";
  ChartJSRef.defaults.interaction.mode = "nearest";
  ChartJSRef.defaults.maintainAspectRatio = false;
  ChartJSRef.defaults.plugins.title.display = true;
  // pie charts can be multiple, so we don't want to show the overall title aka query
  // we want to show each column's title above each pie chart instead (this is done in the component itself)
  if (!pieChart) {
    ChartJSRef.defaults.plugins.title.text = title;
  }

  // tooltip background clor white
  ChartJSRef.defaults.plugins.tooltip.backgroundColor = "white";
  // title and label color is chartcolors primary color
  ChartJSRef.defaults.plugins.tooltip.titleColor = "#0D0D0D";
  ChartJSRef.defaults.plugins.tooltip.bodyColor = "#0D0D0D";
  // border color is defog blue
  ChartJSRef.defaults.plugins.tooltip.borderColor = "#2B59FF";
  ChartJSRef.defaults.plugins.tooltip.borderWidth = 1;
  ChartJSRef.defaults.plugins.tooltip.padding = 10;

  ChartJSRef.defaults.plugins.title.color = theme?.primaryText;

  // if x axis is a date, add a d3 formatter
  ChartJSRef.defaults.plugins.tooltip.displayColors = false;

  ChartJSRef.defaults.plugins.tooltip.callbacks.title = function (
    tooltipItems
  ) {
    return tooltipItems.map((item) =>
      xAxisIsDate ? formatTime(item.label) : item.label
    );
  };

  ChartJSRef.defaults.scales.category.ticks = {
    callback: function (value) {
      return xAxisIsDate
        ? formatTime(this.getLabelForValue(value))
        : this.getLabelForValue(value);
    },
  };

  ChartJSRef.defaults.plugins.tooltip.callbacks.label = function (tooltipItem) {
    return tooltipItem.dataset.label + ": " + tooltipItem.formattedValue;
  };

  if (pieChart) {
    // legend labels are also dates
    // pie/doughnuts charts are weird in chartjs
    // brilliant hack to edit some props of legendItems without having to remake them from here: https://stackoverflow.com/questions/39454586/pie-chart-legend-chart-js
    ChartJSRef.overrides.pie.plugins.legend.labels.filter = function (
      legendItem
    ) {
      legendItem.text = xAxisIsDate
        ? formatTime(legendItem.text)
        : legendItem.text;
      return true;
    };
  }
}
