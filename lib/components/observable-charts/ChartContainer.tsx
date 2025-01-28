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
    console.log(chartConfig);

    console.log(initialQuestion, chartManager.config.loading);
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
            className={twMerge(
              "relative min-w-[350px] max-w-[350px] h-full border-r chart-options-container",
              isOptionsExpanded ? "" : "min-w-0"
            )}
          >
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

            <span
              onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
              className={twMerge(
                "text-gray-400 underline cursor-pointer flex items-center text-xs font-medium absolute top-0 z-10",
                isOptionsExpanded ? "right-3" : "left-0"
              )}
            >
              {isOptionsExpanded ? (
                <>
                  <ChevronLeft size={16} />
                  <span>Hide Options</span>
                </>
              ) : (
                <>
                  <ChevronRight size={16} />
                  <span>Customize Chart</span>
                </>
              )}
            </span>
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
