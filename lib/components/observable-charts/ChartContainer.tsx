// apply styles from styles.css
import "./styles.css";

import { useState, useEffect, useMemo, useContext } from "react";
import { Segmented } from "antd";
import { ChartNoAxesCombined, SlidersHorizontal, Settings } from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import ObservablePlot from "./ObservablePlot";

import {
  ChartManager,
  ChartManagerContext,
  createChartManager,
} from "./ChartManagerContext";
import { MessageManagerContext, SkeletalLoader } from "@ui-components";
import setupBaseUrl from "../utils/setupBaseUrl";
import { AgentConfigContext } from "../context/AgentContext";
import { ParsedOutput } from "../agent/analysis/analysisManager";
import { twMerge } from "tailwind-merge";
import { KeyboardShortcutIndicator } from "../core-ui/KeyboardShortcutIndicator";
import { KEYMAP } from "../../constants/keymap";

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
          className="scale-75 opacity-75"
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

  const [activeSection, setActiveSection] = useState<
    "primary" | "customization"
  >("primary");

  const renderSectionContent = () => {
    const columns = chartConfig.availableColumns;

    return (
      <div className="space-y-4">
        {/* Chart type selection moved here, above the tabs */}
        <PrimarySelection columns={columns} showChartTypeOnly={true} />

        {/* Section toggle for General/Style */}
        <div>
          <Segmented
            block
            value={activeSection}
            onChange={(value) =>
              setActiveSection(value as "primary" | "customization")
            }
            rootClassName="pr-4 transition-none"
            options={[
              {
                label: (
                  <div className="flex items-center mt-[0.5px] justify-center gap-1.5 px-3 py-1">
                    <ChartNoAxesCombined className="text-current" size={14} />
                    <p className="font-sans text-xs font-semibold">General</p>
                  </div>
                ),
                value: "primary",
              },
              {
                label: (
                  <div className="flex items-center mt-[0.5px] justify-center gap-1.5 px-3 py-1">
                    <Settings className="text-current" size={14} />
                    <p className="font-sans text-xs">Style</p>
                  </div>
                ),
                value: "customization",
              },
            ]}
            className="
              [&_.ant-segmented-group]:gap-1
              [&_.ant-segmented-item]:rounded-none
            

              [&_.ant-segmented-item:hover]:border-gray-200
              [&_.ant-segmented-item:hover]:dark:border-gray-700
              [&_.ant-segmented-item-selected]:border-transparent
              [&_.ant-segmented-item-selected]:shadow-none
              [&_.ant-segmented-item-selected]:bg-gray-100 
              [&_.ant-segmented-item-selected]:dark:bg-gray-700
              [&_.ant-segmented-item]:text-gray-500 
              [&_.ant-segmented-item]:dark:text-gray-400
              [&_.ant-segmented-item-selected]:text-gray-900 
              [&_.ant-segmented-item-selected]:dark:text-gray-100
              [&_.ant-segmented-item-selected]:border
              [&_.ant-segmented-item-selected]:border-gray-200
               p-0.5 bg-transparent
            "
          />
        </div>

        {/* Section content */}
        <div className="pl-1 pr-4">
          {activeSection === "primary" ? (
            <PrimarySelection columns={columns} showChartTypeOnly={false} />
          ) : (
            <Customization />
          )}
        </div>
      </div>
    );
  };

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
                <div style={{ width: "350px" }}>{renderSectionContent()}</div>

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
