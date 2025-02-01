// @ts-nocheck

import * as Plot from "@observablehq/plot";
import dayjs from "dayjs";
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
  type: "line" | "bar" | "scatter";
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
  yAxisUnitPosition?: "prefix" | "suffix";
  showLabels?: boolean;
  margin?: Margin;
  dateFormat?: string;

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
  backgroundColor: "transparent",
  fontSize: 12,
  title: "",
  lineWidth: 3,
  pointColor: "steelblue",
  yAxisUnitLabel: "",
  yAxisUnitPosition: "suffix",
  showLabels: false,
  margin: { top: 20, right: 20, bottom: 80, left: 50 },
  dateFormat: "%Y-%m-%d",

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
    y?: string;
    ticks?: number;
    label?: string;
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

  const chartMarks = getMarks(
    filteredData,
    {
      ...mergedOptions,
    },
    selectedColumns,
    availableColumns
  );

  const xIsDate = mergedOptions.xIsDate || false;

  // if there is faceting, then calculate the facet positions
  if (mergedOptions.facet && mergedOptions.type !== "bar") {
    // first, get the unique facet values
    const uniqueFacetValues = Array.from(
      new Set(
        filteredData.map((d) => {
          return d[mergedOptions.facet];
        })
      )
    );

    // then, calculate the x and y positions for each facet
    const facetXLocations = uniqueFacetValues.map((facetValue, i) => {
      return i % 2;
    });
    const facetYLocations = uniqueFacetValues.map((facetValue, i) => {
      return parseInt(i / 2);
    });

    // add the index of the facet value to the data
    filteredData.forEach((d, i) => {
      // first, get all unique facet values
      const facetIndex = uniqueFacetValues.indexOf(d[mergedOptions.facet]);

      // then
      d.facetIndex = facetIndex;
      d.facetXLocation = facetXLocations[facetIndex];
      d.facetYLocation = facetYLocations[facetIndex];
    });

    // finally, add the facet titles as text marks
    Array.from(uniqueFacetValues).map((facetValue, i) => {
      const facetIndex = uniqueFacetValues.indexOf(facetValue);
      const xLocation = facetXLocations[facetIndex];
      const yLocation = facetYLocations[facetIndex];

      chartMarks.push(
        Plot.text([facetValue], {
          fx: xLocation,
          fy: yLocation,
          frameAnchor: "top",
          monospace: true,
        })
      );
    });
  }

  const plotOptions: PlotOptions = {
    width: dimensions.width,
    height: dimensions.height,
    marginTop: mergedOptions?.margin?.top ?? defaultOptions?.margin?.top,
    marginRight: mergedOptions?.margin?.right ?? defaultOptions?.margin?.right,
    marginBottom:
      (mergedOptions?.margin?.bottom ?? defaultOptions?.margin?.bottom) ||
      0 + 50,
    marginLeft: mergedOptions?.margin?.left ?? defaultOptions?.margin?.left,
    style: {
      backgroundColor: mergedOptions.backgroundColor,
      overflow: "visible",
      fontSize: mergedOptions.fontSize,
    },
    color: {
      legend: true,
      tickFormat: (d: any) => {
        return d;
      },
      swatchSize: 10,
    },
    y: {
      grid: mergedOptions.yGrid,
      nice: true,
      label: mergedOptions.yLabel || mergedOptions.y,
      labelOffset: 22,
    },
    x: {
      grid: mergedOptions.xGrid,
      label: mergedOptions.xLabel || mergedOptions.x,
    },
    marks: chartMarks,
    facet: {
      // if this is a bar chart, use the xLabel for the facet x axis
      label: mergedOptions.xLabel,
    },
  };

  if (mergedOptions.facet && mergedOptions.type !== "bar") {
    plotOptions.facet = {
      data: filteredData,
      x: "facetXLocation",
      y: "facetYLocation",
      axis: null,
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
  let xAxis;
  if (options.type !== "bar") {
    xAxis = getXAxis(mergedOptions);
  }
  return [...baseMarks, ...(xAxis ? [xAxis] : []), ...chartMarks];
}

interface AggregateRecord {
  label: string;
  value: number;
  facet: string;
}

export function aggregateData(
  data: Array<any>,
  aggregateFunction: string
): Array<AggregateRecord> {
  let aggregatedData = [];
  if (aggregateFunction == "sum") {
    aggregatedData = data.reduce((acc, curr) => {
      const { label, value, facet } = curr;
      const existingRecord = acc.find(
        (record: AggregateRecord) =>
          record.label === label && record.facet === facet
      );
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
      const existingRecord = acc.find(
        (record: AggregateRecord) =>
          record.label === label && record.facet === facet
      );
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
      const existingRecord = acc.find(
        (record: AggregateRecord) =>
          record.label === label && record.facet === facet
      );
      if (existingRecord) {
        existingRecord.value += value;
      } else {
        acc.push({ label, value, facet });
      }
      return acc;
    }, []);
    aggregatedData = aggregatedData.map((record: AggregateRecord) => {
      return {
        ...record,
        value:
          record.value /
          data.filter(
            (d: AggregateRecord) =>
              d.label === record.label && d.facet === record.facet
          ).length,
      };
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
    lineHeight: 1.2,
    tickSize: 0,
    nice: true,
    rotate: -45,
    textAnchor: "end",
    tickFormat: (d, i, ticks) => {
      // if bar chart and not xIsDate, return null
      if (options.type === "bar") {
        return null;
      }

      // if xIsDate, format the date
      if (options.xIsDate) {
        let dateXTick;
        try {
          dateXTick = dayjs(d);
        } catch (e) {
          dateXTick = d;
        }

        // Calculate the total time range
        const firstDate = dayjs(ticks[0]);
        const lastDate = dayjs(ticks[ticks.length - 1]);
        const totalDays = lastDate.diff(firstDate, "day");

        // Choose format based on time range
        if (totalDays > 365) {
          // For ranges over a year, show first day of each quarter
          return dateXTick.date() === 1 && dateXTick.month() % 3 === 0
            ? dateXTick.format("MMM YYYY")
            : null;
        } else if (totalDays > 90) {
          // For ranges over 3 months, show first day of each month
          return dateXTick.date() === 1 ? dateXTick.format("MMM YYYY") : null;
        } else if (totalDays > 14) {
          // For ranges over 2 weeks, show mondays
          return dateXTick.day() === 1 ? dateXTick.format("MMM DD") : null;
        } else {
          // For shorter ranges, show daily ticks
          return dateXTick.format("MMM DD");
        }
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

function getLineMarks(
  data: any[],
  options: ChartOptions,
  selectedColumns: string[],
  availableColumns: string[]
): ChartMark[] {
  const marks = [];
  const aggregateFunction = options.aggregateFunction || "sum";

  const { x, y, facet } = options;

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
    stroke: "label",
    strokeWidth: (d) => {
      // d is an array here for some reason.
      const label = d?.[0]?.["label"];
      // if options.lineOptions[d["label"]] exists, use that
      if (
        label &&
        options.lineOptions?.[label] &&
        options.lineOptions[label].strokeWidth
      ) {
        return options.lineOptions[label].strokeWidth;
      } else {
        // else use the default linewidth
        return options.lineWidth;
      }
    },
    curve: options.lineOptions?.curve || options.curve,
    tip: {
      format: {
        x: (d) => `${d}`,
        y: (d) => `${d}`,
        strokeWidth: false,
        stroke: false,
      },
    },
  };

  const groupingOptions = {
    y: aggregateFunction,
  };

  marks.push(Plot.lineY(data, Plot.groupX(groupingOptions, lineOptions)));

  return marks;
}

interface DataRecord {
  label: string;
  value: number;
  facet: string | dayjs.Dayjs;
}

interface AggregatedRecord {
  label: string;
  value: number;
  facet: string | dayjs.Dayjs;
}

function transformInputData(data: any[], options: ChartOptions): DataRecord[] {
  return data.map((d) => ({
    label: d[options.x || "label"],
    value: d[options.y || "value"],
    facet: d[options.facet || "facet"],
  }));
}

function processDateFacets(data: AggregatedRecord[]): AggregatedRecord[] {
  return data.map((d) => ({
    ...d,
    facet: dayjs(d.facet),
  }));
}

function getFacetTotal(records: AggregatedRecord[]): AggregatedRecord[] {
  return records.reduce((acc, curr) => {
    const existingRecord = acc.find((record) => record.facet === curr.facet);
    if (existingRecord) {
      existingRecord.value += curr.value;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as AggregatedRecord[]);
}

function processNonDateFacets(data: AggregatedRecord[]): AggregatedRecord[] {
  // Get top 10 facets by total value
  const facetTotals = getFacetTotal(data);
  const top10Facets = new Set(
    facetTotals
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((d) => d.facet)
  );

  // Aggregate remaining data into "Others" category
  const otherLabels: Record<string, number> = {};
  data.forEach((record) => {
    if (!top10Facets.has(record.facet)) {
      otherLabels[record.label] =
        (otherLabels[record.label] || 0) + record.value;
    }
  });

  const othersData = Object.entries(otherLabels).map(([label, value]) => ({
    label,
    value,
    facet: "Others" as string,
  }));

  return [
    ...data.filter((record) => top10Facets.has(record.facet)),
    ...othersData,
  ];
}

function getBarMarks(data: any[], options: ChartOptions): ChartMark[] {
  const aggregateFunction = options.aggregateFunction || "sum";

  // Transform and aggregate the input data
  const transformedData = transformInputData(data, options);
  let aggregatedData = aggregateData(transformedData, aggregateFunction);

  // Process the data based on whether x-axis represents dates
  aggregatedData = options.xIsDate
    ? processDateFacets(aggregatedData)
    : processNonDateFacets(aggregatedData);

  // Create the plot marks
  return [
    Plot.rectY(aggregatedData, {
      x: "label",
      y: "value",
      fx: "facet",
      fill: "label",
      sort: !options.xIsDate ? { fx: { value: "-y" } } : undefined,
      tip: {
        format: {
          x: (d) => d,
          y: (d) => d,
          fill: false,
        },
      },
    }),
  ];
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
      x: options.x,
      y: options.y,
      filter: options.filter,
      fill: options.fill || options.pointColor,
      r: options.pointSize,
      fillOpacity: 0.7,
      tip: {
        format: {
          x: (d) => d,
          y: (d) => d,
        },
      },
    }),
  ];
}

export function getColorScheme(scheme: string): {
  colorScheme: string[] | ((t: number) => string);
  schemeName: string;
} {
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
