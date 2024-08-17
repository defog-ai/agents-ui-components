import { SingleSelect } from "@ui-components";
import { ColorPicker, Slider, Switch } from "antd";
import { useChartContainer } from "../dashboardState";

const curveOptions = [
  { label: "Linear", value: "linear" },
  { label: "Step", value: "step" },
  { label: "Catmull-Rom", value: "catmull-rom" },
];

const LineChartControls = () => {
  const { selectedColumns, chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();

  const handleGlobalOptionChange = (key, value) => {
    updateChartSpecificOptions({ [key]: value });
  };

  const handleLineOptionChange = (index, key, value) => {
    const updatedLineOptions = [
      ...(chartSpecificOptions.line.lineOptions || []),
    ];
    updatedLineOptions[index] = { ...updatedLineOptions[index], [key]: value };
    updateChartSpecificOptions({ lineOptions: updatedLineOptions });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="flex gap-2">
        <SingleSelect
          label="Curve Type"
          options={curveOptions}
          onChange={(value) => handleGlobalOptionChange("curve", value)}
          value={chartSpecificOptions.line.curve || "linear"}
        />
        <div>
          <h3 className="mb-2 input-label">Color</h3>
          <ColorPicker
            size="medium"
            value={chartSpecificOptions.line.lineColor}
            onChange={(color) =>
              handleGlobalOptionChange("lineColor", color.toHexString())
            }
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 input-label">Line Width</h3>
        <Slider
          min={1}
          max={10}
          value={chartSpecificOptions.line.lineWidth || 2}
          onChange={(value) => handleGlobalOptionChange("lineWidth", value)}
        />
      </div>

      <div>
        <h3 className="mb-2 input-label">Show Labels</h3>
        <Switch
          checked={chartSpecificOptions.line.showLabels || false}
          onChange={(checked) =>
            handleGlobalOptionChange("showLabels", checked)
          }
        />
      </div>

      {Array.isArray(selectedColumns.y) &&
        selectedColumns.y.map((column, index) => (
          <div key={column} className="p-2 border rounded">
            <h4 className="mb-2 font-bold">{`Line ${index + 1}: ${column}`}</h4>
            <div className="mb-2">
              <span className="block mb-1">Line Color</span>
              <ColorPicker
                value={
                  chartSpecificOptions.line.lineOptions?.[index]?.stroke || ""
                }
                onChange={(color) =>
                  handleLineOptionChange(index, "stroke", color.toHexString())
                }
              />
            </div>
            <div className="mb-2">
              <span className="block mb-1">Stroke Width</span>
              <Slider
                min={1}
                max={10}
                value={
                  chartSpecificOptions.line.lineOptions?.[index]?.strokeWidth ||
                  2
                }
                onChange={(value) =>
                  handleLineOptionChange(index, "strokeWidth", value)
                }
              />
            </div>
          </div>
        ))}
    </div>
  );
};

export default LineChartControls;
