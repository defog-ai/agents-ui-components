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
import { KeyboardShortcutIndicator } from "../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../constants/keymap";

// Add this new component at the top level, before ChartContainer
const ChartOptionsHandle = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className={`
      absolute -right-8 top-[50%] -translate-y-[50%]
      h-36 w-8 flex items-center justify-center group
      bg-[#F9FAFB] dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700
      hover:bg-gray-50 dark:hover:bg-gray-700
      transition-colors rounded-r
       z-10
    `}
    title={`${isOpen ? "Collapse" : "Expand"} chart options (${KEYMAP.TOGGLE_CHART_OPTIONS})`}
  >
    <div className="relative flex flex-col h-full">
      {/* Center the icon */}
      <div className="flex items-center justify-center flex-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <SlidersHorizontal className="size-5" />
        </span>
      </div>

      {/* Bottom-aligned shortcut */}
      <div className="absolute -translate-x-1/2 bottom-2 left-1/2">
        <KeyboardShortcutIndicator
          shortcut={KEYMAP.TOGGLE_CHART_OPTIONS}
          className="scale-75 opacity-0 group-hover:opacity-50"
        />
      </div>
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

  // Fix keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement === document.body) {
        if (e.key === KEYMAP.TOGGLE_CHART_OPTIONS) {
          // Direct key comparison
          setIsOptionsExpanded((prev) => !prev);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
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
          {/* Options Panel Container */}
          <div className="relative flex">
            {/* Options Panel Content */}
            <div
              className={`
                relative border-r border-gray-200 dark:border-gray-700
                transition-all duration-200 overflow-hidden
                ${isOptionsExpanded ? "w-[350px]" : "w-[0px]"}
              `}
            >
              {/* Content container */}
              <div
                className={`
                  transition-all duration-200 relative
                  overflow-x-hidden h-full
                  ${isOptionsExpanded ? "pr-4" : "pr-0"}
                `}
              >
                {/* Fixed width wrapper */}
                <div style={{ width: "350px" }}>
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

            {/* Handle positioned relative to the panel */}
            <ChartOptionsHandle
              isOpen={isOptionsExpanded}
              onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
            />
          </div>

          {/* Chart Content */}
          <div
            className={`
              transition-all duration-200 flex-1
              ${isOptionsExpanded ? "w-[calc(100%-350px)]" : "w-full"}
            `}
          >
            {chartConfig.loading ? (
              <div className="flex items-center justify-center w-full pt-10">
                <SkeletalLoader chart={true} />
              </div>
            ) : (
              <ObservablePlot />
            )}
          </div>
        </div>
      </div>
    </ChartManagerContext.Provider>
  );
}

export default ChartContainer;
