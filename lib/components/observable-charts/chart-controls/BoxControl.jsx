import { Select } from "antd";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";
import { useEffect } from "react";

const BoxPlotControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartSpecificOptions, selectedChart } = chartManager.config;

  const handleOrientationChange = (value) => {
    chartManager
      .updateChartSpecificOptions({
        boxplotOrientation: value,
      })
      .render();
  };

  // If chart changes, reset the orientation to vertical
  useEffect(() => {
    if (selectedChart !== "boxplot") {
      chartManager
        .updateChartSpecificOptions({
          boxplotOrientation: "vertical",
        })
        .render();
    }
  }, [chartManager, selectedChart]);

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
