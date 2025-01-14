import { ColorPicker, Slider } from "antd";
import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";

const ScatterPlotControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartSpecificOptions } = chartManager.config;

  const handleOptionChange = (key, value) => {
    chartManager.updateChartSpecificOptions({ [key]: value }).render();
  };

  return (
    <div className="flex flex-col gap-4 p-2 text-xs">
      {!chartManager.config.selectedColumns.fill && (
        <div>
          <h3 className="mb-2">Override dot color</h3>
          <ColorPicker
            value={chartSpecificOptions.scatter.pointColor}
            onChange={(color) =>
              handleOptionChange("pointColor", color.toHexString())
            }
          />
        </div>
      )}
      <div>
        <h3 className="mb-2">Point Size</h3>
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
