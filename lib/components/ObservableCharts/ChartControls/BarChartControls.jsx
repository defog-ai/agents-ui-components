import { ColorPicker } from "antd";
import { useChartContainer } from "../dashboardState";
import { Slider } from "@ui-components";
const BarChartControls = () => {
  const { chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();

  const handleOptionChange = (key, value) => {
    updateChartSpecificOptions({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
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
          min={2}
          max={20}
          step={0.1}
          rootClassNames="w-full  h-2"
          value={chartSpecificOptions.bar.barWidth}
          onChange={(value) => handleOptionChange("barWidth", value)}
        />
      </div>
    </div>
  );
};

export default BarChartControls;
