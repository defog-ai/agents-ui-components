import { SingleSelect } from "@ui-components";
import { ColorPicker, Slider, Switch } from "antd";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";

// Options for curve types
const CURVE_OPTIONS = [
  { label: "Linear", value: "linear" },
  { label: "Step", value: "step" },
  { label: "Catmull-Rom", value: "catmull-rom" },
];

const LineChartControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { selectedColumns, chartSpecificOptions } = chartManager.config;

  // Handle changes for global line chart options
  const handleGlobalOptionChange = (key, value) => {
    chartManager.updateChartSpecificOptions({ [key]: value }).render();
  };

  // Handle changes for individual line options
  const handleLineOptionChange = (column, key, value) => {
    const updatedLineOptions = {
      ...(chartSpecificOptions.line.lineOptions || {}),
    };
    updatedLineOptions[column] = {
      ...updatedLineOptions[column],
      [key]: value,
    };
    chartManager
      .updateChartSpecificOptions({ lineOptions: updatedLineOptions })
      .render();
  };

  // Render global line chart controls
  const renderGlobalControls = () => (
    <>
      {/* <div className="flex gap-2">
        <SingleSelect
          label="Curve Type"
          options={CURVE_OPTIONS}
          onChange={(value) => handleGlobalOptionChange("curve", value)}
          allowClear={false}
          value={chartSpecificOptions.line.curve || "linear"}
        />
      </div> */}

      {/* <div>
        <h3 className="mb-2 input-label">Line Width</h3>
        <Slider
          min={1}
          max={10}
          value={chartSpecificOptions.line.lineWidth || 2}
          onChange={(value) => handleGlobalOptionChange("lineWidth", value)}
        />
      </div> */}

      {/* <div>
        <h3 className="mb-2 input-label">Show Labels</h3>
        <Switch
          checked={chartSpecificOptions.line.showLabels || false}
          onChange={(checked) =>
            handleGlobalOptionChange("showLabels", checked)
          }
        />
      </div> */}
    </>
  );

  // Render controls for individual lines
  const renderIndividualLineControls = () =>
    Array.isArray(selectedColumns.y) &&
    selectedColumns.y.map((column) => (
      <div key={column} className="p-2 border rounded">
        <h4 className="mb-2 font-bold">{`${column}`}</h4>
        <div className="mb-2">
          <span className="block mb-1">Line Color</span>
          <ColorPicker
            disabledAlpha={true}
            allowClear={true}
            value={
              chartSpecificOptions.line.lineOptions?.[column]?.stroke || ""
            }
            onChange={(color) =>
              handleLineOptionChange(
                column,
                "stroke",
                color.cleared ? null : color.toHexString()
              )
            }
          />
        </div>
        <div className="mb-2">
          <span className="block mb-1">Stroke Width</span>
          <Slider
            min={1}
            max={10}
            value={
              chartSpecificOptions.line.lineOptions?.[column]?.strokeWidth || 2
            }
            onChange={(value) =>
              handleLineOptionChange(column, "strokeWidth", value)
            }
          />
        </div>
      </div>
    ));

  return (
    <div className="flex flex-col gap-4 text-xs">
      {renderGlobalControls()}
      <div className="flex flex-col gap-2">
        <span className="block mb-1">Line Styles</span>
        {renderIndividualLineControls()}
      </div>
    </div>
  );
};

export default LineChartControls;
