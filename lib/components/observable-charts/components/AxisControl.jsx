import { Slider } from "@ui-components";
import GridToggleButton from "./GridToggle";
import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";

const AxisControl = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartStyle } = chartManager.config;

  const handleTickChange = (axis, value) => {
    chartManager.updateChartStyle({ [`${axis}Ticks`]: Number(value) }).render();
  };

  const handleGridToggle = (axis) => {
    chartManager
      .updateChartStyle({ [`${axis}Grid`]: !chartStyle[`${axis}Grid`] })
      .render();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <div className="flex-grow">
          <h3 className="mb-2 input-label"># of vertical ticks</h3>
          <Slider
            min={2}
            max={20}
            rootClassNames="w-full  h-2"
            value={chartStyle.yTicks}
            onChange={(value) => handleTickChange("y", value)}
          />
        </div>
        <GridToggleButton
          isActive={chartStyle.yGrid}
          onClick={() => handleGridToggle("y")}
          axis="y"
        />
      </div>
    </div>
  );
};

export default AxisControl;
