import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import { useChartContainer } from "./dashboardState";
import LineChartControls from "./ChartControls/LineChartControls";
import ScatterPlotControls from "./ChartControls/ScatterPlotControls";
import BarChartControls from "./ChartControls/BarChartControls";
import HistogramControls from "./ChartControls/HistogramControls";
import AxisControl from "./components/AxisControl";
import D3DateFormatBuilder from "./components/DateFormatter";

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

      <D3DateFormatBuilder />
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

      <AxisControl />
    </div>
  );
}
