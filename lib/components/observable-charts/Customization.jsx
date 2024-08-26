import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import { useChartContainer } from "./dashboardState";
import LineChartControls from "./chart-controls/LineChartControls";
import ScatterPlotControls from "./chart-controls/ScatterPlotControls";
import BarChartControls from "./chart-controls/BarChartControls";
import HistogramControls from "./chart-controls/HistogramControls";
import AxisControl from "./components/AxisControl";
import D3DateFormatBuilder from "./components/DateFormatter";
import BoxPlotControls from "./chart-controls/BoxControl";
import ColorSchemeSelector from "./components/ColorschemeSelector";

export function Customization() {
  const {
    selectedChart,
    chartStyle,
    updateChartStyle,
    selectedColumns,
    availableColumns,
  } = useChartContainer();

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
      case "boxplot":
        return <BoxPlotControls />;
      default:
        return null;
    }
  };

  const isDateColumnSelected = availableColumns.some(
    (col) => col.key === selectedColumns.x && col.isDate
  );

  return (
    <div className="flex flex-col gap-4 mx-2">
      <ColorSchemeSelector
        value={chartStyle.scheme}
        onChange={(value) => handleStyleChange("scheme", value)}
      />
      {renderChartSpecificControls()}

      {isDateColumnSelected && <D3DateFormatBuilder />}

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
