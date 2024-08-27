import { useState, useEffect, useMemo } from "react";
import { Tabs } from "antd";
import {
  ChartNoAxesCombined,
  SlidersHorizontal,
  FilterIcon,
} from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import ObservablePlot from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";
import FilterBuilder from "./Filtering";
import { ChartStateContext, createChartState } from "./ChartStateContext";

export function ChartContainer({ columns, rows }) {
  const [chartState, setChartState] = useState(
    createChartState({ data: rows, availableColumns: columns })
  );

  console.log(chartState);

  const { selectedChart, selectedColumns } = chartState;

  const [userQuestion, setUserQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  // if rows or columns change, update the chart state
  useEffect(() => {
    setChartState((prev) => ({
      ...prev,
      data: rows,
      availableColumns: columns,
      setStateCallback: setChartState,
    }));
  }, [rows, columns]);

  const tabItems = useMemo(
    () => [
      {
        key: "1",
        label: <ChartNoAxesCombined size={24} />,
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <PrimarySelection
              columns={columns}
              propSelectedChart={selectedChart || "Bar"}
              propSelectedColumns={{
                x: selectedColumns && selectedColumns.x,
                y: selectedColumns && selectedColumns.y,
                fill: selectedColumns && selectedColumns.fill,
              }}
            />
          </TabPaneWrapper>
        ),
      },
      {
        key: "2",
        label: <SlidersHorizontal size={24} />,
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <Customization />
          </TabPaneWrapper>
        ),
      },
      {
        key: "3",
        label: <FilterIcon size={24} />,
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <FilterBuilder
              columns={columns.filter((col) =>
                Object.values(selectedColumns || {}).includes(col.key)
              )}
            />
          </TabPaneWrapper>
        ),
      },
    ],
    [selectedChart, selectedColumns, columns]
  );

  return (
    <ChartStateContext.Provider value={{ ...chartState, setChartState }}>
      <div className="flex flex-col h-full">
        <div className="flex justify-center items-center p-4 bg-white">
          {/* textbox where users can ask a question */}
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ask a question to create a visualization"
            value={userQuestion || undefined}
            onChange={(e) => setUserQuestion(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (
                  userQuestion === "Create a dotplot of plasticity vs lot_id"
                ) {
                  setLoading(true);
                  // setTimeout(() => {
                  //   setPlotOptions({
                  //     ...plotOptions,
                  //     type: "scatter",
                  //     x: "lot_id",
                  //     y: "plasticity",
                  //   });
                  //   setLoading(false);
                  // }, 2205);
                } else if (
                  userQuestion ===
                  "color the rejected items in a different color"
                ) {
                  setLoading(true);
                  // setTimeout(() => {
                  //   setPlotOptions({
                  //     ...plotOptions,
                  //     fill: "qc_approved",
                  //   });
                  //   setLoading(false);
                  // }, 1230);
                } else if (
                  userQuestion ===
                  "Can you change the theme and make the rejected items in red?"
                ) {
                  setLoading(true);
                  // setTimeout(() => {
                  //   setPlotOptions({
                  //     ...plotOptions,
                  //     scheme: "set1",
                  //   });
                  //   setLoading(false);
                  // }, 1940);
                }
              }
            }}
          />
        </div>
        <div className="flex flex-grow gap-3">
          <div className="w-2/3 max-w-[350px] h-full border-r">
            <Tabs
              tabPosition="left"
              className="h-full pl-0"
              size="small"
              tabBarStyle={{
                width: "60px",
                height: "100%",
                display: "flex",
                paddingLeft: "0px !important",
                marginLeft: "-20px",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              items={tabItems}
            />
          </div>
          <ObservablePlot />
        </div>
      </div>
    </ChartStateContext.Provider>
  );
}

export default ChartContainer;
