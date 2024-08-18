import React, { useEffect, useState } from "react";
import { useChartContainer } from "./dashboardState";
import { Select } from "antd";
import {
  CalendarIcon,
  HashIcon,
  CaseSensitive,
  ChartLine,
  ChartColumnBig,
  ChartScatter,
} from "lucide-react";
import { reorderColumns } from "./columnOrdering.js";
import { Input as TextInput, Button } from "@ui-components";
import UnitPositionToggle from "./components/UnitPositionToggle";

const { Option } = Select;

// Chart type options with icons
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnBig },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
];

// Icons for different column types
const COLUMN_ICONS = {
  date: CalendarIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

export function PrimarySelection({ columns }) {
  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    setSelectedChart,
    setSelectedColumns,
    setAvailableColumns,
    autoSelectVariables,
    updateChartStyle,
  } = useChartContainer();

  const [orderedColumns, setOrderedColumns] = useState(columns);

  // Reorder columns when chart type or available columns change
  useEffect(() => {
    setAvailableColumns(columns);
    setOrderedColumns(reorderColumns(columns, selectedChart));
  }, [columns, selectedChart, setAvailableColumns]);

  // Handle chart type change
  const handleChartChange = (value) => {
    setSelectedChart(value);
    autoSelectVariables();
  };

  // Handle axis selection change
  const handleAxisChange = (axis) => (value) => {
    setSelectedColumns({
      ...selectedColumns,
      [axis]: axis === "y" && selectedChart !== "line" ? [value] : value,
    });
  };

  // Handle axis label change
  const handleAxisLabelChange = (axis) => (e) => {
    updateChartStyle({ [`${axis}Label`]: e.target.value });
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
  const renderAxisSelection = (axis, label, mode) => (
    <div>
      <h3 className="mb-2 input-label">{label} axis</h3>
      <Select
        style={{ width: "100%" }}
        placeholder={`Select ${label}-Axis`}
        onChange={handleAxisChange(axis)}
        value={selectedColumns[axis]}
        allowClear={axis === "x"}
        mode={mode}
      >
        {orderedColumns.map(renderColumnOption)}
      </Select>
    </div>
  );

  // Render vertical axis unit input
  const renderVerticalAxisUnit = () => (
    <div>
      <h3 className="mb-2 input-label">Unit Label</h3>
      <UnitPositionToggle
        position={chartStyle.yAxisUnitPosition || "suffix"}
        onChange={(newPosition) =>
          updateChartStyle({ yAxisUnitPosition: newPosition })
        }
        value={chartStyle.yAxisUnitLabel}
        onValueChange={(newValue) =>
          updateChartStyle({ yAxisUnitLabel: newValue })
        }
      />
    </div>
  );

  // Render facet selection dropdown
  const renderFacetSelection = () => (
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

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full gap-4 pl-1">
      <div className="flex flex-col gap-4">
        {/* Chart Type Selection */}
        <div>
          <h3 className="mb-2 input-label">Chart Type</h3>
          <div className="flex gap-2">
            {CHART_TYPES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                onClick={() => handleChartChange(value)}
                className={`
                  p-2 rounded-sm w-20 border-[1px] flex items-center justify-center font-semibold transition-colors duration-200 ease-in-out
                  ${
                    selectedChart === value
                      ? "bg-blue-500 border-blue-600 text-white shadow-md"
                      : "bg-blue-100 text-blue-600/50 border-blue-200 hover:bg-blue-300"
                  }
                `}
              >
                {Icon && <Icon size={16} className="mr-2" />}
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
        {/* Horizontal Axis Selection */}
        <div className="flex flex-col gap-2 pb-6 border-b border-black/20">
          {renderAxisSelection("x", "Horizontal")}
          {renderAxisLabel("x")}
        </div>
        {/* Vertical Axis Selection */}
        <div className="flex flex-col gap-2">
          {renderAxisSelection(
            "y",
            "Vertical",
            selectedChart === "line" ? "multiple" : undefined
          )}
          <div className="flex items-center gap-4">
            {renderAxisLabel("y")}
            {renderVerticalAxisUnit()}
          </div>
        </div>
      </div>
      {/* Facet Selection */}
      <div>{renderFacetSelection()}</div>
    </div>
  );
}

export default PrimarySelection;
