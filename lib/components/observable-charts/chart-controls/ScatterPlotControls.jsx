import { ColorPicker, Slider } from "@ui-components";
import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";

const ScatterPlotControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartSpecificOptions } = chartManager.config;

  const handleOptionChange = (key, value) => {
    chartManager.updateChartSpecificOptions({ [key]: value }).render();
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {!chartManager.config.selectedColumns.fill && (
        <div>
          <h3 className="mb-2 dark:text-gray-300">Override dot color</h3>
          <ColorPicker
            value={chartSpecificOptions.scatter?.pointColor || "#4e79a7"}
            onChange={(color) =>
              handleOptionChange(
                "pointColor",
                color.cleared ? null : color.toHexString()
              )
            }
          />
        </div>
      )}
      <div>
        <h3 className="mb-2 dark:text-gray-300">Point Size</h3>
        <Slider
          min={1}
          max={20}
          value={chartSpecificOptions.scatter.pointSize}
          onChange={(value) => handleOptionChange("pointSize", value)}
        />
      </div>
    </div>
  );
};

export default ScatterPlotControls;
