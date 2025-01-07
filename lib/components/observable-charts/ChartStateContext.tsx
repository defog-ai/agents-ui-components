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
  /** Color of the line */
  lineColor: string;
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
  aggregateFunction:
    | "sum"
    | "proportion"
    | "count"
    | "median"
    | "mean"
    | "variance";
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
  [key: string]: any;
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
  /**Data for the chart */
  data: Array<Object>;
  /**Available columns in the dataset */
  availableColumns: Array<Column>;
  /**Deep merge state updates into current state, and return the merged state. */
  mergeStateUpdates: (stateUpdate: Partial<ChartState>) => Partial<ChartState>;
  /**Callback function to set the state */
  setStateCallback: (newState: ChartState) => void;
  /**Clone the current state. Returns the state without any function properties and `skipKeys` if passed. */
  clone: (skipKeys: string[]) => Object;
}

export interface ChartState extends ChartConfig, ActionHandlers {
  loading?: boolean;
  [key: string]: any;
}

interface ActionHandlers {
  render: () => void;
  setSelectedChart: (newChart: string) => Partial<ChartState>;
  setSelectedColumns: (selectedColumns: SelectedColumns) => Partial<ChartState>;
  updateChartStyle: (newStyle: Partial<ChartStyle>) => Partial<ChartState>;
  updateChartSpecificOptions: (
    newOptions: Partial<ChartSpecificOptions[keyof ChartSpecificOptions]>
  ) => Partial<ChartState>;
  setData: (newData: Array<Object>) => Partial<ChartState>;
  setAvailableColumns: (newColumns: Array<Column>) => Partial<ChartState>;
  autoSelectVariables: () => Partial<ChartState>;
  editChart: (
    userQuestion: string,
    chartEditUrl: string,
    callbacks?: {
      onError?: (error: Error) => void;
    }
  ) => Promise<void>;
}

/**
 * Handy, chainable methods to change chart state without doing chartState.update({...}) everytime.
 *
 * Always used with defaultChartState.
 *
 * @example
 * const [state, setState] = useState(defaultChartState);
 *
 * // update the state
 * state.setSelectedChart("line").render();
 *
 * // update state by chaining multiple actions and then calling .render()
 * state
 *  .setSelectedChart("line")
 *  .setSelectedColumns({ x: "date", y: "value" })
 *  .render();
 */
export function createActionHandlers(): ActionHandlers {
  const actionHandlers: ChartState = {
    render: function () {
      this.setStateCallback(this);
    },
    setSelectedChart: function (payload) {
      const newState = {
        ...this,
        selectedChart: payload,
        selectedColumns: {
          x: null,
          y: payload === "line" || payload === "bar" ? [] : null,
        },
        chartStyle: {
          ...defaultChartState.chartStyle,
          xLabel: null,
          yLabel: null,
        },
      };

      return newState;
    },
    setSelectedColumns: function (payload) {
      const newState = { ...this, selectedColumns: payload };

      return newState;
    },
    updateChartStyle: function (payload) {
      const newState = {
        ...this,
        chartStyle: { ...this.chartStyle, ...payload },
      };

      return newState;
    },
    updateChartSpecificOptions: function (payload) {
      const newState = {
        ...this,
        chartSpecificOptions: {
          ...this.chartSpecificOptions,
          [this.selectedChart]: {
            ...this.chartSpecificOptions[this.selectedChart],
            ...payload,
          },
        },
      };
      return newState;
    },
    setData: function (payload) {
      const newState = { ...this, data: payload };
      return newState;
    },
    setAvailableColumns: function (payload) {
      const newState = {
        ...this,
        availableColumns: payload,
      };

      return newState;
    },
    autoSelectVariables: function () {
      const { selectedChart, availableColumns } = this;

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

      const newState = {
        ...this,
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

      return newState;
    },
    editChart: async function (
      userQuestion: string,
      chartEditUrl: string,
      callbacks?: {
        onError?: (error: Error) => void;
      }
    ): Promise<void> {
      try {
        this.setStateCallback({ ...this, loading: true });

        const response = await fetch(chartEditUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_request: userQuestion,
            current_chart_state: this.clone(["data", "availableColumns"]),
            columns: this.availableColumns.map((col) => ({
              title: col.title,
              col_type: col.colType,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok || data.error || !data.success) {
          throw new Error(data.error || "Failed to edit chart");
        }

        const chartStateEdits = data["chart_state_edits"];

        this.mergeStateUpdates(chartStateEdits).render();
      } catch (error) {
        this.setStateCallback({ ...this, loading: false });
        callbacks?.onError?.(error as Error);
        throw error;
      }
    },
  };

  return actionHandlers;
}

function deepMergeObjects(
  obj1: { [key: string]: any },
  obj2: { [key: string]: any }
) {
  const merged = { ...obj1 };

  for (const key in obj2) {
    if (
      typeof obj2[key] === "object" &&
      !Array.isArray(obj2[key]) &&
      obj2[key] !== null
    ) {
      merged[key] = deepMergeObjects(obj1[key], obj2[key]);
    } else {
      merged[key] = obj2[key];
    }
  }

  return merged;
}

export const defaultChartState: ChartState = {
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
    selectedScheme: "Accent",
    yAxisUnitLabel: "",
  },
  chartSpecificOptions: {
    line: {
      lineColor: "#000000",
      lineWidth: 2,
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
  data: [],
  availableColumns: [],
  loading: false,
  mergeStateUpdates: function (stateUpdates) {
    // if state updates have selectedChart === "line"
    // or if the active chart is line or bar
    // make sure that selectedColumns.y is an Array
    let isLineOrBar;
    if (stateUpdates.selectedChart) {
      isLineOrBar =
        stateUpdates.selectedChart === "line" ||
        stateUpdates.selectedChart === "bar";
    } else {
      isLineOrBar =
        this.selectedChart === "line" || this.selectedChart === "bar";
    }

    if (isLineOrBar) {
      if (stateUpdates.selectedColumns && stateUpdates.selectedColumns.y) {
        if (!Array.isArray(stateUpdates.selectedColumns.y)) {
          stateUpdates.selectedColumns.y = [stateUpdates.selectedColumns.y];
        }
      }
    } else {
      // if this isn't a line, make sure y is NOT an array
      if (stateUpdates.selectedColumns && stateUpdates.selectedColumns.y) {
        if (
          Array.isArray(stateUpdates.selectedColumns.y) &&
          stateUpdates.selectedColumns.y.length > 0
        ) {
          stateUpdates.selectedColumns.y = stateUpdates.selectedColumns.y[0];
        }
      }
    }
    // because these state updates can have nested objects
    // for example: user question: "plot ratings onthe x axis"
    // if currently the selectedColumns are { x: "date", y: "value" }
    // then the state update will be { selectedColumns: { x: "ratings" } }
    // but if we directly do {...this, ...stateUpdates}, then the y value will be lost
    // hence we need to do a deep merge
    return deepMergeObjects(this, stateUpdates);
  },
  setStateCallback: () => {},
  ...createActionHandlers(),
  clone: function (skipKeys = []) {
    // return a copy of the state without any function properties, and without any keys in skipKeys
    const clone: { [key: string]: any } = {};
    for (const key in this) {
      if (typeof this[key] !== "function" && skipKeys.indexOf(key) === -1) {
        clone[key] = this[key];
      }
    }
    return clone;
  },
};

/**
 * Create a new chart state.
 */
export function createChartState(
  /**
   * Partial chart state.
   */
  partialState: Partial<ChartState> = {},
  /**
   * Callback function to set the state. chartState.xxx().yyy().render() will call this function with the latest chartState after applying the xxx and yyy methods.
   */
  setStateCallback: ChartState["setStateCallback"] = () => {}
): ChartState {
  // only set defined keys
  const newState = Object.assign({}, defaultChartState);

  for (const key in partialState) {
    if (partialState[key] !== undefined) {
      newState[key] = partialState[key];
    }
  }

  const actionHandlers = createActionHandlers();

  return {
    ...newState,
    ...actionHandlers,
    setStateCallback,
  };
}

// defining this so explicitly here only to allow vscode's intellisense to work
// we can also just do createContext()
// but defining this here lets jsdoc + intellisense play together nicely
export const ChartStateContext = createContext(createChartState());
