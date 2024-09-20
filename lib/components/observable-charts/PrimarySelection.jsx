import { useContext, useEffect, useState } from "react";
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

// Icons for different column types
const COLUMN_ICONS = {
  date: CalendarIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

export function PrimarySelection({
  columns,
  propSelectedChart,
  propSelectedColumns,
}) {
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
      (propSelectedChart || selectedChart) === "boxplot" &&
      chartSpecificOptions.boxplotOrientation === "vertical"
    ) {
      setAxisLabel({ x: "Vertical", y: "Horizontal" });
    } else {
      setAxisLabel({ x: "Horizontal", y: "Vertical" });
    }
  }, [propSelectedChart, selectedChart, chartSpecificOptions, chartState]);

  // Handle axis selection change
  const handleAxisChange = (axis) => (value) => {
    let newChartState = chartState.setSelectedColumns({
      ...selectedColumns,
      [axis]: value,
    });

    // Enable use count by default if the y selection is categorical in bar chart
    if ((propSelectedChart || selectedChart) === "bar" && axis === "y") {
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
  };

  // Handle axis label change
  const handleAxisLabelChange = (axis) => (e) => {
    chartState.updateChartStyle({ [`${axis}Label`]: e.target.value }).render();
  };

  // Render axis label input
  const renderAxisLabel = (axis) => (
    <div>
      <h3 className="mb-2 input-label">Label</h3>
      <TextInput
        placeholder={`Enter ${axis.toUpperCase()}-Axis Label`}
        value={chartStyle[`${axis}Label`]}
        onChange={handleAxisLabelChange(axis)}
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
        value={chartStyle.yLabel}
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
    if ((propSelectedChart || selectedChart) === "histogram" && axis === "y") {
      return null;
    }
    return (
      <div>
        <h3 className="mb-2 input-label">
          {label} axis{" "}
          {(propSelectedChart || selectedChart) === "histogram"
            ? "(numerical values only)"
            : ""}
        </h3>
        <Select
          style={{ width: "100%" }}
          placeholder={`Select ${label}-Axis`}
          onChange={handleAxisChange(axis)}
          value={(propSelectedColumns || selectedColumns)[axis]}
          allowClear={axis === "x"}
          mode={mode}
        >
          {(propSelectedChart || selectedChart) === "histogram"
            ? orderedColumns
                .filter((i) => i.numeric === true && i.key !== "index")
                .map(renderColumnOption)
            : orderedColumns.map(renderColumnOption)}
        </Select>
        {(propSelectedChart || selectedChart) === "bar" && axis === "y" && (
          <div className="mt-2">
            <span className="mr-2 input-label">Use frequency</span>

            <Switch
              checkedChildren="Count"
              unCheckedChildren="Value"
              checked={chartSpecificOptions.bar.useCount}
              onChange={(value) =>
                chartState
                  .updateChartSpecificOptions({ useCount: value })
                  .render()
              }
            />
          </div>
        )}
      </div>
    );
  };

  // Render facet selection dropdown
  const renderFacetSelection = () => (
    <div>
      <h3 className="mb-2 input-label">Facet by</h3>
      <Select
        style={{ width: "100%" }}
        placeholder="Select Facet Column"
        onChange={(value) => handleAxisChange("facet")(value)}
        value={(propSelectedColumns || selectedColumns).facet}
        allowClear
      >
        {orderedColumns
          .filter((col) => col.variableType === "categorical")
          .map(renderColumnOption)}
      </Select>
    </div>
  );

  const colorSchemeSelection = (value) => {
    if ((propSelectedChart || selectedChart) !== "line") {
      chartState
        .updateChartSpecificOptions({ fill: value })
        .setSelectedColumns({
          ...selectedColumns,
          fill: value,
        })
        .render();
    } else if ((propSelectedChart || selectedChart) === "line") {
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

  const renderColorBySelection = () => {
    return (
      <div>
        <h3 className="mb-2 input-label">Color By</h3>
        <Select
          placeholder="Color Column"
          value={(propSelectedColumns || selectedColumns).fill}
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
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full gap-4 pl-1">
      <div className="flex flex-col gap-4">
        {/* Chart Type Selection */}
        <div>
          <h3 className="mb-2 input-label">Chart Type</h3>
          <div className="flex flex-wrap gap-2">
            {CHART_TYPES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                onClick={() => handleChartChange(value)}
                className={`
                  p-2 rounded-sm min-w-20 border-[1px] flex items-center justify-center font-semibold transition-colors duration-200 text-[11px] font-sans ease-in-out
                  ${
                    (propSelectedChart || selectedChart) === value
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
        <div className="flex flex-col gap-2 pb-6 border-b border-black/20">
          {renderAxisSelection("x", axisLabel.x)}
          {renderAxisLabel("x")}
        </div>
        {/* Vertical Axis Selection */}
        {(propSelectedChart || selectedChart) !== "histogram" ? (
          <div className="flex flex-col gap-2">
            {renderAxisSelection(
              "y",
              axisLabel.y,
              (propSelectedChart || selectedChart) === "line"
                ? "multiple"
                : undefined
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
      <div className="grid grid-cols-2 gap-4">
        {renderFacetSelection()}
        {renderColorBySelection()}
      </div>
    </div>
  );
}

export default PrimarySelection;
