// this context is specific for each chart
// hence not used in the Setup.jsx file once
// but used inside ChartContainer.jsx and added to each chart separately

import { createContext } from "react";

/**
 *
 * @typedef {Object} ActionHandlers
 * @property {function(): ChartState} render
 * @property {function(string): ChartState} setSelectedChart
 * @property {function(SelectedColumns): ChartState} setSelectedColumns
 * @property {function(Partial<ChartStyle>): ChartState} updateChartStyle
 * @property {function(Partial<ChartSpecificOptions[keyof ChartSpecificOptions]>): ChartState} updateChartSpecificOptions
 * @property {function(Array<Object>): ChartState} setData
 * @property {function(Array<Column>): ChartState} setAvailableColumns
 * @property {function(): ChartState} autoSelectVariables
 */

/**
 * Handy, chainable methods to change chart state without doing chartState.update({...}) everytime.
 *
 * Always used with defaultChartState.
 *
 * @returns {ActionHandlers} - Action handlers.
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
export function createActionHandlers() {
  const actionHandlers = {
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
            selectedChart === "line" || selectedChart == "bar"
              ? [yAxis]
              : yAxis,
        },
      };

      return newState;
    },
  };

  return actionHandlers;
}

function deepMergeObjects(obj1, obj2) {
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

/**
 * @typedef {Object} ChartStyle
 * @property {string} title - The chart title
 * @property {number} fontSize - Font size for chart elements
 * @property {string} backgroundColor - Background color of the chart
 * @property {string} xLabel - Label for the x-axis
 * @property {string} yLabel - Label for the y-axis
 * @property {boolean} xGrid - Whether to show x-axis grid lines
 * @property {boolean} yGrid - Whether to show y-axis grid lines
 * @property {number} xTicks - Number of ticks on the x-axis
 * @property {string} dateFormat - Format for date values
 * @property {number} yTicks - Number of ticks on the y-axis
 * @property {string} scheme - Color scheme for the chart
 * @property {string} yAxisUnitLabel - Unit label for the y-axis
 */

/**
 * @typedef {Object} LineChartOptions
 * @property {string} lineColor - Color of the line
 * @property {number} lineWidth - Width of the line
 * @property {string} curve - Type of curve for the line
 * @property {boolean} marker - Whether to show markers on data points
 * @property {string} scheme - Color scheme for multiple lines
 * @property {string} groupBy - Column to group data by
 * @property {string} stroke - Column to determine line color
 * @property {Array<string>} lineOptions - Options for line styling
 * @property {boolean} showLabels - Whether to show labels on the chart
 */

/**
 * @typedef {Object} BarChartOptions
 * @property {string} barColor - Color of the bars
 * @property {number} barWidth - Width of the bars
 * @property {('sum'|'proportion'|'count'|'median'|'mean'|'variance')} aggregateFunction - Function to aggregate the data
 * @property {string|null} fill - Column to determine bar color
 */

/**
 * @typedef {Object} ScatterChartOptions
 * @property {string} pointColor - Color of the points
 * @property {number} pointSize - Size of the points
 */

/**
 * @typedef {Object} HistogramOptions
 * @property {number} binCount - Number of bins in the histogram
 * @property {string} fillColor - Fill color of the bars
 * @property {string|number[]} thresholds - Thresholds for binning
 * @property {boolean} normalize - Whether to normalize the histogram
 * @property {boolean} cumulative - Whether to show cumulative distribution
 */

/**
 * @typedef {Object} BoxplotOptions
 * @property {string} fill - Fill color of the box
 * @property {string} stroke - Stroke color of the box
 * @property {number} strokeWidth - Width of the stroke
 * @property {number} opacity - Opacity of the box
 * @property {string} boxplotOrientation - Orientation of the boxplot
 */

/**
 * @typedef {Object} ChartSpecificOptions
 * @property {LineChartOptions} line - Options for line charts
 * @property {BarChartOptions} bar - Options for bar charts
 * @property {ScatterChartOptions} scatter - Options for scatter plots
 * @property {HistogramOptions} histogram - Options for histograms
 * @property {BoxplotOptions} boxplot - Options for boxplots
 */

/**
 * @typedef {Object} SelectedColumns
 * @property {string|null} x - Selected column for x-axis
 * @property {string|string[]|null} y - Selected column(s) for y-axis
 * @property {string|null} facet - Selected column for faceting
 * @property {string|null} fill - Selected column for fill color
 * @property {string|null} stroke - Selected column for stroke color
 */

/**
 * @typedef {Object} Column
 * @property {string} key - Column key
 * @property {string} variableType - Type of the variable (e.g., 'quantitative', 'categorical')
 * @property {boolean} isDate - Whether the column contains date values
 */

/**
 * @typedef {Object} ChartConfig
 * @property {string} selectedChart - Currently selected chart type
 * @property {SelectedColumns} selectedColumns - Selected columns for the chart
 * @property {ChartStyle} chartStyle - Style options for the chart
 * @property {ChartSpecificOptions} chartSpecificOptions - Options specific to each chart type
 * @property {Array<Object>} data - Data for the chart
 * @property {Array<Column>} availableColumns - Available columns in the dataset
 * @property {function(Object): ChartState} mergeStateUpdates - Deep merge state updates into current state, and return the merged state.
 * @property {function(ChartState): void} setStateCallback - Callback function to set the state
 * @property {(skipKeys: string[]) => Object} clone - Clone the current state. Returns the state without any function properties and `skipKeys` if passed.
 */

/**
 * @typedef {ChartConfig & ActionHandlers} ChartState
 */
export const defaultChartState = {
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
    dateFormat: "%b %d, %Y",
    yTicks: 10,
    scheme: "accent",
    yAxisUnitLabel: "",
  },
  chartSpecificOptions: {
    line: {
      lineColor: "#000000",
      lineWidth: 2,
      curve: "linear",
      marker: false,
      scheme: "category10",
      filter: null,
      groupBy: "",
      stroke: "",
      lineOptions: [],
      showLabels: false,
      aggregateFunction: "sum",
    },
    bar: {
      barColor: "#4287f5",
      barWidth: 0.8,
      aggregateFunction: "sum",
      fill: null,
    },
    scatter: { pointColor: "#f54242", pointSize: 5 },
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
  mergeStateUpdates: function (stateUpdates) {
    // if state updates have selectedChart === "line"
    // or if the active chart is line or bar
    // make sure that selectedColumns.y is an Array
    const isLineOrBar =
      stateUpdates.selectedChart === "line" ||
      stateUpdates.selectedChart === "bar" ||
      this.selectedChart === "line" ||
      this.selectedChart === "bar";

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
    const clone = {};
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
 * @param {object} partialState - Partial chart state.
 * @param {function} setStateCallback - Callback function to set the state. chartState.xxx().yyy().render() will call this function with the latest chartState after applying the xxx and yyy methods.
 * @returns {ChartState} - Chart State.
 */
export function createChartState(
  partialState = {},
  setStateCallback = () => {}
) {
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
