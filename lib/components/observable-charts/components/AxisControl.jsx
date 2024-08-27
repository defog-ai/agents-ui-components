import { Slider } from "@ui-components";
import GridToggleButton from "./GridToggle";
import { useContext } from "react";
import { ChartStateContext } from "../ChartStateContext";

const AxisControl = () => {
  const chartState = useContext(ChartStateContext);
  const { chartStyle } = chartState;

  const handleTickChange = (axis, value) => {
    chartState.updateChartStyle({ [`${axis}Ticks`]: Number(value) }).render();
  };

  const handleGridToggle = (axis) => {
    chartState
      .updateChartStyle({ [`${axis}Grid`]: !chartStyle[`${axis}Grid`] })
      .render();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-grow">
          <h3 className="mb-2 input-label"># of horizontal ticks</h3>
          <Slider
            min={2}
            max={20}
            rootClassNames="w-full  h-2"
            value={chartStyle.xTicks}
            onChange={(value) => handleTickChange("x", value)}
          />
        </div>
        <GridToggleButton
          isActive={chartStyle.xGrid}
          onClick={() => handleGridToggle("x")}
          axis="x"
        />
      </div>
      <div className="flex items-center gap-4">
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
