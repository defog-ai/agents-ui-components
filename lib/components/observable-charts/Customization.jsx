import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import LineChartControls from "./chart-controls/LineChartControls";
import ScatterPlotControls from "./chart-controls/ScatterPlotControls";
import BarChartControls from "./chart-controls/BarChartControls";
import HistogramControls from "./chart-controls/HistogramControls";
import AxisControl from "./components/AxisControl";
import D3DateFormatBuilder from "./components/DateFormatter";
import BoxPlotControls from "./chart-controls/BoxControl";
import ColorSchemeSelector from "./components/ColorschemeSelector";
import { ChartStateContext } from "./ChartStateContext";
import { useContext } from "react";

export function Customization() {
  const chartState = useContext(ChartStateContext);
  const { selectedChart, chartStyle, selectedColumns, availableColumns } =
    chartState;

  const handleStyleChange = (key, value) => {
    chartState.updateChartStyle({ [key]: value }).render();
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
        value={chartStyle.selectedScheme}
        onChange={(value) => handleStyleChange("selectedScheme", value)}
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
          rootClassNames="w-full  h-2"
          onChange={(value) => handleStyleChange("fontSize", value)}
        />
      </div>

      <AxisControl />
    </div>
  );
}
