import { useEffect, useState } from "react";
import { useChartContainer } from "./dashboardState";
import { Select, Radio } from "antd";
import {
  CalendarIcon,
  HashIcon,
  CaseSensitive,
} from "lucide-react";
import { reorderColumns } from "./columnOrdering.js";
import { ChartLine, ChartColumnBig, ChartScatter } from "lucide-react";
import { Input as TextInput, Button } from "@ui-components";
import UnitPositionToggle from "./components/UnitPositionToggle";
const { Option } = Select;

const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnBig },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
];

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

  useEffect(() => {
    setAvailableColumns(columns);
    setOrderedColumns(reorderColumns(columns, selectedChart));
  }, [columns, selectedChart, setAvailableColumns]);

  const handleChartChange = (value) => {
    setSelectedChart(value);
    autoSelectVariables();
  };

  const handleAxisChange = (axis) => (value) => {
    setSelectedColumns({
      ...selectedColumns,
      [axis]: axis === "y" && selectedChart !== "line" ? [value] : value,
    });
  };

  const handleAxisLabelChange = (axis) => (e) => {
    updateChartStyle({ [`${axis}Label`]: e.target.value });
  };

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

  const verticalAxisUnit = () => (
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
        {orderedColumns.map(renderColumnOption)}
      </Select>
    </div>
  );

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full gap-4 pl-1 pr-4">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="mb-2 input-label">Chart Type</h3>
          <div className="flex gap-2">
            {CHART_TYPES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                onClick={() => handleChartChange(value)}
                className={`
                  p-2 rounded-sm w-20 border-[1px]  flex items-center justify-center font-semibold transition-colors duration-200 ease-in-out
                  ${
                    selectedChart === value
                      ? "bg-blue-500 border-blue-600 text-white shadow-md"
                      : "bg-blue-100 text-blue-600/50 border-blue-200  hover:bg-blue-300"
                  }
                `}
              >
                {Icon && <Icon size={16} className="mr-2 " />}
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 pb-6 border-b border-black/20">
          {renderAxisSelection("x", "Horizontal")}
          {renderAxisLabel("x")}
        </div>
        <div className="flex flex-col gap-2 ">
          {renderAxisSelection(
            "y",
            "Vertical",
            selectedChart === "line" ? "multiple" : undefined
          )}
          <div className="flex items-center gap-4">
            {renderAxisLabel("y")}
            {verticalAxisUnit()}
          </div>
        </div>
      </div>
      {/* Facet by column */}
      <div>{renderFacetSelection()}</div>
    </div>
  );
}
