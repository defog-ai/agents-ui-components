import { useEffect, useMemo, useRef, useCallback } from "react";
import { Tabs, Button } from "antd";
import { ChartNoAxesCombined, SlidersHorizontal, Download } from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import { useChartContainer } from "./dashboardState";
import { ObservablePlot } from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";

export function ChartContainer({ columns, rows }) {
  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    data,
    setData,
  } = useChartContainer();
  const observablePlotRef = useRef(null);

  const filteredData = useMemo(() => {
    if (!rows || !selectedColumns.x) return [];

    const xColumn = columns.find((col) => col.key === selectedColumns.x);
    return rows.map((row) => ({
      [selectedColumns.x]:
        xColumn?.isDate && xColumn.dateToUnix
          ? xColumn.dateToUnix(row[selectedColumns.x])
          : row[selectedColumns.x],
      [selectedColumns.y]: row[selectedColumns.y],
    }));
  }, [rows, selectedColumns, columns]);

  useEffect(() => {
    setData(filteredData);
  }, [filteredData, setData]);

  const plotOptions = useMemo(() => {
    const xColumn = columns.find((col) => col.key === selectedColumns.x);
    return {
      type: selectedChart || "line",
      x: selectedColumns.x || null,
      y:
        selectedChart === "line"
          ? selectedColumns.y
          : selectedColumns.y || null,
      xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
      yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
      facet: selectedColumns.facet,
      xIsDate: xColumn?.isDate,
      dateToUnix: xColumn?.isDate ? xColumn.dateToUnix : null,
      ...chartStyle,
      ...chartSpecificOptions[selectedChart],
    };
  }, [
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    columns,
  ]);

  const handleSaveAsPNG = useCallback(() => {
    observablePlotRef.current?.saveAsPNG();
  }, []);

  const tabItems = useMemo(
    () => [
      {
        key: "1",
        label: <ChartNoAxesCombined size={24} />,
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <PrimarySelection columns={columns} />
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
    ],
    [columns]
  );

  return (
    <div className="flex flex-col h-full">
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
              data={data}
              options={plotOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartContainer;
