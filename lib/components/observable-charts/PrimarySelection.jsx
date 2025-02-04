import { useCallback, useContext, useEffect, useState } from "react";
import { SingleSelect as Select, Button } from "@ui-components";
import { CalendarIcon, HashIcon, CaseSensitive, Settings2 } from "lucide-react";
import { reorderColumns } from "./columnOrdering.js";
import { ChartManagerContext } from "./ChartManagerContext";
import { AgentConfigContext } from "../context/AgentContext";
// import FilterBuilder from "./Filtering";
import { KeyboardShortcutIndicator } from "../core-ui/KeyboardShortcutIndicator";
import { KEYMAP } from "../../constants/keymap";
import ChartTypeSelector from "./ChartTypeSelector";
import AxisSelector from "./AxisSelector";
import AggregateSelector from "./AggregateSelector";

// Icons for different column types
const COLUMN_ICONS = {
  date: CalendarIcon,
  quantitative: HashIcon,
  categorical: CaseSensitive,
};

export function PrimarySelection({ columns, showChartTypeOnly = false }) {
  const chartManager = useContext(ChartManagerContext);

  const { selectedChart, selectedColumns, chartSpecificOptions } =
    chartManager.config;

  const [orderedColumns, setOrderedColumns] = useState(columns);

  const agentConfigContext = useContext(AgentConfigContext);
  const { hiddenCharts = [] } = agentConfigContext.val;

  // Add state for showing/hiding filters
  const [showFilters, setShowFilters] = useState(false);

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

  // Render column option for Select
  const renderColumnOption = ({ key, isDate, variableType }) => {
    const IconComponent = COLUMN_ICONS[isDate ? "date" : variableType];
    return {
      label: (
        <span>
          {IconComponent && (
            <>
              <IconComponent
                className="text-gray-400 inline-block mr-1"
                size={13}
              />
            </>
          )}
          {key}
        </span>
      ),
      value: key,
    };
  };

  // If showChartTypeOnly is true, only render the chart type selection
  if (showChartTypeOnly) {
    return (
      <div className="flex mr-4 gap-1.5">
        <ChartTypeSelector
          selectedChart={selectedChart}
          onChartChange={handleChartChange}
          hiddenCharts={hiddenCharts}
        />
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
            </div>
            <AxisSelector
              axis="x"
              columns={orderedColumns}
              selectedValue={selectedColumns.x}
              onAxisChange={handleAxisChange("x")}
            />
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
            <AxisSelector
              axis="y"
              columns={orderedColumns}
              selectedValue={selectedColumns.y}
              onAxisChange={handleAxisChange("y")}
            />
          </div>
        </div>

        {/* Aggregate Selection */}
        <AggregateSelector
          selectedChart={selectedChart}
          aggregateFunction={
            chartSpecificOptions[selectedChart].aggregateFunction || "sum"
          }
          onAggregateChange={handleAggregateChange}
        />

        {/* Groups Section */}
        {selectedChart !== "bar" && (
          <div className="pt-4 space-y-2 border-t border-gray-100">
            {/* <h3 className="text-xs font-medium text-gray-900">Grouping</h3> */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <h3 className="mb-2 font-medium input-label">Facet by</h3>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select Facet Column"
                  onChange={(value) => handleAxisChange("facet")(value)}
                  value={selectedColumns.facet}
                  allowClear
                  options={orderedColumns.map(renderColumnOption)}
                />
              </div>
              <div className="space-y-1.5">
                <h3 className="mb-2 font-medium input-label">Color By</h3>
                <Select
                  placeholder="Color Column"
                  value={selectedColumns.fill}
                  style={{ width: "100%" }}
                  onChange={(value) => {
                    const selectedColumn =
                      columns.find((col) => col.key === value) || {};
                    const newColorByIsDate = selectedColumn.isDate || false;

                    chartManager
                      .updateChartSpecificOptions({
                        colorBy: value,
                        colorByIsDate: newColorByIsDate,
                      })
                      .render();
                  }}
                  disabled={
                    selectedColumns.y.length > 1 && selectedChart === "line"
                  }
                  allowClear
                  options={orderedColumns.map(renderColumnOption)}
                />
              </div>
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

      {/* {showFilters && (
        <div className="pt-4 mt-4 border-t border-gray-100">
          <FilterBuilder columns={columns} />
        </div>
      )} */}
    </div>
  );
}

export default PrimarySelection;
