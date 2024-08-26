type ColumnType = {
  title: string;
  dataIndex: string;
  key: string;
  simpleTypeOf: string;
  numeric: boolean;
  variableType: string;
  colType: string;
  mean?: number;
  parseFormat?: string | null;
  dateType?: string;
  isDate?: boolean;
};

type ChartType =
  | "Line Chart"
  | "Scatter Plot"
  | "Bar Chart"
  | "Box Plot"
  | "Histogram";

type ChartSuggestion = {
  chartType: ChartType;
  xAxis: string;
  yAxis?: string;
};

function suggestCharts(columns: ColumnType[]): ChartSuggestion[] {
  const numericColumns = columns.filter((col) => col.numeric);
  const dateColumn = columns.find((col) => col.isDate);
  const suggestions: ChartSuggestion[] = [];

  // Helper function to add a suggestion if we haven't reached the limit
  const addSuggestion = (suggestion: ChartSuggestion) => {
    if (suggestions.length < 3) {
      suggestions.push(suggestion);
    }
  };

  // Suggest a line chart if we have a date column and at least one numeric column
  if (dateColumn && numericColumns.length > 0) {
    addSuggestion({
      chartType: "Line Chart",
      xAxis: dateColumn.title,
      yAxis: numericColumns[0].title,
      // description: `Track ${numericColumns[0].title} over time`,
    });
  }

  // Suggest a scatter plot if we have at least two numeric columns
  if (numericColumns.length >= 2) {
    addSuggestion({
      chartType: "Scatter Plot",
      xAxis: numericColumns[0].title,
      yAxis: numericColumns[1].title,
    });
  }

  // Suggest a bar chart for a numeric column
  if (numericColumns.length > 0) {
    addSuggestion({
      chartType: "Bar Chart",
      xAxis: numericColumns[0].title,
    });
  }

  // Suggest a box plot for a numeric column
  if (numericColumns.length > 0) {
    addSuggestion({
      chartType: "Box Plot",
      xAxis: numericColumns[0].title,
    });
  }

  // Suggest a histogram for a numeric column
  if (numericColumns.length > 0) {
    addSuggestion({
      chartType: "Histogram",
      xAxis: numericColumns[0].title,
    });
  }

  return suggestions;
}

export default suggestCharts;
