import { useState, useEffect, useMemo, useContext } from "react";
import { Tabs } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import ObservablePlot from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";
import {
  ChartManager,
  ChartManagerContext,
  createChartManager,
} from "./ChartManagerContext";
import { MessageManagerContext, SpinningLoader } from "@ui-components";
import setupBaseUrl from "../utils/setupBaseUrl";
import { AgentConfigContext } from "../context/AgentContext";
import { ParsedOutput } from "../agent/analysis/analysisManager";
import { twMerge } from "tailwind-merge";

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
  const chartManager: ChartManager = useMemo(
    () =>
      stepData
        ? stepData?.chartManager
        : createChartManager({
            loading: true,
            data: rows,
            availableColumns: columns,
          }),
    [stepData, rows, columns]
  );

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
    if (initialQuestion) {
      chartManager.editChart(initialQuestion, chartEditUrl, {
        onError: (e) => {
          messageManager.error(e.message);
          console.error(e);
        },
      });
    } else {
      chartManager.autoSelectVariables().render();
    }
  }, [initialQuestion]);

  const tabItems = useMemo(() => {
    const columns = chartConfig.availableColumns;

    return [
      {
        key: "general",
        label: "General",
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <PrimarySelection columns={columns} />
          </TabPaneWrapper>
        ),
      },
      {
        key: "customize",
        label: "Customize",
        children: (
          <TabPaneWrapper className="overflow-x-hidden">
            <Customization />
          </TabPaneWrapper>
        ),
      },
    ];
  }, [selectedColumns]);

  return (
    <ChartManagerContext.Provider
      value={{ ...chartManager, config: chartConfig }}
    >
      <div className="relative">
        <div className="flex relative flex-row gap-3">
          <div
            className={twMerge(
              "relative h-full border-r min-w-[350px] max-w-[350px] chart-options-container",
              isOptionsExpanded ? "" : "min-w-0"
            )}
          >
            {isOptionsExpanded && (
              <>
                <Tabs
                  className="flex flex-col pl-0 h-full"
                  size="small"
                  items={tabItems}
                  tabBarStyle={{
                    margin: "2px 4px 2px 4px",
                    padding: "4px",
                    background: "#f0f0f0",
                    borderRadius: "3px",
                  }}
                  tabBarGutter={0}
                  tabPosition="top"
                  centered={true}
                  tabBarClassName="!border-0"
                  className="chart-tabs"
                />
                <style>
                  {`
                    .chart-tabs {
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                    }
                    .chart-tabs .ant-tabs-content-holder {
                      overflow-y: auto;
                      flex: 1;
                    }
                    .chart-tabs .ant-tabs-nav::before {
                      border: none !important;
                    }
                    .chart-tabs .ant-tabs-nav-list {
                      width: 100% !important;
                    }
                    .chart-tabs .ant-tabs-tab {
                      flex: 1 !important;
                      margin: 0 !important;
                      padding: 8px 16px !important;
                      border-radius: 3px !important;
                      transition: all 0.2s !important;
                      display: flex !important;
                      justify-content: center !important;
                      width: 50% !important;
                    }
                    .chart-tabs .ant-tabs-tab-active {
                      background: white !important;
                      box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                    }
                    .chart-tabs .ant-tabs-ink-bar {
                      display: none !important;
                    }
                  `}
                </style>
              </>
            )}
            <button
              onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow-sm"
            >
              {isOptionsExpanded ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>

          {chartConfig.loading ? (
            <div className="flex justify-center items-center w-full">
              <SpinningLoader classNames="ml-2 w-8 h-8 text-gray-400"></SpinningLoader>
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
