import { Select } from "antd";
import { ChartStateContext } from "../ChartStateContext";
import { useContext } from "react";
import { useEffect } from "react";

const BoxPlotControls = () => {
  const chartState = useContext(ChartStateContext);
  const { chartSpecificOptions, updateChartSpecificOptions, selectedChart } =
    chartState;

  const handleOrientationChange = (value) => {
    chartState
      .updateChartSpecificOptions({
        boxplotOrientation: value,
      })
      .render();
  };

  // If chart changes, reset the orientation to vertical
  useEffect(() => {
    if (selectedChart !== "boxplot") {
      chartState
        .updateChartSpecificOptions({
          boxplotOrientation: "vertical",
        })
        .render();
    }
  }, [selectedChart, updateChartSpecificOptions]);

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
