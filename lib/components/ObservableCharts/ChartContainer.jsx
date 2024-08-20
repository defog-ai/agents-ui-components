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

  // Memoized filtered data
  // Memoized filtered and processed data
  const filteredData = useMemo(() => {
    if (!rows || !selectedColumns.x) return [];

    const xColumn = columns.find((col) => col.key === selectedColumns.x);
    const yColumn = columns.find((col) => col.key === selectedColumns.y);

    return rows.map((row) => {
      const baseData = {};

      // Process X column
      if (xColumn && xColumn.isDate && xColumn.dateToUnix) {
        baseData[selectedColumns.x] = xColumn.dateToUnix(
          row[selectedColumns.x]
        );
      } else {
        baseData[selectedColumns.x] = row[selectedColumns.x];
      }

      // Process Y column(s)
      if (selectedChart === "line" && Array.isArray(selectedColumns.y)) {
        selectedColumns.y.forEach((key) => {
          const col = columns.find((c) => c.key === key);
          if (col && col.isDate && col.dateToUnix) {
            baseData[key] = col.dateToUnix(row[key]);
          } else {
            baseData[key] = row[key];
          }
        });
      } else {
        if (yColumn && yColumn.isDate && yColumn.dateToUnix) {
          baseData[selectedColumns.y] = yColumn.dateToUnix(
            row[selectedColumns.y]
          );
        } else {
          baseData[selectedColumns.y] = row[selectedColumns.y];
        }
      }

      // Process facet column if exists
      if (selectedColumns.facet) {
        const facetColumn = columns.find(
          (col) => col.key === selectedColumns.facet
        );
        if (facetColumn && facetColumn.isDate && facetColumn.dateToUnix) {
          baseData[selectedColumns.facet] = facetColumn.dateToUnix(
            row[selectedColumns.facet]
          );
        } else {
          baseData[selectedColumns.facet] = row[selectedColumns.facet];
        }
      }

      return baseData;
    });
  }, [rows, selectedColumns, selectedChart, columns]);
  // Effect to update data state
  useEffect(() => {
    setData(filteredData);
  }, [filteredData, setData]);

  // Memoized plot options
  const plotOptions = useMemo(() => {
    const xColumn = columns.find((col) => col.key === selectedColumns.x);
    const yColumn = columns.find((col) => col.key === selectedColumns.y);
    console.log("xColumn", xColumn);
    console.log("yColumn", yColumn);
    return {
      type: selectedChart || "line",
      x: selectedColumns.x || null,
      y:
        selectedChart === "line"
          ? selectedColumns.y
          : selectedColumns.y || null,
      xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
      yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
      yAxisUnitLabel: chartStyle.yAxisUnitLabel,
      yAxisUnitPosition: chartStyle.yAxisUnitPosition,
      backgroundColor: chartStyle.backgroundColor,
      fontSize: chartStyle.fontSize,
      title: chartStyle.title,
      xGrid: chartStyle.xGrid,
      yGrid: chartStyle.yGrid,
      xTicks: chartStyle.xTicks,
      yTicks: chartStyle.yTicks,
      margin: chartStyle.margin,
      facet: selectedColumns.facet,
      xIsDate: xColumn?.isDate,
      xDateFormat: chartStyle.xDateFormat,
      dateToUnix: xColumn?.isDate ? xColumn.dateToUnix : null,

      ...(chartSpecificOptions[selectedChart] || {}),
    };
  }, [
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    columns,
  ]);

  // Memoized handler for saving the chart as PNG
  const handleSaveAsPNG = useCallback(() => {
    if (observablePlotRef.current) {
      observablePlotRef.current.saveAsPNG();
    }
  }, []);

  // Custom styles for the tabs
  const tabBarStyle = {
    width: "60px",
    height: "100%",
    display: "flex",
    paddingLeft: "0px !important",
    marginLeft: "-20px",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  // Memoized tab items
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
        {/* Left sidebar with tabs for chart selection and customization */}
        <div className="w-2/3 max-w-[350px] h-full border-r">
          <Tabs
            tabPosition="left"
            className="h-full pl-0"
            size="small"
            tabBarStyle={tabBarStyle}
            items={tabItems}
          />
        </div>
        {/* Main chart display area */}
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
