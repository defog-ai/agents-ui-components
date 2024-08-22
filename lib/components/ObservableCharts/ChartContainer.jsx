import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, Button } from "antd";
import {
  ChartNoAxesCombined,
  SlidersHorizontal,
  Download,
  FilterIcon,
} from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import { useChartContainer } from "./dashboardState";
import { ObservablePlot } from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";
import FilterBuilder from "./Filtering";

export function ChartContainer({ columns, rows }) {
  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    setData,
    setSelectedChart,
    setSelectedColumns,
  } = useChartContainer();
  const observablePlotRef = useRef(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  // if rows have changed, update the data with `setData`
  useEffect(() => {
    setData(rows);
  }, [rows]);

  const xColumn = columns.find((col) => col.key === selectedColumns.x);
  const [plotOptions, setPlotOptions] = useState({
  // const plotOptions = {
    type: selectedChart || "Bar",
    x: selectedColumns.x || null,
    y: selectedColumns.y || null,
    xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
    yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
    facet: selectedColumns.facet,
    fill: selectedColumns.fill,
    filter: selectedColumns.filter,
    stroke: selectedColumns.stroke,
    xIsDate: xColumn?.isDate,
    dateToUnix: xColumn?.isDate ? xColumn.dateToUnix : null,
    xKey: selectedColumns.x,
    yKey: selectedColumns.y,
    ...chartStyle,
    ...chartSpecificOptions[selectedChart],
  // }
  });

  const handleSaveAsPNG = useCallback(() => {
    if (observablePlotRef.current) {
      observablePlotRef.current.saveAsPNG();
    }
  }, []);

  // useEffect(() => {
  //   setPlotOptions((prev) => ({
  //     ...prev,
  //     type: selectedChart || "Bar",
  //     x: selectedColumns.x,
  //     y: selectedColumns.y,
  //     xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
  //     yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
  //     facet: selectedColumns.facet,
  //     fill: selectedColumns.fill,
  //     stroke: selectedColumns.stroke,
  //     ...chartSpecificOptions[selectedChart],
  //   }));
  // }, [selectedChart, JSON.stringify(selectedColumns), JSON.stringify(chartStyle), JSON.stringify(chartSpecificOptions)]);

  const tabItems = [
    {
      key: "1",
      label: <ChartNoAxesCombined size={24} />,
      children: (
        <TabPaneWrapper className="overflow-x-hidden">
          <PrimarySelection
            columns={columns}
            propSelectedChart={plotOptions.type}
            propSelectedColumns={{x: plotOptions.x, y: plotOptions.y, fill: plotOptions.fill}}
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
              Object.values(selectedColumns).includes(col.key)
            )}
          />
        </TabPaneWrapper>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center items-center p-4 bg-white">
        {/* textbox where users can ask a question */}
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Ask a question to create a visualization"
          value={userQuestion}
          onChange={(e) => setUserQuestion(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (userQuestion === "Create a dotplot of plasticity vs lot_id") {
                
                setLoading(true);
                setTimeout(() => {
                  setPlotOptions({
                    ...plotOptions,
                    type: "scatter",
                    x: "lot_id",
                    y: "plasticity",
                  });
                  setLoading(false);
                }, 2205);
              } else if (
                userQuestion === "color the rejected items in a different color"
              ) {
                setLoading(true);
                setTimeout(() => {
                  setPlotOptions({
                    ...plotOptions,
                    fill: "qc_approved",
                  });
                  setLoading(false);
                }, 1230);
              } else if (
                userQuestion === "Can you change the theme and make the rejected items in red?"
              ) {
                setLoading(true);
                setTimeout(() => {
                  setPlotOptions({
                    ...plotOptions,
                    scheme: "set1",
                  });
                  setLoading(false);
                }, 1940);
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
        <div className="flex-grow p-4 bg-white">
          <div className="flex justify-end mb-2">
            <Button icon={<Download size={16} />} onClick={handleSaveAsPNG}>
              Save as PNG
            </Button>
          </div>
          <div style={{ width: "100%", height: "460px" }}>
            <ObservablePlot
              ref={observablePlotRef}
              data={rows}
              options={plotOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartContainer;
