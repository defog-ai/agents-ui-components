import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import {
  HashIcon,
  CaseSensitive,
  ChartLine,
  ChartScatter,
  ChartColumnIncreasing,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  reorderColumns,
} from "./columnOrdering.js";
import { Input as TextInput, Button } from "@ui-components";
import { ChartManagerContext } from "./ChartManagerContext";
import { AgentConfigContext } from "../context/AgentContext";
import FilterBuilder from "./Filtering";

const { Option } = Select;

// Available chart types with their icons and labels
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnIncreasing },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
];

// Options for data aggregation in bar/line charts
const AGGREGATE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Mean" },
];

// Icons to represent different data types in column selection
const COLUMN_ICONS = {
  date: HashIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

// Default labels for chart axes
const DEFAULT_AXIS_LABELS = {
  x: "Horizontal",
  y: "Vertical",
};

/**
 * Primary chart configuration component that allows users to:
 * - Select chart type (line, bar, scatter)
 * - Configure X and Y axes
 * - Set data aggregation methods
 * - Apply color schemes and grouping
 */
export function PrimarySelection({ columns }) {
  // Access chart configuration and agent settings
  const chartManager = useContext(ChartManagerContext);
  const { hiddenCharts = [] } = useContext(AgentConfigContext).val;

  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [axisLabel, setAxisLabel] = useState(DEFAULT_AXIS_LABELS);
  const [showFilters, setShowFilters] = useState(false);

  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    data,
    separator,
  } = chartManager.config;

  // Update column ordering when chart type changes
  useEffect(() => {
    chartManager.setAvailableColumns(columns).render();
    setOrderedColumns(reorderColumns(columns, selectedChart));
  }, [columns, selectedChart, chartManager]);

  // Reset axis labels when chart type changes
  useEffect(() => {
    setAxisLabel(DEFAULT_AXIS_LABELS);
  }, [selectedChart, chartSpecificOptions]);

  const handleChartChange = useCallback(
    (value) => {
      chartManager
        .setSelectedChart(value)
        .updateChartStyle({ xLabel: null, yLabel: null })
        .autoSelectVariables()
        .render();
    },
    [chartManager]
  );

  const handleAxisChange = useCallback(
    (axis) => (value) => {
      let selected = value;

      // For X-axis, handle multiple column selection by joining values
      if (axis === "x" && Array.isArray(value) && value.length > 1) {
        selected = value.join(separator);
        data.forEach((row) => {
          row[selected] = value.map((v) => row[v] ?? "").join("-");
        });
      } else if (axis === "x") {
        selected = value[0];
      }

      let newChartManager = chartManager.setSelectedColumns({
        ...selectedColumns,
        [axis]: selected,
      });

      // Auto-enable count for categorical Y-axis in bar/line charts
      if (
        (selectedChart === "bar" || selectedChart === "line") &&
        axis === "y"
      ) {
        const selectedColumn = columns.find((col) => col.key === value);
        newChartManager = newChartManager.updateChartSpecificOptions({
          useCount: selectedColumn?.variableType === "categorical",
        });
      }

      // Clear color settings when Y-axis changes to prevent conflicts
      if (axis === "y") {
        newChartManager = newChartManager.updateChartSpecificOptions({
          colorBy: null,
          colorByIsDate: false,
        });
      }

      newChartManager.render();
    },
    [chartManager, selectedColumns, selectedChart, columns, data, separator]
  );

  // Update aggregation method and handle related color settings
  const handleAggregateChange = useCallback(
    (value) => {
      let newColorBy = null;
      let newColorByIsDate = false;

      // For bar charts with no aggregation, set default color column
      if (
        selectedChart === "bar" &&
        value === "none" &&
        columns.length > 0 &&
        selectedColumns.y.length <= 1
      ) {
        newColorBy =
          chartSpecificOptions[selectedChart].colorBy || columns[0].dataIndex;
        const selectedColumn = columns.find((col) => col.key === newColorBy);
        newColorByIsDate = selectedColumn?.isDate || false;
      }

      chartManager
        .updateChartSpecificOptions({
          aggregateFunction: value || "sum",
          colorBy: newColorBy,
          colorByIsDate: newColorByIsDate,
        })
        .render();
    },
    [
      chartManager,
      selectedChart,
      columns,
      selectedColumns.y,
      chartSpecificOptions,
    ]
  );

  // Update color grouping column
  const handleColorByChange = useCallback(
    (value) => {
      const selectedColumn = columns.find((col) => col.key === value) || {};
      chartManager
        .updateChartSpecificOptions({
          colorBy: value,
          colorByIsDate: selectedColumn.isDate || false,
        })
        .render();
    },
    [chartManager, columns]
  );

  // Update axis label text
  const handleAxisLabelChange = useCallback(
    (axis) => (e) => {
      chartManager
        .updateChartStyle({
          [`${axis}Label`]: e.target.value,
        })
        .render();
    },
    [chartManager]
  );

  // Render a column option with appropriate icon based on data type
  const renderColumnOption = useCallback(
    ({ key, title, isDate, variableType }) => {
      const IconComponent = COLUMN_ICONS[isDate ? "date" : variableType];
      return (
        <Option key={key} value={key}>
          <div className="flex gap-2 items-center">
            {IconComponent && (
              <IconComponent className="opacity-50" size={14} />
            )}
            <span>{title}</span>
          </div>
        </Option>
      );
    },
    []
  );

  // Input field for axis label customization
  const renderAxisLabel = useCallback(
    (axis) => (
      <div>
        <h3 className="mb-2 input-label">Label</h3>
        <TextInput
          placeholder={`Enter ${axis.toUpperCase()}-Axis Label`}
          value={chartStyle[`${axis}Label`] || undefined}
          onChange={handleAxisLabelChange(axis)}
        />
      </div>
    ),
    [chartStyle, handleAxisLabelChange]
  );

  // Render aggregation method selector with optional color grouping
  const renderAggregateSelection = useCallback(
    () => (
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
              (option) => option.value !== "none" || selectedChart !== "line"
            ).map(({ value, label }) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Show color selector only when no aggregation is applied */}
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
    ),
    [
      selectedChart,
      chartSpecificOptions,
      handleAggregateChange,
      handleColorByChange,
      columns,
      selectedColumns.y,
    ]
  );

  // Axis variable selector with aggregation options for bar/line charts
  const renderAxisSelection = useCallback(
    (axis, label, mode) => {
      let selectedColumnKey = selectedColumns[axis];

      if (axis === "x" && selectedColumns.x) {
        selectedColumnKey = selectedColumns.x.split(separator);
      }

      return (
        <div>
          <h3 className="mb-2 input-label">Variable</h3>
          <Select
            style={{ width: "100%" }}
            placeholder={`Select ${label}-Axis`}
            onChange={handleAxisChange(axis)}
            value={selectedColumnKey}
            allowClear={axis === "x"}
            mode={mode}
            rootClassName={`${axis}-axis-selector`}
          >
            {orderedColumns.map(renderColumnOption)}
          </Select>
          {(selectedChart === "bar" || selectedChart === "line") &&
            axis === "x" &&
            renderAggregateSelection()}
        </div>
      );
    },
    [
      selectedColumns,
      separator,
      handleAxisChange,
      orderedColumns,
      selectedChart,
      renderColumnOption,
      renderAggregateSelection,
    ]
  );

  // Facet (subgrouping) selector for categorical variables
  const FacetSelection = useMemo(
    () => (
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
    ),
    [selectedColumns, orderedColumns, handleAxisChange, renderColumnOption]
  );

  // Color scheme selector with different behavior for line/bar charts
  const colorBySelection = useMemo(() => {
    const colorSchemeSelection = (value) => {
      const updateConfig = {
        ...(selectedChart === "line" ? { stroke: value } : { fill: value }),
      };

      chartManager
        .updateChartSpecificOptions(updateConfig)
        .setSelectedColumns({
          ...selectedColumns,
          ...(selectedChart === "line" ? { stroke: value } : { fill: value }),
        })
        .render();
    };

    return (
      <div>
        <h3 className="mb-2 input-label">Color By</h3>
        <Select
          placeholder="Color Column"
          value={selectedColumns.fill}
          style={{ width: "100%" }}
          onChange={colorSchemeSelection}
          allowClear
        >
          {orderedColumns
            .filter((col) => col.variableType === "categorical")
            .map(renderColumnOption)}
        </Select>
      </div>
    );
  }, [
    chartManager,
    selectedColumns,
    orderedColumns,
    selectedChart,
    renderColumnOption,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-4">
          {/* Chart type selector with icons */}
          <div>
            <h3 className="mb-2 font-bold input-label">Chart Type</h3>
            <div className="flex flex-wrap gap-2">
              {CHART_TYPES.filter((d) => !hiddenCharts.includes(d.value)).map(
                ({ value, label, Icon }) => (
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
                )
              )}
            </div>
          </div>

          {/* Horizontal axis configuration */}
          <h3 className="pb-1 font-bold border-b input-label border-black/20">
            Horizontal Axis
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {renderAxisSelection("x", axisLabel.x, "multiple")}
            {renderAxisLabel("x")}
          </div>

          {/* Vertical axis configuration */}
          <h3 className="pb-1 font-bold border-b input-label border-black/20">
            Vertical Axis
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {renderAxisSelection(
              "y",
              axisLabel.y,
              selectedChart === "line" || selectedChart === "bar"
                ? "multiple"
                : undefined
            )}
            <div className="flex gap-4 items-center">{renderAxisLabel("y")}</div>
          </div>

          {/* Additional grouping options for scatter plots */}
          {selectedChart !== "bar" && selectedChart !== "line" && (
            <div>
              <h3 className="pb-1 font-bold border-b input-label border-black/20">
                Groups
              </h3>
              {/* Split view into two columns for faceting and coloring options */}
              <div className="grid grid-cols-2 gap-2 pt-4">
                {/* Left column: Allow splitting the chart into subplots by a categorical variable */}
                {FacetSelection}
                {/* Right column: Enable color-coding data points by a categorical variable */}
                {colorBySelection}
              </div>
            </div>
          )}

          {/* Advanced options section */}
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded"
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                <span>Show advanced options</span>
              </div>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <div className={`mt-3 ${showFilters ? 'block' : 'hidden'}`}>
              <FilterBuilder
                columns={columns.filter((col) =>
                  Object.values(chartManager.config.selectedColumns || {}).includes(col.key)
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrimarySelection;
