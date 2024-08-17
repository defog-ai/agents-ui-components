import { ColorPicker, Slider } from "antd";
import { useChartContainer } from "../dashboardState";

const BarChartControls = () => {
  const { chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();

  const handleOptionChange = (key, value) => {
    updateChartSpecificOptions({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 p-2 text-xs">
      <div>
        <h3 className="mb-2">Bar Color</h3>
        <ColorPicker
          value={chartSpecificOptions.bar.barColor}
          onChange={(color) =>
            handleOptionChange("barColor", color.toHexString())
          }
        />
      </div>
      <div>
        <h3 className="mb-2">Bar Width</h3>
        <Slider
          min={0.1}
          max={1}
          step={0.1}
          value={chartSpecificOptions.bar.barWidth}
          onChange={(value) => handleOptionChange("barWidth", value)}
        />
      </div>
    </div>
  );
};

export default BarChartControls;
