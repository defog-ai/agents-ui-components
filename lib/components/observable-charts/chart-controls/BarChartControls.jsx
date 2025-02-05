import { ColorPicker, Button } from "@ui-components";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";
import {
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ArrowUpDown,
} from "lucide-react";

const BarChartControls = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartSpecificOptions, selectedColumns } = chartManager.config;

  const handleOptionChange = (key, value) => {
    chartManager.updateChartSpecificOptions({ [key]: value }).render();
  };

  // Handle changes for individual bar options
  const handleBarOptionChange = (column, key, value) => {
    const updatedBarOptions = {
      ...(chartSpecificOptions.bar.barOptions || {}),
    };

    updatedBarOptions[column] = {
      ...updatedBarOptions[column],
      [key]: value,
    };

    chartManager
      .updateChartSpecificOptions({ barOptions: updatedBarOptions })
      .render();
  };

  // Render controls for individual bars
  const renderIndividualBarControls = () =>
    Array.isArray(selectedColumns.y) &&
    selectedColumns.y.map((column) => {
      return (
        <div key={column} className="">
          <h4 className="mb-2 font-bold">{`${column}`}</h4>
          <div className="mb-2">
            <ColorPicker
              disabledAlpha={true}
              allowClear={true}
              value={
                chartSpecificOptions.bar?.barOptions?.[column]?.fill ||
                "#4e79a7"
              }
              onChange={(color) =>
                handleBarOptionChange(
                  column,
                  "fill",
                  color.cleared ? null : color.toHexString()
                )
              }
            />
          </div>
        </div>
      );
    });

  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="flex flex-col gap-2">
        <span className="block mb-1">Bar color</span>
        <div className="flex flex-row flex-wrap gap-4">
          {renderIndividualBarControls()}
        </div>
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
