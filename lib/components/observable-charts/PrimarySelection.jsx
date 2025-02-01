import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Select, Button } from "antd";
import {
  CalendarIcon,
  HashIcon,
  CaseSensitive,
  ChartLine,
  ChartScatter,
  ChartColumnIncreasing,
  Settings2,
} from "lucide-react";
import { reorderColumns } from "./columnOrdering.js";
import { ChartManagerContext } from "./ChartManagerContext";
import { AgentConfigContext } from "../context/AgentContext";
import FilterBuilder from "./Filtering";
import { KeyboardShortcutIndicator } from "../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../constants/keymap";

const { Option } = Select;

// Chart type options with icons
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnIncreasing },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
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

export function PrimarySelection({ columns, showChartTypeOnly = false }) {
  const chartManager = useContext(ChartManagerContext);

  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    data,
    separator,
  } = chartManager.config;

  const [orderedColumns, setOrderedColumns] = useState(columns);

  const agentConfigContext = useContext(AgentConfigContext);
  const { hiddenCharts = [] } = agentConfigContext.val;

  // Add state for showing/hiding filters
  const [showFilters, setShowFilters] = useState(false);

  // Add new state to control Select dropdowns
  const [openDropdown, setOpenDropdown] = useState(null);

  // Add refs for both selects
  const xAxisRef = useRef(null);
  const yAxisRef = useRef(null);

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

  // Handle axis selection change
  const handleAxisChange = useCallback(
    (axis) => (value) => {
      chartManager.setSelectedColumns({
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
          chartManager.updateChartSpecificOptions({
            useCount: true,
          });
        } else {
          chartManager.updateChartSpecificOptions({
            useCount: false,
          });
        }
      }

      // reset color by if we are changing the y axis
      if (axis === "y") {
        chartManager.updateChartSpecificOptions({
          colorBy: null,
          colorByIsDate: false,
        });
      }

      chartManager.render();
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
          <Select
            style={{ width: "100%", minWidth: "100px" }}
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

  // Render column option for Select
  const renderColumnOption = ({ key, title, isDate, variableType }) => {
    const IconComponent = COLUMN_ICONS[isDate ? "date" : variableType];
    return (
      <Option key={key} value={key}>
        <div className="flex items-center gap-2 py-0.5">
          {IconComponent && (
            <IconComponent className="text-gray-400" size={13} />
          )}
          <span className="text-sm">{title}</span>
        </div>
      </Option>
    );
  };

  // Render axis selection dropdown
  const renderAxisSelection = (axis, mode) => {
    let selectedColumnKey = selectedColumns[axis];
    const selectedColumn = columns.find((col) => col.key === selectedColumnKey);

    if (axis === "x" && selectedColumns.x) {
      selectedColumnKey = selectedColumns.x.split(separator);
    } else if (axis === "x" && !selectedColumns.x) {
      selectedColumnKey = [];
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="w-full">
          <Select
            ref={axis === "x" ? xAxisRef : yAxisRef}
            data-axis={axis}
            style={{ width: "100%" }}
            placeholder={`Select ${axis.toUpperCase()}-Axis`}
            onChange={handleAxisChange(axis)}
            value={selectedColumnKey}
            allowClear={axis === "x"}
            mode={mode}
            rootClassName={`${axis}-axis-selector`}
            open={openDropdown === axis}
            onDropdownVisibleChange={(visible) => {
              setOpenDropdown(visible ? axis : null);
            }}
            tagRender={(props) => {
              const { label, closable, onClose } = props;

              return (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 m-0.5 text-xs bg-blue-50 border border-blue-100 rounded-sm text-blue-700">
                  <span className="max-w-[100px] truncate">{label}</span>
                  {closable && (
                    <span
                      className="ml-1 cursor-pointer hover:text-blue-900"
                      onClick={onClose}
                    >
                      ×
                    </span>
                  )}
                </div>
              );
            }}
          >
            {orderedColumns.map(renderColumnOption)}
          </Select>
        </div>
        {(selectedChart === "bar" || selectedChart === "line") && axis === "x"}
      </div>
    );
  };

  // Render facet selection dropdown
  const FacetSelection = useMemo(() => {
    return (
      <div>
        <h3 className="mb-2 font-medium input-label">Facet by</h3>
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
        <h3 className="mb-2 font-medium input-label">Color By</h3>
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

  // Move this block before the showChartTypeOnly condition
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (document.activeElement === document.body) {
        // X axis shortcut
        if (matchesKey(e.key, KEYMAP.SET_X_AXIS)) {
          setOpenDropdown("x");
          // Focus the select input
          xAxisRef.current?.focus();
          e.preventDefault();
        }
        // Y axis shortcut
        if (matchesKey(e.key, KEYMAP.SET_Y_AXIS)) {
          setOpenDropdown("y");
          // Focus the select input
          yAxisRef.current?.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // If showChartTypeOnly is true, only render the chart type selection
  if (showChartTypeOnly) {
    return (
      <div className="flex mr-4 gap-1.5">
        {CHART_TYPES.map(({ value, label, Icon }) => (
          <Button
            key={value}
            onClick={() => handleChartChange(value)}
            className={`
              px-3 py-2 rounded-sm font-sans w-full border flex items-center justify-center gap-2
              font-medium transition-all duration-150 text-xs
              ${
                selectedChart === value
                  ? "bg-blue-500/95 text-white border-0 shadow-sm hover:bg-blue-600"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[auto_1fr_auto] max-h-[550px] overflow-y-auto h-full">
      <div className="space-y-6">
        {/* Variables Section */}
        <div className="space-y-4">
          {/* X-Axis */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <KeyboardShortcutIndicator
                  shortcut={KEYMAP.SET_X_AXIS}
                  className="px-1 py-0.5 text-xs font-bold text-gray-500 "
                />

                <span className="flex items-center gap-2">Horizontal Axis</span>
              </label>
              {(selectedChart === "bar" || selectedChart === "line") &&
                renderAggregateSelection()}
            </div>
            {renderAxisSelection("x", "multiple")}
          </div>

          {/* Y-Axis */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <KeyboardShortcutIndicator
                shortcut={KEYMAP.SET_Y_AXIS}
                className="px-1 py-0.5 text-xs font-bold text-gray-500 "
              />

              <span className="flex items-center gap-2">Vertical Axis</span>
            </label>
            {renderAxisSelection(
              "y",
              selectedChart === "line" || selectedChart === "bar"
                ? "multiple"
                : undefined
            )}
          </div>
        </div>

        {/* Groups Section */}
        {selectedChart !== "bar" && (
          <div className="pt-4 space-y-2 border-t border-gray-100">
            {/* <h3 className="text-xs font-medium text-gray-900">Grouping</h3> */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">{FacetSelection}</div>
              <div className="space-y-1.5">{colorBySelection}</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Button */}
      <Button
        block
        type="default"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-gray-700 border-gray-200 h-9 bg-gray-50 hover:bg-gray-100"
      >
        <Settings2 className="w-4 h-4" />
        Advanced Options
      </Button>

      {showFilters && (
        <div className="pt-4 mt-4 border-t border-gray-100">
          <FilterBuilder columns={columns} />
        </div>
      )}
    </div>
  );
}

export default PrimarySelection;
