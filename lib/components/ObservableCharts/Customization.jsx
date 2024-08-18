import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import { useChartContainer } from "./dashboardState";
import LineChartControls from "./components/LineChartControls";
import ScatterPlotControls from "./components/ScatterPlotControls";
import BarChartControls from "./components/BarChartControls";
import HistogramControls from "./components/HistogramControls";
import GridToggleButton from "./components/GridToggle";

export function Customization() {
  const { selectedChart, chartStyle, updateChartStyle } = useChartContainer();

  const handleStyleChange = (key, value) => {
    updateChartStyle({ [key]: value });
  };

  const renderChartSpecificControls = () => {
    switch (selectedChart) {
      case "line":
        return <LineChartControls />;
      case "bar":
        return <BarChartControls />;
      case "scatter":
        return <ScatterPlotControls />;
      case "histogram":
        return <HistogramControls />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 mx-2">
      {renderChartSpecificControls()}

      <div>
        <h3 className="mb-2 input-label">Background Color</h3>
        <ColorPicker
          value={chartStyle.backgroundColor}
          onChange={(color) =>
            handleStyleChange("backgroundColor", color.toHexString())
          }
        />
      </div>

      <div>
        <h3 className="mb-2 input-label">Font Size</h3>
        <Slider
          min={8}
          max={24}
          value={chartStyle.fontSize}
          onChange={(value) => handleStyleChange("fontSize", value)}
        />
      </div>

      <div>
        <h3 className="mb-2 input-label">Grid Controls</h3>
        <div className="flex gap-2">
          <GridToggleButton
            isActive={chartStyle.xGrid}
            onClick={() => handleStyleChange("xGrid", !chartStyle.xGrid)}
            axis="x"
          />
          <GridToggleButton
            isActive={chartStyle.yGrid}
            onClick={() => handleStyleChange("yGrid", !chartStyle.yGrid)}
            axis="y"
          />
        </div>
      </div>
    </div>
  );
}
