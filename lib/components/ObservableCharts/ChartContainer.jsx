import { useEffect, useMemo, useRef } from "react";
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

  // Effect to filter and format data based on selected columns and chart type
  useEffect(() => {
    if (!rows || !selectedColumns.x) return;

    const filteredData = rows.map((row) => {
      const baseData = {
        [selectedColumns.x]: row[selectedColumns.x],
      };

      if (selectedChart === "line" && Array.isArray(selectedColumns.y)) {
        selectedColumns.y.forEach((key) => (baseData[key] = row[key]));
      } else {
        baseData[selectedColumns.y] = row[selectedColumns.y];
      }

      if (selectedColumns.facet) {
        baseData[selectedColumns.facet] = row[selectedColumns.facet];
      }

      return baseData;
    });

    setData(filteredData);
  }, [rows, selectedColumns, selectedChart, setData]);

  // Memoized plot options based on selected chart settings
  const plotOptions = useMemo(
    () => ({
      type: selectedChart || "line",
      x: selectedColumns.x || "x",
      y:
        selectedChart === "line" ? selectedColumns.y : selectedColumns.y || "y",
      xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
      yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
      yAxisUnitLabel: chartStyle.yAxisUnitLabel,
      yAxisUnitPosition: chartStyle.yAxisUnitPosition,
      backgroundColor: chartStyle.backgroundColor,
      fontSize: chartStyle.fontSize,
      title: chartStyle.title,
      margin: chartStyle.margin,
      facet: selectedColumns.facet,
      ...(chartSpecificOptions[selectedChart] || {}),
    }),
    [selectedChart, selectedColumns, chartStyle, chartSpecificOptions]
  );

  // Handler for saving the chart as PNG
  const handleSaveAsPNG = () => {
    if (observablePlotRef.current) {
      observablePlotRef.current.saveAsPNG();
    }
  };

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

  // Define items for Tabs
  const tabItems = [
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
  ];

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
