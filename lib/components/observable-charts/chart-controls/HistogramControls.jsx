import { Input, Slider, Switch } from "antd";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";

const HistogramControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartSpecificOptions } = chartManager.config;

  const histogramOptions = chartSpecificOptions.histogram;

  const handleOptionChange = (option, value) => {
    chartManager.updateChartSpecificOptions({ [option]: value }).render();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 input-label">Bin Count</h3>
        <Slider
          min={1}
          max={50}
          value={histogramOptions.binCount}
          onChange={(value) => handleOptionChange("binCount", value)}
        />
      </div>
      <div>
        <h3 className="mb-2 input-label">Fill Color</h3>
        <Input
          type="color"
          value={histogramOptions.fillColor}
          onChange={(e) => handleOptionChange("fillColor", e.target.value)}
        />
      </div>

      <div>
        <h3 className="mb-2 input-label">Cumulative</h3>
        <Switch
          checked={histogramOptions.cumulative}
          onChange={(checked) => handleOptionChange("cumulative", checked)}
        />
      </div>
    </div>
  );
};

export default HistogramControls;
