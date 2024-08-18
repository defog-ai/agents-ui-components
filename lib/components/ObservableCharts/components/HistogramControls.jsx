import { Input, Slider, Switch } from "antd";
import { useChartContainer } from "../dashboardState";

const HistogramControls = () => {
  const { chartSpecificOptions, updateChartSpecificOptions } =
    useChartContainer();
  const histogramOptions = chartSpecificOptions.histogram;

  const handleOptionChange = (option, value) => {
    updateChartSpecificOptions({ [option]: value });
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
        <h3 className="mb-2 input-label">Normalize</h3>
        <Switch
          checked={histogramOptions.normalize}
          onChange={(checked) => handleOptionChange("normalize", checked)}
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
