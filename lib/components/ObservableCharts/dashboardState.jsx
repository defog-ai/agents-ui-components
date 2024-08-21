import { createContext, useContext, useReducer } from "react";

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
 * @property {boolean} useCount - Whether to use count instead of values
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
 * @typedef {Object} DotplotOptions
 * @property {string} pointColor - Color of the points
 * @property {number} pointSize - Size of the points
 */

/**
 * @typedef {Object} ChartSpecificOptions
 * @property {LineChartOptions} line - Options for line charts
 * @property {BarChartOptions} bar - Options for bar charts
 * @property {ScatterChartOptions} scatter - Options for scatter plots
 * @property {HistogramOptions} histogram - Options for histograms
 * @property {BoxplotOptions} boxplot - Options for boxplots
 * @property {DotplotOptions} dotplot - Options for dotplots
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
 * @typedef {Object} DashboardState
 * @property {string} selectedChart - Currently selected chart type
 * @property {SelectedColumns} selectedColumns - Selected columns for the chart
 * @property {ChartStyle} chartStyle - Style options for the chart
 * @property {ChartSpecificOptions} chartSpecificOptions - Options specific to each chart type
 * @property {Array<Object>} data - Data for the chart
 * @property {Array<Column>} availableColumns - Available columns in the dataset
 */

/** @type {DashboardState} */
const initialState = {
  selectedChart: "line",
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
    xLabel: "",
    yLabel: "",
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
      groupBy: "",
      stroke: "",
      lineOptions: [],
      showLabels: false,
    },
    bar: { barColor: "#4287f5", barWidth: 0.8, useCount: false, fill: null },
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
    dotplot: {
      pointColor: "#f54242",
      pointSize: 5,
    },
  },
  data: [],
  availableColumns: [],
};

/**
 * @typedef {Object} ActionHandlers
 * @property {function(DashboardState, string): DashboardState} setSelectedChart
 * @property {function(DashboardState, SelectedColumns): DashboardState} setSelectedColumns
 * @property {function(DashboardState, Partial<ChartStyle>): DashboardState} updateChartStyle
 * @property {function(DashboardState, Partial<ChartSpecificOptions[keyof ChartSpecificOptions]>): DashboardState} updateChartSpecificOptions
 * @property {function(DashboardState, Array<Object>): DashboardState} setData
 * @property {function(DashboardState, Array<Column>): DashboardState} setAvailableColumns
 * @property {function(DashboardState): DashboardState} autoSelectVariables
 */

/** @type {ActionHandlers} */
const actionHandlers = {
  setSelectedChart: (state, payload) => ({
    ...state,
    selectedChart: payload,
    selectedColumns: { x: null, y: payload === "line" ? [] : null },
    chartStyle: {
      ...state.chartStyle,
      xLabel: null,
      yLabel: null,
    },
  }),
  setSelectedColumns: (state, payload) => ({
    ...state,
    selectedColumns: payload,
  }),
  updateChartStyle: (state, payload) => ({
    ...state,
    chartStyle: { ...state.chartStyle, ...payload },
  }),
  updateChartSpecificOptions: (state, payload) => ({
    ...state,
    chartSpecificOptions: {
      ...state.chartSpecificOptions,
      [state.selectedChart]: {
        ...state.chartSpecificOptions[state.selectedChart],
        ...payload,
      },
    },
  }),
  setData: (state, payload) => ({ ...state, data: payload }),
  setAvailableColumns: (state, payload) => ({
    ...state,
    availableColumns: payload,
  }),
  autoSelectVariables: (state) => {
    const { selectedChart, availableColumns } = state;

    const dateColumn = availableColumns.find((col) => col.isDate);
    const quantColumns = availableColumns.filter(
      (col) => col.variableType === "quantitative"
    );

    let xAxis =
      dateColumn?.key ||
      quantColumns[0]?.key ||
      availableColumns[0]?.key ||
      null;

    let yAxis = null;
    if (selectedChart === "line") {
      yAxis = quantColumns
        .filter((col) => col.key !== xAxis)
        .slice(0, 1)
        .map((col) => col.key);
    } else {
      yAxis =
        quantColumns.find((col) => col.key !== xAxis)?.key ||
        availableColumns.find((col) => col.key !== xAxis)?.key ||
        null;
    }

    return {
      ...state,
      selectedColumns: { x: xAxis, y: yAxis },
    };
  },
};

/**
 * @typedef {Object} Action
 * @property {keyof ActionHandlers} type
 * @property {*} payload
 */

/**
 * @param {DashboardState} state
 * @param {Action} action
 * @returns {DashboardState}
 */
const dashboardReducer = (state, action) =>
  actionHandlers[action.type]?.(state, action.payload) ?? state;

const DashboardContext = createContext();

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
};

/**
 * @returns {{ state: DashboardState, dispatch: React.Dispatch<Action> }}
 */
export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }
  return context;
};

/**
 * @typedef {Object} DashboardActions
 * @property {(payload: string) => Action} setSelectedChart
 * @property {(payload: SelectedColumns) => Action} setSelectedColumns
 * @property {(payload: Partial<ChartStyle>) => Action} updateChartStyle
 * @property {(payload: Partial<ChartSpecificOptions[keyof ChartSpecificOptions]>) => Action} updateChartSpecificOptions
 * @property {(payload: Array<Object>) => Action} setData
 * @property {(payload: Array<Column>) => Action} setAvailableColumns
 * @property {() => Action} autoSelectVariables
 */

/** @type {DashboardActions} */
export const dashboardActions = Object.fromEntries(
  Object.keys(actionHandlers).map((type) => [
    type,
    (payload) => ({ type, payload }),
  ])
);

/**
 * @typedef {DashboardState & DashboardActions} ChartContainerHook
 */

/**
 * @returns {ChartContainerHook}
 */
export const useChartContainer = () => {
  const { state, dispatch } = useDashboardContext();
  const actionDispatchers = Object.fromEntries(
    Object.entries(dashboardActions).map(([key, action]) => [
      key,
      (payload) => dispatch(action(payload)),
    ])
  );
  return { ...state, ...actionDispatchers };
};

export default DashboardProvider;
