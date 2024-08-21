import { useEffect, useMemo, useRef, useCallback } from "react";
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
    availableColumns,
  } = useChartContainer();
  const observablePlotRef = useRef(null);

  useEffect(() => {
    setData(rows);
  }, [rows, setData]);

  const plotOptions = useMemo(() => {
    const xColumn = columns.find((col) => col.key === selectedColumns.x);

    return {
      type: selectedChart || "line",
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
    ],
    [columns, selectedColumns]
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
