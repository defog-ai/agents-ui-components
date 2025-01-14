import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Select } from "antd";
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
import { ChartManagerContext } from "./ChartManagerContext";
import { AgentConfigContext } from "../context/AgentContext";

const { Option } = Select;

// Chart type options with icons
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnIncreasing },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
  // { value: "histogram", label: "Histogram", Icon: ChartNoAxesColumn },
  // { value: "boxplot", label: "Box Plot", Icon: ChartCandlestick },
];

const AGGREGATE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Mean" },
];

// Icons for different column types
const COLUMN_ICONS = {
  date: CalendarIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

export function PrimarySelection({ columns }) {
  const chartManager = useContext(ChartManagerContext);

  const { selectedChart, selectedColumns, chartStyle, chartSpecificOptions } =
    chartManager.config;

  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [axisLabel, setAxisLabel] = useState({
    x: "Horizontal",
    y: "Vertical",
  });

  const agentConfigContext = useContext(AgentConfigContext);
  const { hiddenCharts } = agentConfigContext.val;

  // Reorder columns when chart type or available columns change
  useEffect(() => {
    chartManager.setAvailableColumns(columns).render();

    setOrderedColumns(reorderColumns(columns, selectedChart));
  }, [columns, selectedChart]);

  // Handle chart type change
  const handleChartChange = (value) => {
    chartManager
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
  }, [selectedChart, chartSpecificOptions, chartManager]);

  // Handle axis selection change
  const handleAxisChange = useCallback(
    (axis) => (value) => {
      let newChartManager = chartManager.setSelectedColumns({
        ...selectedColumns,
        [axis]: value,
      });

      // Enable use count by default if the y selection is categorical in bar chart
      if (
        (selectedChart === "bar" || selectedChart == "line") &&
        axis === "y"
      ) {
        const selectedColumn = columns.find((col) => col.key === value);
        if (selectedColumn && selectedColumn.variableType === "categorical") {
          newChartManager = newChartManager.updateChartSpecificOptions({
            useCount: true,
          });
        } else {
          newChartManager = newChartManager.updateChartSpecificOptions({
            useCount: false,
          });
        }
      }

      // reset color by if we are changing the y axis
      if (axis === "y") {
        newChartManager = newChartManager.updateChartSpecificOptions({
          colorBy: null,
          colorByIsDate: false,
        });
      }

      newChartManager.render();
    },
    [chartManager, selectedColumns, selectedChart, columns]
  );

  const handleAggregateChange = (value) => {
    // if this is a bar chart, we need to reset the color by selection to the first quantitative column
    let newColorBy = null;
    let newColorByIsDate = false;

    // only do this if:
    // - this is a bar chart
    // - we are aggregating by none
    // - we have columns
    // - we have <=1 y columns
    if (
      selectedChart === "bar" &&
      value === "none" &&
      columns.length > 0 &&
      selectedColumns.y.length <= 1
    ) {
      newColorBy =
        chartSpecificOptions[selectedChart].colorBy || columns[0].dataIndex;
      const selectedColumn = columns.find((col) => col.key === newColorBy);
      newColorByIsDate = selectedColumn.isDate;
    } else {
      newColorBy = null;
      newColorByIsDate = false;
    }

    chartManager
      .updateChartSpecificOptions({
        aggregateFunction: value || "sum",
        colorBy: newColorBy,
        colorByIsDate: newColorByIsDate,
      })
      .render();
  };

  const handleColorByChange = (value) => {
    const selectedColumn = columns.find((col) => col.key === value) || {};
    const newColorByIsDate = selectedColumn.isDate || false;

    chartManager
      .updateChartSpecificOptions({
        colorBy: value,
        colorByIsDate: newColorByIsDate,
      })
      .render();
  };

  // Render aggregate function selection
  const renderAggregateSelection = () => {
    return (
      <>
        <div>
          <span className="mr-2 input-label">Aggregation</span>
          <Select
            style={{ width: "100%" }}
            value={
              chartSpecificOptions[selectedChart].aggregateFunction || "sum"
            }
            onChange={handleAggregateChange}
          >
            {AGGREGATE_OPTIONS.filter(
              (option) =>
                // remove none if we have a line chart
                option.value !== "none" || selectedChart !== "line"
            ).map(({ value, label }) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Add Color by selector when aggregation is none and selected Y columns <= 1 */}
        {chartSpecificOptions[selectedChart].aggregateFunction === "none" &&
          selectedColumns.y.length <= 1 && (
            <div className="mt-2">
              <h3 className="mr-2 input-label">Color by</h3>
              <Select
                style={{ width: "100%" }}
                value={chartSpecificOptions[selectedChart].colorBy}
                onChange={handleColorByChange}
                options={columns.map((col) => ({
                  label: col.title,
                  value: col.dataIndex,
                }))}
                placeholder="Select column"
                allowClear
              />
            </div>
          )}
      </>
    );
  };

  // Handle axis label change
  const handleAxisLabelChange = (axis) => (e) => {
    chartManager
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
        value={chartStyle[`${axis}Label`] || undefined}
        onChange={handleAxisLabelChange(axis)}
      />
    </div>
  );

  const renderHistogramYAxisLabel = () => (
    <div>
      <h3 className="mb-2 input-label">Axis Label</h3>
      <TextInput
        placeholder="Enter y axis label"
        value={chartStyle.yLabel || undefined}
        onChange={(e) =>
          chartManager.updateChartStyle({ yLabel: e.target.value }).render()
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
          rootClassName={`${axis}-axis-selector`}
        >
          {selectedChart === "histogram"
            ? orderedColumns
                .filter((i) => i.numeric === true && i.key !== "index")
                .map(renderColumnOption)
            : orderedColumns.map(renderColumnOption)}
        </Select>
        {(selectedChart === "bar" || selectedChart === "line") &&
          axis === "x" &&
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

  const colorBySelection = useMemo(() => {
    const colorSchemeSelection = (value) => {
      if (selectedChart !== "line") {
        chartManager
          .updateChartSpecificOptions({ fill: value })
          .setSelectedColumns({
            ...selectedColumns,
            fill: value,
          })
          .render();
      } else if (selectedChart === "line") {
        chartManager
          .updateChartSpecificOptions({ stroke: value })
          .setSelectedColumns({
            ...selectedColumns,
            stroke: value,
          })
          .render();
      } else {
        chartManager
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
  }, [chartManager, selectedColumns, orderedColumns, selectedChart]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full gap-4 pl-1">
      <div className="flex flex-col gap-4">
        {/* Chart Type Selection */}
        <div>
          <h3 className="mb-2 font-bold input-label">Chart Type</h3>
          <div className="flex flex-wrap gap-2">
            {CHART_TYPES.filter((d) => {
              if (hiddenCharts.length === 0) {
                return true;
              } else {
                return !hiddenCharts.includes(d.value);
              }
            }).map(({ value, label, Icon }) => (
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
              selectedChart === "line" || selectedChart == "bar"
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

      {selectedChart !== "bar" && selectedChart !== "line" ? (
        <div>
          <h3 className="pb-1 font-bold border-b input-label border-black/20">
            Groups
          </h3>

          <div className="grid grid-cols-2 gap-2 pt-4 ">
            {FacetSelection}
            {colorBySelection}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PrimarySelection;
