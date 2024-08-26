import { ColorPicker, Slider } from "antd";
import { useChartContainer } from "../dashboardState";

const ScatterPlotControls = () => {
  const { chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();

  const handleOptionChange = (key, value) => {
    updateChartSpecificOptions({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 p-2 text-xs">
      <div>
        <h3 className="mb-2">Point Color</h3>
        <ColorPicker
          value={chartSpecificOptions.scatter.pointColor}
          onChange={(color) =>
            handleOptionChange("pointColor", color.toHexString())
          }
        />
      </div>
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
