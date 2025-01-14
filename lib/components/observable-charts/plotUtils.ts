import * as Plot from "@observablehq/plot";
import { timeFormat } from "d3";
import dayjs, { unix } from "dayjs";
import * as d3Colors from "d3-scale-chromatic";

export interface Dimensions {
  width: number;
  height: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartOptions {
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'boxplot';
  x: string | null;
  y: string | string[] | null;
  xLabel?: string;
  yLabel?: string;
  backgroundColor?: string;
  fontSize?: number;
  title?: string;
  lineWidth?: number;
  pointColor?: string;
  yAxisUnitLabel?: string;
  yAxisUnitPosition?: 'prefix' | 'suffix';
  showLabels?: boolean;
  margin?: Margin;
  dateFormat?: string;
  boxplotOrientation?: 'vertical' | 'horizontal';
  color?: { legend: boolean };
  xIsDate?: boolean;
  xGrid?: boolean;
  yGrid?: boolean;
  xTicks?: number;
  yTicks?: number;
  facet?: string;
  filter?: (d: any) => boolean;
  lineOptions?: any;
  aggregateFunction?: string;
}

// Constants
export const defaultOptions: ChartOptions = {
  type: "line",
  x: null,
  y: null,
  xLabel: "X Axis",
  yLabel: "Y Axis",
  backgroundColor: "#ffffff",
  fontSize: 12,
  title: "",
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

export interface PlotOptions {
  width: number;
  height: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  aggregateFunction?: string;
  style?: {
    backgroundColor?: string;
    overflow?: string;
    fontSize?: number;
  };
  color?: {
    legend?: boolean;
    tickFormat?: (d: any) => string;
    swatchSize?: number;
  };
  y?: {
    grid?: boolean;
    nice?: boolean;
    label?: string;
    labelOffset?: number;
    ticks?: number;
  };
  x?: {
    grid?: boolean;
    label?: string;
    ticks?: number;
  };
  marks?: Plot.Mark[];
  facet?: {
    data?: any[];
    x?: string;
    ticks?: number;
  };
}

export const getObservableOptions = (
  dimensions: Dimensions,
  mergedOptions: ChartOptions,
  processedData: any[],
  selectedColumns: string[],
  availableColumns: string[]
): PlotOptions | null => {
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

  const plotOptions: PlotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions?.margin?.top ?? defaultOptions?.margin?.top,
    marginRight: mergedOptions?.margin?.right ?? defaultOptions?.margin?.right,
    aggregateFunction: "sum",
    marginBottom: (mergedOptions?.margin?.bottom ?? defaultOptions?.margin?.bottom) || 0 + 50,
    marginLeft: isHorizontalOrientation ? 100 : (mergedOptions?.margin?.left ?? defaultOptions?.margin?.left),
    style: {
      backgroundColor: mergedOptions.backgroundColor,
      overflow: "visible",
      fontSize: mergedOptions.fontSize,
    },
    color: {
      legend: true,
      tickFormat: (d: any) => {
        if (xIsDate && dayjs(d).isValid()) {
          return timeFormat(mergedOptions.dateFormat || defaultOptions.dateFormat)(unix(d));
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
      ticks: mergedOptions.yTicks,
    },
    x: {
      grid: mergedOptions.xGrid,
      label: mergedOptions.xLabel || mergedOptions.x,
      ticks: mergedOptions.xTicks,
    },
    marks: chartMarks,
    facet: {},
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
export function getMarks(
  data: any[], 
  options: ChartOptions, 
  selectedColumns: string[], 
  availableColumns: string[]
) {
  const mergedOptions = { ...defaultOptions, ...options };
  const baseMarks: any[] = [];
  const chartMarks = getChartSpecificMarks(
    data,
    mergedOptions,
    selectedColumns,
    availableColumns
  );
  const xAxis = getXAxis(mergedOptions);

  return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
}

interface AggregateRecord {
  label: string;
  value: number;
  facet: string;
}

function aggregateData(data: Array<any>, aggregateFunction: string): Array<AggregateRecord> {
  let aggregatedData = [];
  if (aggregateFunction == "sum") {
    aggregatedData = data.reduce((acc, curr) => {
      const { label, value, facet } = curr;
      const existingRecord = acc.find((record: AggregateRecord) => record.label === label && record.facet === facet);
      if (existingRecord) {
        existingRecord.value += value;
      } else {
        acc.push({ label, value, facet });
      }
      return acc;
    }, []);
  } else if (aggregateFunction == "count") {
    aggregatedData = data.reduce((acc, curr) => {
      const { label, facet } = curr;
      const existingRecord = acc.find((record: AggregateRecord) => record.label === label && record.facet === facet);
      if (existingRecord) {
        existingRecord.value += 1;
      } else {
        acc.push({ label, value: 1, facet });
      }
      return acc;
    }, []);
  } else if (aggregateFunction == "mean") {
    // first take the sum, then take the count, then divide sum by count
    aggregatedData = data.reduce((acc, curr) => {
      const { label, value, facet } = curr;
      const existingRecord = acc.find((record: AggregateRecord) => record.label === label && record.facet === facet);
      if (existingRecord) {
        existingRecord.value += value;
      } else {
        acc.push({ label, value, facet });
      }
      return acc;
    }, []);
    aggregatedData = aggregatedData.map((record: AggregateRecord) => {
      return { ...record, value: record.value / data.filter((d: AggregateRecord) => d.label === record.label && d.facet === record.facet).length };
    });
  }
  return aggregatedData;
}

interface AxisX {
  x: string;
  y: string;
  filter: (d: any) => boolean;
  tip: (d: any) => string;
  title: (d: any) => string;
  stroke: string;
  strokeWidth: number;
  curve: string;
}

function getXAxis(options: ChartOptions): Plot.Mark {
  return Plot.axisX({
    // lineWidth: manyTicks ? 9 : 6,
    lineHeight: 1.2,
    ticks: options.xTicks,
    tickSize: 0,
    nice: true,
    rotate: -45,
    textAnchor: "end",
    grid: options.xGrid,
    tickFormat: (d, i, ticks) => {
      // if bar chart, return null
      if (options.type === "bar") {
        return null;
      }

      if (options.xIsDate) {
        let dateXTick;
        try {
          dateXTick = dayjs(d);
        } catch (e) {
          dateXTick = d
        }

        return i % Math.ceil(ticks.length / options.xTicks) === 0 ?
        dateXTick.format("MMM DD, YYYY") : null;
      }
      
      return options.xTicks &&
        i % Math.ceil(ticks.length / options.xTicks) === 0
        ? d
        : null;
    },
  });
}

interface ChartMark extends Plot.Mark {
  x?: string | ((d: any) => any);
  y?: string | ((d: any) => any);
  filter?: (d: any) => boolean;
  tip?: any;
  title?: string | ((d: any) => string);
  stroke?: string;
  strokeWidth?: number;
  curve?: string;
}

// Chart-specific mark generation functions
function getChartSpecificMarks(
  data: any[],
  options: ChartOptions,
  selectedColumns: string[],
  availableColumns: string[]
): ChartMark[] {
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

interface TooltipConfig {
  title?: (d: any) => string;
  format?: (d: any) => string;
}

function getTooltipConfig(options: ChartOptions, isHorizontalBoxplot: boolean = false): TooltipConfig {
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

function getLineMarks(
  data: any[],
  options: ChartOptions,
  selectedColumns: string[],
  availableColumns: string[]
): ChartMark[] {
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
        // else use the default linewidth
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

function getBarMarks(
  data: any[],
  options: ChartOptions
): ChartMark[] {
  const aggregateFunction = options.aggregateFunction || "sum";
  
  const transformedData = data.map((d) => {
    return { 
      label: d[options.x || "label"],
      value: d[options.y || "value"],
      facet: d[options.facet || "facet"]
    };
  });
  const aggregatedData = aggregateData(transformedData, aggregateFunction);
  const marks = [];
  marks.push(
    Plot.barY(
      aggregatedData,
      {
        x: "label",
        y: "value",
        fx: "facet",
        fill: "label",
        sort: {
          fx: {
            value: "-y",
            limit: 10,
          },
        },
        tip: {
          format: {
            x: (d) => d,
            y: (d) => d,
          },
        }
      },
    )
  );
  return marks;
}

function getScatterMarks(
  data: any[],
  options: ChartOptions,
  selectedColumns: string[],
  availableColumns: string[]
): ChartMark[] {
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

function getHistogramMarks(data: any[], options: ChartOptions): ChartMark[] {
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

function getBoxPlotMarks(
  data: any[],
  options: ChartOptions,
  selectedColumns: string[],
  availableColumns: string[]
): ChartMark[] {
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

export function getColorScheme(scheme: string): { colorScheme: string[] | ((t: number) => string); schemeName: string } {
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
}
