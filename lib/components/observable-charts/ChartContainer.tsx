// apply styles from styles.css
import "./styles.css";

import { useState, useEffect, useMemo, useContext } from "react";
import { Tabs } from "antd";
import {
  ChartNoAxesCombined,
  SlidersHorizontal,
  FilterIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import ObservablePlot from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";
import FilterBuilder from "./Filtering";
import {
  ChartManager,
  ChartManagerContext,
  createChartManager,
} from "./ChartManagerContext";
import {
  MessageManagerContext,
  SkeletalLoader,
  SpinningLoader,
} from "@ui-components";
import setupBaseUrl from "../utils/setupBaseUrl";
import { AgentConfigContext } from "../context/AgentContext";
import { ParsedOutput } from "../agent/analysis/analysisManager";
import { twMerge } from "tailwind-merge";

// Add this new component at the top level, before ChartContainer
const ChartOptionsHandle = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className={`
      absolute -right-8 top-[50%] -translate-y-[50%]
      h-36 w-8 flex items-center justify-center
      bg-[#F9FAFB] dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      hover:bg-gray-50 dark:hover:bg-gray-700
      transition-colors rounded-r
    `}
    title={`${isOpen ? "Collapse" : "Expand"} chart options`}
  >
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 vertical-text">
        <SlidersHorizontal className="size-5" />
      </span>
    </div>
  </button>
);

export function ChartContainer({
  rows,
  columns,
  stepData,
  initialQuestion = null,
  initialOptionsExpanded = false,
}: {
  rows?: any[];
  columns?: any[];
  stepData?: ParsedOutput;
  initialQuestion: string | null;
  initialOptionsExpanded?: boolean;
}) {
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(
    initialOptionsExpanded
  );

  // support for oracle: if chart manager is not provided, we will create using rows and columns passed
  const chartManager: ChartManager = useMemo(() => {
    return stepData
      ? stepData?.chartManager
      : createChartManager({
          data: rows,
          availableColumns: columns,
        });
  }, [stepData, rows, columns]);

  const [chartConfig, setChartConfig] = useState(chartManager.config);

  useEffect(() => {
    chartManager.setConfigCallback = setChartConfig;
  }, []);

  const agentConfigContext = useContext(AgentConfigContext);
  const { apiEndpoint } = agentConfigContext.val;

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const messageManager = useContext(MessageManagerContext);

  const { selectedColumns } = chartConfig;

  useEffect(() => {
    // don't send request while chart is already loading
    if (initialQuestion && !chartManager.config.loading) {
      chartManager.editChart(initialQuestion, chartEditUrl, {
        onError: (e) => {
          messageManager.error(e.message);
          console.error(e);
        },
      });
    } else {
      chartManager.autoSelectVariables().render();
    }
  }, []);

  const tabItems = useMemo(() => {
    const columns = chartConfig.availableColumns;

    return [
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
        children: columns ? (
          <TabPaneWrapper className="overflow-x-hidden">
            <FilterBuilder
              columns={columns.filter((col) =>
                Object.values(selectedColumns || {}).includes(col.key)
              )}
            />
          </TabPaneWrapper>
        ) : null,
      },
    ];
  }, [selectedColumns]);

  return (
    <ChartManagerContext.Provider
      value={Object.assign(chartManager, { config: chartConfig })}
    >
      <div className="relative">
        <div className="relative flex flex-row gap-3">
          <div
            className={`
              relative border-r border-gray-200 dark:border-gray-700
              transition-all duration-200
              ${isOptionsExpanded ? "w-[350px]" : "w-[0%]"}
            `}
          >
            {/* Handle positioned outside the main container */}
            <ChartOptionsHandle
              isOpen={isOptionsExpanded}
              onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
            />

            {/* Content container with overflow handling */}
            <div
              className={`
                transition-all duration-200 relative
                overflow-x-hidden
                ${isOptionsExpanded ? "pr-8 pl-4" : "pr-8 pl-0"}
              `}
            >
              {/* Fixed width wrapper */}
              <div style={{ width: "350px" }}>
                {isOptionsExpanded && (
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
                )}
              </div>

              {/* Fade overlay when collapsed */}
              <div
                className={`
                  absolute inset-y-0 left-0 w-24
                  transition-opacity duration-200
                  ${isOptionsExpanded ? "opacity-0 pointer-events-none" : "opacity-100"}
                  bg-gradient-to-l from-transparent 
                  via-white/50 to-white
                  dark:via-gray-800/50 dark:to-gray-800
                `}
              />
            </div>
          </div>

          {chartConfig.loading ? (
            <div className="flex items-center justify-center w-full pt-10">
              <SkeletalLoader chart={true} />
            </div>
          ) : (
            <ObservablePlot />
          )}
        </div>
      </div>
    </ChartManagerContext.Provider>
  );
}

export default ChartContainer;
