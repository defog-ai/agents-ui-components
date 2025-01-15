// this context is specific for each chart
// hence not used in the Setup.jsx file once
// but used inside ChartContainer.tsx and added to each chart separately

import { createContext } from "react";

interface ChartStyle {
  /** The chart title */
  title: string;
  /** Font size for chart elements */
  fontSize: number;
  /** Background color of the chart */
  backgroundColor: string;
  /** Label for the x-axis */
  xLabel: string | null;
  /** Label for the y-axis */
  yLabel: string | null;
  /** Whether to show x-axis grid lines */
  xGrid: boolean;
  /** Whether to show y-axis grid lines */
  yGrid: boolean;
  /** Number of ticks on the x-axis */
  xTicks: number;
  /** Format for date values */
  dateFormat: string;
  /** Number of ticks on the y-axis */
  yTicks: number;
  /** Color scheme for the chart. Used for all charts. Styles applied to individual bars and lines override this scheme. */
  selectedScheme: string;
  /** Unit label for the y-axis */
  yAxisUnitLabel: string;
}

interface LineChartOptions {
  /** Width of the line */
  lineWidth: number;
  /** Type of curve for the line */
  curve: string;
  /** Whether to show markers on data points */
  marker: boolean;
  /** Column to group data by */
  groupBy: string;
  /** Column to determine line color */
  stroke: string;
  /** Options for line styling. Each property is a column name. */
  lineOptions: { [colName: string]: { stroke: string; strokeWidth: number } };
  /** Whether to show labels on the chart */
  showLabels: boolean;
  filter: string | null;
  colorBy?: string | null;
  colorByIsDate?: boolean;
  aggregateFunction: "sum" | "count" | "mean";
}

interface BarChartOptions {
  /** Width of the bars */
  barWidth: number;
  /** Function to aggregate the data */
  aggregateFunction:
    | "sum"
    | "proportion"
    | "count"
    | "median"
    | "mean"
    | "variance";
  /** Options for bar styling. Each property is a column name. */
  barOptions: { [colName: string]: { fill: string } };
  /** Column to determine bar color */
  fill: string | null;
  /** Column to determine bar color when within a group (aka x facet) */
  colorBy: string | null;
  /** Whether the colorBy column is a date column */
  colorByIsDate: boolean;
}

interface ScatterChartOptions {
  /** Color of the points */
  pointColor: string;
  /** Size of the points */
  pointSize: number;
}

interface HistogramOptions {
  /** Number of bins in the histogram */
  binCount: number;
  /** Fill color of the bars */
  fillColor: string;
  /** Thresholds for binning */
  thresholds: string | number[];
  /** Whether to normalize the histogram */
  normalize: boolean;
  /** Whether to show cumulative distribution */
  cumulative: boolean;
}

interface BoxplotOptions {
  /** Fill color of the box */
  fill: string;
  /** Stroke color of the box */
  stroke: string;
  /** Width of the stroke */
  strokeWidth: number;
  /** Opacity of the box */
  opacity: number;
  /** Orientation of the boxplot */
  boxplotOrientation: string;
}

interface ChartSpecificOptions {
  /** Options for line charts */
  line: LineChartOptions;
  /** Options for bar charts */
  bar: BarChartOptions;
  /** Options for scatter plots */
  scatter: ScatterChartOptions;
  /** Options for histograms */
  histogram: HistogramOptions;
  /** Options for boxplots */
  boxplot: BoxplotOptions;
}

interface SelectedColumns {
  /** Selected column for x-axis */
  x: string | null;
  /** Selected column(s) for y-axis */
  y: string | string[] | null;
  /** Selected column for faceting */
  facet?: string | null;
  /** Selected column for fill color */
  fill?: string | null;
  /** Selected column for stroke color */
  stroke?: string | null;
  filter?: string | null;
}

interface Column {
  /** Column key */
  key: string;
  /** Type of the variable (e.g., 'quantitative', 'categorical') */
  variableType: string;
  /** Whether the column contains date values */
  isDate: boolean;
  /** Column title */
  title: string;
  /** Column description */
  description: string;
  /** Column type */
  colType: string;
}

interface ChartConfig {
  /**Currently selected chart type */
  selectedChart: string;
  /**Selected columns for the chart */
  selectedColumns: SelectedColumns;
  /**Style options for the chart */
  chartStyle: ChartStyle;
  /**Options specific to each chart type */
  chartSpecificOptions: ChartSpecificOptions;
  /** Whether the chart is in a loading state */
  loading?: boolean;
  /**Data for the chart */
  data: Array<Object>;
  /**Available columns in the dataset */
  availableColumns: Array<Column>;
}

interface ChartUtils {
  /**Deep merge state updates into current state, and return the merged state. */
  mergeConfigUpdates: (configUpdates: Partial<ChartConfig>) => ChartManager;
  /**Callback function to set the state */
  setConfigCallback: (newConfig: ChartConfig) => void;
  /**Clone the current config. Returns the config without any function properties and `skipKeys` if passed. */
  clone: (skipKeys: string[]) => Partial<ChartConfig>;
}

interface ActionHandlers {
  /** Calls the setConfigCallback function with the latest config */
  render: () => void;

  setSelectedChart: (newChart: string) => ChartManager;
  setSelectedColumns: (selectedColumns: SelectedColumns) => ChartManager;
  updateChartStyle: (newStyle: Partial<ChartStyle>) => ChartManager;
  updateChartSpecificOptions: (
    newOptions: Partial<ChartSpecificOptions[keyof ChartSpecificOptions]>
  ) => ChartManager;
  setData: (newData: Array<Object>) => ChartManager;
  setAvailableColumns: (newColumns: Array<Column>) => ChartManager;
  autoSelectVariables: () => ChartManager;
  editChart: (
    userQuestion: string,
    chartEditUrl: string,
    callbacks?: {
      onError?: (error: Error) => void;
    }
  ) => Promise<void>;
}

export interface ChartManager extends ActionHandlers, ChartUtils {
  config: ChartConfig;
}

/**
 * Handy, chainable methods to change chart config without doing chartManager.update({...}) everytime.
 */
export function createActionHandlers(): ActionHandlers {
  // @ts-ignore
  const actionHandlers: ChartManager = {
    render: function () {
      this.setConfigCallback(this.config);
    },
    setSelectedChart: function (payload) {
      this.config = {
        ...this.config,
        selectedChart: payload,
        selectedColumns: {
          x: null,
          y: payload === "line" || payload === "bar" ? [] : null,
        },
        chartStyle: {
          ...defaultChartManager.config.chartStyle,
          xLabel: null,
          yLabel: null,
        },
      };

      return this;
    },
    setSelectedColumns: function (payload) {
      this.config = { ...this.config, selectedColumns: payload };
      return this;
    },
    updateChartStyle: function (payload) {
      this.config = {
        ...this.config,
        chartStyle: { ...this.config.chartStyle, ...payload },
      };
      return this;
    },
    updateChartSpecificOptions: function (payload) {
      this.config = {
        ...this.config,
        chartSpecificOptions: {
          ...this.config.chartSpecificOptions,
          [this.config.selectedChart]: {
            ...this.config.chartSpecificOptions[this.config.selectedChart],
            ...payload,
          },
        },
      };
      return this;
    },
    setData: function (payload) {
      this.config.data = payload;
      return this;
    },
    setAvailableColumns: function (payload) {
      this.config.availableColumns = payload;
      return this;
    },
    autoSelectVariables: function () {
      const { selectedChart, availableColumns } = this.config;

      const dateColumn = availableColumns.find((col) => col.isDate);
      const quantColumns = availableColumns.filter(
        (col) => col.variableType === "quantitative"
      );
      const nonQuantNonDateColumns = availableColumns.filter(
        (col) => col.variableType !== "quantitative" && !col.isDate
      );

      // first select y column, then x column

      let yAxis =
        // first try getting quant columns
        quantColumns[0]?.key ||
        // try selecting non quant non date columns
        nonQuantNonDateColumns[0]?.key ||
        // just get first column
        availableColumns[0]?.key ||
        null;

      // get all columns except the y axis column
      const remainingColumns = availableColumns.filter(
        (col) => col.key !== yAxis
      );

      const remainingNonQuantColumns = remainingColumns.filter(
        (col) => col.variableType !== "quantitative"
      );

      const remainingQuantColumns = remainingColumns.filter(
        (col) => col.variableType === "quantitative"
      );

      let xAxis =
        // first try getting a date column
        dateColumn?.key ||
        // then try getting a remaining quant column
        remainingQuantColumns[0]?.key ||
        // then try a remaining non-quant column
        remainingNonQuantColumns[0]?.key ||
        // else just get the first column from all columns
        availableColumns[0]?.key ||
        // if here, then just do null
        null;

      this.config = {
        ...this.config,
        selectedColumns: {
          x: xAxis,
          y:
            yAxis === null
              ? null
              : selectedChart === "line" || selectedChart == "bar"
                ? [yAxis]
                : yAxis,
        },
      };

      return this;
    },
    editChart: async function (
      userQuestion: string,
      chartEditUrl: string,
      callbacks?: {
        onError?: (error: Error) => void;
      }
    ): Promise<void> {
      try {
        // start loading
        this.mergeConfigUpdates({ loading: true }).render();

        const response = await fetch(chartEditUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_request: userQuestion,
            current_chart_state: this.clone(["data", "availableColumns"]),
            columns: this.config.availableColumns.map((col) => ({
              title: col.title,
              col_type: col.colType,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok || data.error || !data.success) {
          throw new Error(data.error || "Failed to edit chart");
        }

        const chartConfigEdits = data["chart_state_edits"];

        this.mergeConfigUpdates({
          ...chartConfigEdits,
          loading: false,
        }).render();
      } catch (error) {
        this.mergeConfigUpdates({ loading: false }).render();
        callbacks?.onError?.(error as Error);
        throw error;
      }
    },
  };

  return actionHandlers;
}

function deepMergeObjects(
  obj1: ChartConfig,
  obj2: Partial<ChartConfig>
): ChartConfig {
  const merged = { ...obj1 };

  for (const key in obj2) {
    if (
      // if this isn't an object we don't need to deep merge
      typeof obj2[key] === "object" &&
      // if this is an array, we don't need to deep merge, we will just slice later
      !Array.isArray(obj2[key]) &&
      // if this key doesn't exist in obj1, we don't need to deep merge
      obj1[key] !== undefined
    ) {
      merged[key] = deepMergeObjects(obj1[key], obj2[key]);
    } else {
      // if this is an array, slice
      if (Array.isArray(obj2[key])) {
        merged[key] = obj2[key].slice();
      } else {
        merged[key] = obj2[key];
      }
    }
  }

  return merged;
}

export const defaultChartManager: ChartManager = {
  config: {
    selectedChart: "bar",
    selectedColumns: {
      x: null,
      y: null,
      facet: null,
      fill: null,
      stroke: null,
      filter: null,
    },
    chartStyle: {
      title: "",
      fontSize: 12,
      backgroundColor: "#ffffff",
      xLabel: null,
      yLabel: null,
      xGrid: false,
      yGrid: true,
      xTicks: 10,
      dateFormat: "%b %-d, %Y",
      yTicks: 10,
      selectedScheme: "Tableau10",
      yAxisUnitLabel: "",
    },
    chartSpecificOptions: {
      line: {
        lineWidth: 4,
        curve: "linear",
        marker: false,
        filter: null,
        groupBy: "",
        stroke: "",
        lineOptions: {},
        showLabels: false,
        aggregateFunction: "sum",
        colorBy: null,
        colorByIsDate: false,
      },
      bar: {
        barWidth: 0.8,
        aggregateFunction: "sum",
        fill: null,
        barOptions: {},
        colorBy: null,
        colorByIsDate: false,
      },
      scatter: { pointColor: "#f54242", pointSize: 3 },
      histogram: {
        binCount: 10,
        fillColor: "#4287f5",
        thresholds: "auto",
        normalize: false,
        cumulative: false,
      },
      boxplot: {
        fill: "#8AA7E2",
        stroke: "#355DA3",
        strokeWidth: 1,
        opacity: 1,
        boxplotOrientation: "vertical",
      },
    },
    loading: false,
    data: [],
    availableColumns: [],
  },
  mergeConfigUpdates: function (configUpdates) {
    // if config updates have selectedChart === "line"
    // or if the active chart is line or bar
    // make sure that selectedColumns.y is an Array
    let isLineOrBar;
    if (configUpdates.selectedChart) {
      isLineOrBar =
        configUpdates.selectedChart === "line" ||
        configUpdates.selectedChart === "bar";
    } else {
      isLineOrBar =
        this.config.selectedChart === "line" ||
        this.config.selectedChart === "bar";
    }

    if (isLineOrBar) {
      if (configUpdates.selectedColumns && configUpdates.selectedColumns.y) {
        if (!Array.isArray(configUpdates.selectedColumns.y)) {
          configUpdates.selectedColumns.y = [configUpdates.selectedColumns.y];
        }
      }
    } else {
      // if this isn't a line, make sure y is NOT an array
      if (configUpdates.selectedColumns && configUpdates.selectedColumns.y) {
        if (
          Array.isArray(configUpdates.selectedColumns.y) &&
          configUpdates.selectedColumns.y.length > 0
        ) {
          configUpdates.selectedColumns.y = configUpdates.selectedColumns.y[0];
        }
      }
    }
    // because these state updates can have nested objects
    // for example: user question: "plot ratings onthe x axis"
    // if currently the selectedColumns are { x: "date", y: "value" }
    // then the state update will be { selectedColumns: { x: "ratings" } }
    // but if we directly do {...this, ...configUpdates}, then the y value will be lost
    // hence we need to do a deep merge
    this.config = deepMergeObjects(
      JSON.parse(JSON.stringify(this.config)),
      configUpdates
    );

    return this;
  },
  setConfigCallback: () => {},
  clone: function (skipKeys = []) {
    // return a copy of the state without any function properties, and without any keys in skipKeys
    const clone: Partial<ChartConfig> = {};
    for (const key in this.config) {
      if (
        typeof this.config[key] !== "function" &&
        skipKeys.indexOf(key) === -1
      ) {
        clone[key] = this.config[key];
      }
    }
    return clone;
  },
  // add action handlers
  ...createActionHandlers(),
};

/**
 * Create a new chart manager.
 */
export function createChartManager(
  /**
   * Partial chart config.
   */
  partialConfig: Partial<ChartConfig> = {},
  /**
   * Callback function to set the state. chartManager.xxx().yyy().render() will call this function with the latest chartManager after applying the xxx and yyy methods.
   */
  setConfigCallback: ChartManager["setConfigCallback"] = () => {}
): ChartManager {
  // only set defined keys
  const newManager = Object.assign({}, defaultChartManager);

  for (const key in partialConfig) {
    if (partialConfig[key] !== undefined) {
      newManager.config[key] = partialConfig[key];
    }
  }

  return {
    ...newManager,
    config: newManager.config,
    setConfigCallback,
  };
}

// defining this so explicitly here only to allow vscode's intellisense to work
// we can also just do createContext()
// but defining this here lets jsdoc + intellisense play together nicely
export const ChartManagerContext = createContext(createChartManager());
