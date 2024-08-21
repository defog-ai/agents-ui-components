import { Slider } from "@ui-components";
import { ColorPicker } from "antd";
import { useChartContainer } from "./dashboardState";
import LineChartControls from "./ChartControls/LineChartControls";
import ScatterPlotControls from "./ChartControls/ScatterPlotControls";
import BarChartControls from "./ChartControls/BarChartControls";
import HistogramControls from "./ChartControls/HistogramControls";
import AxisControl from "./components/AxisControl";
import D3DateFormatBuilder from "./components/DateFormatter";
import BoxPlotControls from "./ChartControls/BoxControl";
import { Select } from "antd";

const { Option, OptGroup } = Select;

const COLOR_SCHEMES = {
  categorical: [
    "category10",
    "accent",
    "dark2",
    "paired",
    "pastel1",
    "pastel2",
    "set1",
    "set2",
    "set3",
    "tableau10",
  ],
  sequential: [
    "blues",
    "greens",
    "greys",
    "oranges",
    "purples",
    "reds",
    "viridis",
    "inferno",
    "magma",
    "plasma",
    "warm",
    "cool",
  ],
  diverging: [
    "brbg",
    "prgn",
    "piyg",
    "puor",
    "rdbu",
    "rdgy",
    "rdylbu",
    "rdylgn",
    "spectral",
  ],
};

export function Customization() {
  const {
    selectedChart,
    chartStyle,
    updateChartStyle,
    updateChartSpecificOptions,
    selectedColumns,
    setSelectedColumns,
    availableColumns,
  } = useChartContainer();

  const handleStyleChange = (key, value) => {
    updateChartStyle({ [key]: value });
  };

  const handleOptionChange = (key, value) => {
    updateChartSpecificOptions({ [key]: value });
    setSelectedColumns({ ...selectedColumns, [key]: value });
  };

  // const renderColorOptions = () => {
  //   return (
  //     <div>
  //       <h3 className="mb-2 input-label">Color Scheme</h3>
  //       <Select value={null} style={{ width: "100%" }}>
  //         <OptGroup label="Categorical">
  //           {COLOR_SCHEMES.categorical.map((scheme) => (
  //             <Option key={scheme} value={scheme}>
  //               {scheme}
  //             </Option>
  //           ))}
  //         </OptGroup>
  //         <OptGroup label="Sequential">
  //           {COLOR_SCHEMES.sequential.map((scheme) => (
  //             <Option key={scheme} value={scheme}>
  //               {scheme}
  //             </Option>
  //           ))}
  //         </OptGroup>
  //         <OptGroup label="Diverging">
  //           {COLOR_SCHEMES.diverging.map((scheme) => (
  //             <Option key={scheme} value={scheme}>
  //               {scheme}
  //             </Option>
  //           ))}
  //         </OptGroup>
  //       </Select>
  //     </div>
  //   );
  // };

  const renderColorBySelection = () => {
    return (
      <div>
        <h3 className="mb-2 input-label">Color By</h3>
        <Select
          value={selectedColumns.fill}
          style={{ width: "100%" }}
          onChange={(value) => handleOptionChange("fill", value)}
          allowClear
        >
          {availableColumns
            .filter((i) => i.variableType === "categorical")
            .map((col) => (
              <Option key={col.key} value={col.key}>
                {col.title}
              </Option>
            ))}
        </Select>
      </div>
    );
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
      {/* {renderColorOptions()} */}
      {renderColorBySelection()}
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
