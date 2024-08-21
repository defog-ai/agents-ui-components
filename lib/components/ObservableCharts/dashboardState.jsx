import { legend } from "@observablehq/plot";
import { createContext, useContext, useReducer } from "react";

// Initial state for the dashboard
const initialState = {
  selectedChart: "line",
  selectedColumns: { x: null, y: null, facet: null, fill: null, stroke: null },
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
  },
  data: [],
  availableColumns: [],
};

// Action handlers for state updates
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

    // Find the first date column and quantitative columns
    const dateColumn = availableColumns.find((col) => col.isDate);
    const quantColumns = availableColumns.filter(
      (col) => col.variableType === "quantitative"
    );

    // Select x-axis variable
    let xAxis =
      dateColumn?.key ||
      quantColumns[0]?.key ||
      availableColumns[0]?.key ||
      null;

    // Select y-axis variable(s)
    let yAxis = null;
    if (selectedChart === "line") {
      // For line charts, select up to two quantitative columns
      yAxis = quantColumns
        .filter((col) => col.key !== xAxis)
        .slice(0, 1)
        .map((col) => col.key);
    } else {
      // For other charts, select a single column
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

// Reducer function to handle state updates
const dashboardReducer = (state, action) =>
  actionHandlers[action.type]?.(state, action.payload) ?? state;

// Create context for the dashboard state
const DashboardContext = createContext();

// Provider component to wrap the app and provide state
export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use the dashboard context
export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }
  return context;
};

// Create action creators for each action type
export const dashboardActions = Object.fromEntries(
  Object.keys(actionHandlers).map((type) => [
    type,
    (payload) => ({ type, payload }),
  ])
);

// Custom hook to access state and dispatch actions
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
