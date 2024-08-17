import { createContext, useContext, useReducer } from "react";

const initialState = {
  selectedChart: "line",
  selectedColumns: { x: null, y: [], facet: null },
  chartStyle: {
    title: "",
    fontSize: 12,
    backgroundColor: "#ffffff",
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    xLabel: "",
    yLabel: "",
    yAxisUnitLabel: "",
  },
  chartSpecificOptions: {
    line: {
      lineColor: "#000000",
      lineWidth: 2,
      curve: "linear",
      marker: false,
      colorScheme: "category10",
      groupBy: "",
      stroke: "",
      lineOptions: [],
      showLabels: false,
    },
    bar: { barColor: "#4287f5", barWidth: 0.8 },
    scatter: { pointColor: "#f54242", pointSize: 5 },
  },
  data: [],
  availableColumns: [],
};

const actionHandlers = {
  setSelectedChart: (state, payload) => ({
    ...state,
    selectedChart: payload,
    selectedColumns: { x: null, y: payload === "line" ? [] : null },
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
    let xAxis = null;
    if (dateColumn) {
      xAxis = dateColumn.key;
    } else if (quantColumns.length > 0) {
      xAxis = quantColumns[0].key;
    } else if (availableColumns.length > 0) {
      xAxis = availableColumns[0].key;
    }

    // Select y-axis variable(s)
    let yAxis = null;
    if (selectedChart === "line") {
      // For line charts, select up to two quantitative columns
      yAxis = quantColumns.slice(0, 1).map((col) => col.key);
      // but not the same as the x-axis
      if (xAxis && yAxis.includes(xAxis)) {
        yAxis = quantColumns.slice(1, 2).map((col) => col.key);
      }
    } else {
      // For other charts, select a single column
      if (quantColumns.length > 0) {
        yAxis = quantColumns[0].key;
        // but not the same as the x-axis
        if (xAxis === yAxis) {
          yAxis = quantColumns.length > 1 ? quantColumns[1].key : null;
        }
      } else if (availableColumns.length > 1) {
        yAxis =
          availableColumns[0].key === xAxis
            ? availableColumns[1].key
            : availableColumns[0].key;
      }
    }

    return {
      ...state,
      selectedColumns: { x: xAxis, y: yAxis },
    };
  },
};

const dashboardReducer = (state, action) =>
  actionHandlers[action.type]?.(state, action.payload) ?? state;

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }
  return context;
};

export const dashboardActions = Object.fromEntries(
  Object.keys(actionHandlers).map((type) => [
    type,
    (payload) => ({ type, payload }),
  ])
);

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
