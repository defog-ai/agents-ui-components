import { Select } from "antd";
import { useChartContainer } from "../dashboardState";

const BoxPlotControls = () => {
  const { chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();

  const handleOrientationChange = (value) => {
    updateChartSpecificOptions({
      boxplotOrientation: value,
    });
  };

  return (
    <div>
      <h3 className="mb-2 input-label">Orientation</h3>
      <Select
        value={chartSpecificOptions.boxplot?.boxplotOrientation || "vertical"}
        onChange={handleOrientationChange}
        style={{ width: "100%" }}
      >
        <Select.Option value="vertical">Vertical</Select.Option>
        <Select.Option value="horizontal">Horizontal</Select.Option>
      </Select>
    </div>
  );
};

export default BoxPlotControls;
