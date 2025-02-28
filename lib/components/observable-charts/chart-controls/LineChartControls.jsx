import { ColorPicker, Slider } from "@ui-components";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";

const LineChartControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { selectedColumns, chartSpecificOptions } = chartManager.config;

  // Handle changes for global line chart options
  const handleGlobalOptionChange = (key, value) => {
    chartManager.updateChartSpecificOptions({ [key]: value }).render();
  };

  // Handle changes for individual line options
  const handleLineOptionChange = (column, key, value) => {
    const updatedLineOptions = {
      ...(chartSpecificOptions.line.lineOptions || {}),
    };
    updatedLineOptions[column] = {
      ...updatedLineOptions[column],
      [key]: value,
    };
    chartManager
      .updateChartSpecificOptions({ lineOptions: updatedLineOptions })
      .render();
  };

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <div className="space-y-4">
        <div>
          <div className="mt-2 space-y-4">
            <div>
              <h3 className="mb-2 input-label dark:text-gray-300">Line Width</h3>
              <Slider
                min={1}
                max={10}
                value={chartSpecificOptions.line.lineWidth || 2}
                onChange={(value) =>
                  handleGlobalOptionChange("lineWidth", value)
                }
                rootClassNames="w-full h-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Individual Line Controls */}
      {Array.isArray(selectedColumns.y) && selectedColumns.y.length > 0 && (
        <div className="space-y-4">
          {/* <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            Individual Line Styles
          </label> */}
          <div className="grid gap-3">
            {selectedColumns.y.map((column) => (
              <div
                key={column}
                className="flex items-center justify-between w-full gap-3 border-gray-100 dark:border-gray-700 rounded-sm bg-gray-50/20 dark:bg-gray-700/20"
              >
                <h4 className="mb-2 font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
                  {column}
                </h4>
                <div className="w-full space-y-3">
                  <ColorPicker
                    allowClear={true}
                    value={
                      chartSpecificOptions.line?.lineOptions?.[column]
                        ?.stroke ||
                      chartSpecificOptions.line?.pointColor ||
                      "#4e79a7" // Default color from Observable Plot
                    }
                    onChange={(color) =>
                      handleLineOptionChange(
                        column,
                        "stroke",
                        color.cleared ? null : color.toHexString()
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChartControls;
