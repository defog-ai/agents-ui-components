import { ColorPicker, Button } from "antd";
import { ChartStateContext } from "../ChartStateContext";
import { useContext } from "react";
import {
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ArrowUpDown,
} from "lucide-react";

const BarChartControls = () => {
  const chartState = useContext(ChartStateContext);
  const { chartSpecificOptions } = chartState;

  const handleOptionChange = (key, value) => {
    chartState.updateChartSpecificOptions({ [key]: value }).render();
  };

  return (
    <div className="flex gap-4 text-xs">
      <div>
        <h3 className="mb-2">Bar Color</h3>
        <ColorPicker
          defaultValue={"#4287F5"}
          value={chartSpecificOptions.barColor}
          onChange={(color) =>
            handleOptionChange("barColor", color.toHexString())
          }
        />
      </div>
      {/* Add a sort button with three states: ascending, descending, and none */}
      <div>
        <h3 className="mb-2">Sort</h3>
        <Button
          icon={
            chartSpecificOptions.bar?.sort?.x === "y" ? (
              <ArrowUpNarrowWide className="rotate-[270deg] " />
            ) : chartSpecificOptions.bar?.sort?.x === "-y" ? (
              <ArrowDownWideNarrow className="rotate-[270deg] " />
            ) : (
              <ArrowUpDown />
            )
          }
          className={`${
            !chartSpecificOptions.bar?.sort?.x ? "text-gray-400" : ""
          } `}
          onClick={() => {
            const currentSort = chartSpecificOptions.bar?.sort?.x;
            if (!currentSort) {
              handleOptionChange("sort", { x: "y" });
            } else if (currentSort === "y") {
              handleOptionChange("sort", { x: "-y" });
            } else {
              handleOptionChange("sort", null);
            }
          }}
        />
      </div>
    </div>
  );
};

export default BarChartControls;
