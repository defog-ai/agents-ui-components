import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import LineChartControls from "./chart-controls/LineChartControls";
import ScatterPlotControls from "./chart-controls/ScatterPlotControls";
import BarChartControls from "./chart-controls/BarChartControls";
import AxisControl from "./components/AxisControl";
import D3DateFormatBuilder from "./components/DateFormatter";
import ColorSchemeSelector from "./components/ColorschemeSelector";
import { ChartManagerContext } from "./ChartManagerContext";
import { useContext } from "react";

export function Customization() {
  const chartManager = useContext(ChartManagerContext);
  const { selectedChart, chartStyle, selectedColumns, availableColumns } =
    chartManager.config;

  const handleStyleChange = (key, value) => {
    chartManager.updateChartStyle({ [key]: value }).render();
  };

  const renderChartSpecificControls = () => {
    switch (selectedChart) {
      case "line":
        return <LineChartControls />;
      case "bar":
        return <BarChartControls />;
      case "scatter":
        return <ScatterPlotControls />;

      default:
        return null;
    }
  };

  const isDateColumnSelected = availableColumns.some(
    (col) => col.key === selectedColumns.x && col.isDate
  );

  return (
    <div className="grid grid-rows-[auto_1fr] max-h-[550px] overflow-x-clip overflow-y-auto h-full">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <ColorSchemeSelector
            value={chartStyle.selectedScheme}
            onChange={(value) => {
              handleStyleChange("selectedScheme", value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="input-label">Background Color</h3>
          <ColorPicker
            className="w-full"
            allowClear={true}
            value={chartStyle.backgroundColor}
            onChange={(color) =>
              handleStyleChange("backgroundColor", color.toHexString())
            }
          />
        </div>

        <div className="space-y-4">
          {/* <h3 className="text-sm font-medium text-gray-900">Chart Options</h3> */}
          <div className="space-y-4">{renderChartSpecificControls()}</div>
        </div>

        {/* {isDateColumnSelected && (
          <div className="pt-4 space-y-2 border-t border-gray-100">
            <D3DateFormatBuilder />
          </div>
        )} */}

        <div className="space-y-4">
          {/* <h3 className="text-sm font-medium text-gray-900">Visual Options</h3> */}

          {/* <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Font Size
            </label>
            <Slider
              min={8}
              max={24}
              value={chartStyle.fontSize}
              rootClassNames="w-full h-2"
              onChange={(value) => handleStyleChange("fontSize", value)}
            />
          </div> */}
        </div>
        {/* 
        <div className="pt-4 space-y-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Axis Settings</h3>
          <AxisControl />
        </div> */}
      </div>
    </div>
  );
}
