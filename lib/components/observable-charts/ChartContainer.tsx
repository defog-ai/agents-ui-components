// apply styles from styles.css
import "./styles.css";

import { useState, useEffect, useMemo, useContext } from "react";
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
import { QueryDataEmbedContext } from "../context/QueryDataEmbedContext";
import { OracleReportContext } from "@oracle";
import { ParsedOutput } from "../query-data/analysis/analysisManager";
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
          keyValue={KEYMAP.TOGGLE_CHART_OPTIONS}
          className="scale-75 opacity-75"
        />
      </div>
    </div>
  </button>
);

// NativeSegmented: a replacement for antd Segmented using native JS buttons
const NativeSegmented = ({
  block,
  value,
  onChange,
  options,
  className = "",
}) => {
  return (
    <div
      className={`flex ${block ? "w-full" : "inline-flex"} justify-center  rounded-md p-0.5 bg-gray-200 dark:bg-gray-800 ${className}`}
    >
      {options.map((opt, index) => (
        <button
          key={index}
          onClick={() => onChange(opt.value)}
          className={`
            flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px]
            text-xs font-medium transition-all duration-150 ease-in-out
            ${
              value === opt.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }
            ${index > 0 ? "ml-0.5" : ""}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export function ChartContainer({
  rows,
  columns,
  stepData,
  chartManager: providedChartManager,
  initialQuestion = null,
  initialOptionsExpanded = false,
}: {
  rows?: any[];
  columns?: any[];
  stepData?: ParsedOutput;
  chartManager?: ChartManager;
  initialQuestion: string | null;
  initialOptionsExpanded?: boolean;
}) {
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(
    initialOptionsExpanded
  );

  // Support multiple ways of providing chart manager:
  // 1. Direct chartManager prop (highest priority)
  // 2. Via stepData (from AnalysisAgent)
  // 3. Create new one from rows/columns (legacy support)
  const chartManager: ChartManager = useMemo(() => {
    if (providedChartManager) {
      return providedChartManager;
    } else if (stepData?.chartManager) {
      return stepData.chartManager;
    } else {
      return createChartManager({
        data: rows,
        availableColumns: columns,
      });
    }
  }, [providedChartManager, stepData, rows, columns]);

  const [chartConfig, setChartConfig] = useState(chartManager.config);

  useEffect(() => {
    chartManager.setConfigCallback = setChartConfig;
  }, []);

  const queryDataEmbedContext = useContext(QueryDataEmbedContext);
  const oracleReportContext = useContext(OracleReportContext);

  let { apiEndpoint, token } = queryDataEmbedContext;
  if (!token) {
    apiEndpoint = oracleReportContext.apiEndpoint;
    token = oracleReportContext.token;
  }

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const messageManager = useContext(MessageManagerContext);

  const { selectedColumns } = chartConfig;

  useEffect(() => {
    // Always send the edit chart request and let the function handle validation
    if (initialQuestion && !chartManager.config.loading) {
      chartManager.editChart(token, initialQuestion, chartEditUrl, {
        onError: (e) => {
          // Error handling is now done in the editChart function
          console.warn("Chart edit warning:", e?.message);
        },
      });
    } else if (!initialQuestion) {
      // If no question, just auto-select variables
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
        <div className="mr-4">
          <NativeSegmented
            block
            value={activeSection}
            onChange={(value) =>
              setActiveSection(value as "primary" | "customization")
            }
            className="transition-none"
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
              <div className="flex flex-col items-center justify-center w-full h-64">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative">
                    <SkeletalLoader chart={true} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-900 opacity-30"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-4 text-primary-highlight dark:text-blue-400">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-sm font-medium">Updating chart...</span>
                </div>
                <p className="text-xs text-center max-w-sm text-gray-500 dark:text-gray-400 mt-2">
                  Applying your changes and generating visualization
                </p>
              </div>
            ) : chartManager.config &&
              chartManager.config.data &&
              chartManager.config.data.length > 0 ? (
              <ObservablePlot />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-64 text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    No data to display
                  </span>
                </div>
                <p className="text-xs text-center max-w-sm">
                  Please ensure data is available and columns are selected for
                  visualization
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChartManagerContext.Provider>
  );
}

export default ChartContainer;
