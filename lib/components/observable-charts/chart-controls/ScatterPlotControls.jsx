import { ColorPicker, Slider } from "antd";
import { useContext } from "react";
import { ChartStateContext } from "../ChartStateContext";

const ScatterPlotControls = () => {
  const chartState = useContext(ChartStateContext);
  const { chartSpecificOptions } = chartState;

  const handleOptionChange = (key, value) => {
    chartState.updateChartSpecificOptions({ [key]: value }).render();
  };

  return (
    <div className="flex flex-col gap-4 p-2 text-xs">
      {!chartState.selectedColumns.fill && (
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
