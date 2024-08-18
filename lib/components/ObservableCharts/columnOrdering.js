// Define the best variables for each chart type
const chartTypePreferences = {
  line: ["date", "quantitative", "categorical"],
  bar: ["categorical", "quantitative", "date"],
  scatter: ["quantitative", "date", "categorical"],
  histogram: ["quantitative", "date", "categorical"],
};

// Helper function to get the column type
const getColumnType = (column) => {
  if (column.isDate) {
    return "date";
  }
  return column.variableType;
};

// Helper function to get the preference score for a column
const getPreferenceScore = (column, chartType) => {
  const preferences = chartTypePreferences[chartType];
  const columnType = getColumnType(column);
  const index = preferences.indexOf(columnType);
  return index === -1 ? preferences.length : index;
};

// Main reordering function
export const reorderColumns = (columns, chartType) => {
  return [...columns].sort((a, b) => {
    const scoreA = getPreferenceScore(a, chartType);
    const scoreB = getPreferenceScore(b, chartType);
    return scoreA - scoreB;
  });
};
