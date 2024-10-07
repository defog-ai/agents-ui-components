import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Select, Switch } from "antd";
import {
  CalendarIcon,
  HashIcon,
  CaseSensitive,
  ChartLine,
  ChartScatter,
  ChartColumnIncreasing,
  ChartCandlestick,
  ChartNoAxesColumn,
} from "lucide-react";
import { reorderColumns } from "./columnOrdering.js";
import { Input as TextInput, Button } from "@ui-components";
import { ChartStateContext } from "./ChartStateContext.jsx";

const { Option } = Select;

// Chart type options with icons
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnIncreasing },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
  { value: "histogram", label: "Histogram", Icon: ChartNoAxesColumn },
  { value: "boxplot", label: "Box Plot", Icon: ChartCandlestick },
];

const AGGREGATE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "proportion", label: "Proportion" },
  { value: "median", label: "Median" },
  { value: "mean", label: "Mean" },
  { value: "variance", label: "Variance" },
];

// Icons for different column types
const COLUMN_ICONS = {
  date: CalendarIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

export function PrimarySelection({ columns }) {
  const chartState = useContext(ChartStateContext);

  const { selectedChart, selectedColumns, chartStyle, chartSpecificOptions } =
    chartState;

  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [axisLabel, setAxisLabel] = useState({
    x: "Horizontal",
    y: "Vertical",
  });

  // Reorder columns when chart type or available columns change
  useEffect(() => {
    chartState.setAvailableColumns(columns).render();

    setOrderedColumns(reorderColumns(columns, selectedChart));
  }, [columns, selectedChart]);

  // Handle chart type change
  const handleChartChange = (value) => {
    chartState
      .setSelectedChart(value)
      .updateChartStyle({ xLabel: null, yLabel: null })
      .autoSelectVariables()
      .render();
  };

  // if we have a vertically oriented boxplot, we need to switch the x and y axis labels
  useEffect(() => {
    if (
      selectedChart === "boxplot" &&
      chartSpecificOptions.boxplotOrientation === "vertical"
    ) {
      setAxisLabel({ x: "Vertical", y: "Horizontal" });
    } else {
      setAxisLabel({ x: "Horizontal", y: "Vertical" });
    }
  }, [selectedChart, chartSpecificOptions, chartState]);

  // Handle axis selection change
  const handleAxisChange = useCallback(
    (axis) => (value) => {
      let newChartState = chartState.setSelectedColumns({
        ...selectedColumns,
        [axis]: value,
      });

      // Enable use count by default if the y selection is categorical in bar chart
      if (selectedChart === "bar" && axis === "y") {
        const selectedColumn = columns.find((col) => col.key === value);
        if (selectedColumn && selectedColumn.variableType === "categorical") {
          newChartState = newChartState.updateChartSpecificOptions({
            useCount: true,
          });
        } else {
          newChartState = newChartState.updateChartSpecificOptions({
            useCount: false,
          });
        }
      }

      newChartState.render();
    },
    [chartState, selectedColumns, selectedChart, columns]
  );

  const handleAggregateChange = (value) => {
    chartState
      .updateChartSpecificOptions({ aggregateFunction: value || "sum" })
      .render();
  };

  // Render aggregate function selection
  const renderAggregateSelection = () => (
    <div className="mt-2">
      <span className="mr-2 input-label">Transform</span>
      <Select
        style={{ width: "100%" }}
        value={chartSpecificOptions.bar.aggregateFunction || "sum"}
        onChange={handleAggregateChange}
      >
        {AGGREGATE_OPTIONS.map(({ value, label }) => (
          <Option key={value} value={value}>
            {label}
          </Option>
        ))}
      </Select>
    </div>
  );

  // Handle axis label change
  const handleAxisLabelChange = (axis) => (e) => {
    chartState
      .updateChartStyle({
        [`${axis}Label`]: e.target.value,
      })
      .render();
  };
  // Render axis label input
  const renderAxisLabel = (axis) => (
    <div>
      <h3 className="mb-2 input-label">Label</h3>
      <TextInput
        placeholder={`Enter ${axis.toUpperCase()}-Axis Label`}
        value={chartStyle[`${axis}Label`]}
        onChange={handleAxisLabelChange(axis)}
        defaultValue={selectedColumns[axis]}
      />
    </div>
  );

  // For histogram, only allow one column for x-axis
  const renderHistogramYAxisLabel = () => (
    <div>
      <h3 className="mb-2 input-label">Horizontal Label</h3>
      <TextInput
        placeholder="Enter Horizontal Label"
        defaultValue="Frequency"
        value={chartStyle.yLabel || "Frequency"}
        onChange={(e) =>
          chartState.updateChartStyle({ yLabel: e.target.value }).render()
        }
      />
    </div>
  );

  // Render column option for Select
  const renderColumnOption = ({ key, title, isDate, variableType }) => {
    const IconComponent = COLUMN_ICONS[isDate ? "date" : variableType];
    return (
      <Option key={key} value={key}>
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="opacity-50" size={14} />}
          <span>{title}</span>
        </div>
      </Option>
    );
  };

  // Render axis selection dropdown
  const renderAxisSelection = (axis, label, mode) => {
    if (selectedChart === "histogram" && axis === "y") {
      return null;
    }

    const selectedColumnKey = selectedColumns[axis];
    const selectedColumn = columns.find((col) => col.key === selectedColumnKey);
    const isCategorical =
      selectedColumn && selectedColumn.variableType === "categorical";

    return (
      <div>
        <h3 className="mb-2 input-label">
          Variable {selectedChart === "histogram" ? "" : ""}
        </h3>
        <Select
          style={{ width: "100%" }}
          placeholder={`Select ${label}-Axis`}
          onChange={handleAxisChange(axis)}
          value={selectedColumnKey}
          allowClear={axis === "x"}
          mode={mode}
        >
          {selectedChart === "histogram"
            ? orderedColumns
                .filter((i) => i.numeric === true && i.key !== "index")
                .map(renderColumnOption)
            : orderedColumns.map(renderColumnOption)}
        </Select>
        {(selectedChart === "bar" || selectedChart === "line") &&
          axis === "x" &&
          isCategorical &&
          renderAggregateSelection()}
      </div>
    );
  };

  // Render facet selection dropdown
  const FacetSelection = useMemo(() => {
    return (
      <div>
        <h3 className="mb-2 input-label">Facet by</h3>
        <Select
          style={{ width: "100%" }}
          placeholder="Select Facet Column"
          onChange={(value) => handleAxisChange("facet")(value)}
          value={selectedColumns.facet}
          allowClear
        >
          {orderedColumns
            .filter((col) => col.variableType === "categorical")
            .map(renderColumnOption)}
        </Select>
      </div>
    );
  }, [selectedColumns, orderedColumns, handleAxisChange]);

  const ColorBySelection = useMemo(() => {
    const colorSchemeSelection = (value) => {
      if (selectedChart !== "line") {
        chartState
          .updateChartSpecificOptions({ fill: value })
          .setSelectedColumns({
            ...selectedColumns,
            fill: value,
          })
          .render();
      } else if (selectedChart === "line") {
        chartState
          .updateChartSpecificOptions({ stroke: value })
          .setSelectedColumns({
            ...selectedColumns,
            stroke: value,
          })
          .render();
      } else {
        chartState
          .updateChartSpecificOptions({ fill: value })
          .setSelectedColumns({
            ...selectedColumns,
            fill: value,
          })
          .render();
      }
    };

    return (
      <div>
        <h3 className="mb-2 input-label">Color By</h3>
        <Select
          placeholder="Color Column"
          value={selectedColumns.fill}
          style={{ width: "100%" }}
          onChange={(value) => {
            colorSchemeSelection(value);
          }}
          allowClear
        >
          {orderedColumns
            .filter((col) => col.variableType === "categorical")
            .map(renderColumnOption)}
        </Select>
      </div>
    );
  }, [chartState, selectedColumns, orderedColumns, selectedChart]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full gap-4 pl-1">
      <div className="flex flex-col gap-4">
        {/* Chart Type Selection */}
        <div>
          <h3 className="mb-2 font-bold input-label">Chart Type</h3>
          <div className="flex flex-wrap gap-2">
            {CHART_TYPES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                onClick={() => handleChartChange(value)}
                className={`
                  p-2 rounded-sm min-w-20 border-[1px] flex items-center justify-center font-semibold transition-colors duration-200 text-[11px] font-sans ease-in-out
                  ${
                    selectedChart === value
                      ? "bg-blue-500 border-blue-600 text-white"
                      : "bg-blue-100 text-blue-600/50 border-blue-200 hover:bg-blue-300"
                  }
                `}
              >
                <Icon size={16} className="mr-2" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
        {/* Horizontal Axis Selection */}
        <h3 className="pb-1 font-bold border-b input-label border-black/20">
          Horizontal Axis
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {renderAxisSelection("x", axisLabel.x)}
          {renderAxisLabel("x")}
        </div>
        {/* Vertical Axis Selection */}
        <h3 className="pb-1 font-bold border-b input-label border-black/20">
          Vertical Axis
        </h3>
        {selectedChart !== "histogram" ? (
          <div className="grid grid-cols-2 gap-2">
            {renderAxisSelection(
              "y",
              axisLabel.y,
              (selectedChart === "line" || selectedChart == "bar") ? "multiple" : undefined
            )}
            <div className="flex items-center gap-4">
              {renderAxisLabel("y")}
              {/* {renderVerticalAxisUnit()} */}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {renderHistogramYAxisLabel()}
          </div>
        )}
      </div>
      {/* Facet Selection and color */}

      {selectedChart !== "bar" ? 
        <div>
          <h3 className="pb-1 font-bold border-b input-label border-black/20">
            Groups
          </h3>

          <div className="grid grid-cols-2 gap-2 pt-4 ">
            {FacetSelection}
            {ColorBySelection}
          </div>
        </div>
      : null}
    </div>
  );
}

export default PrimarySelection;
