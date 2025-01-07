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
import { ChartStateContext } from "./ChartStateContext";
import { Input, MessageManagerContext, SpinningLoader } from "@ui-components";
import setupBaseUrl from "../utils/setupBaseUrl";
import { AgentConfigContext } from "../context/AgentContext";
import { ParsedOutput } from "../agent/analysis/analysisManager";
import { twMerge } from "tailwind-merge";

export function ChartContainer({
  stepData,
  initialQuestion = null,
  initialOptionsExpanded = true,
}: {
  stepData: ParsedOutput;
  initialQuestion: string | null;
  initialOptionsExpanded?: boolean;
}) {
  const [chartState, setChartState] = useState(stepData.chartState);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(
    initialOptionsExpanded
  );

  useEffect(() => {
    chartState.setStateCallback = setChartState;
  }, []);

  const agentConfigContext = useContext(AgentConfigContext);
  const { apiEndpoint } = agentConfigContext.val;

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const messageManager = useContext(MessageManagerContext);

  const { selectedColumns } = chartState;

  useEffect(() => {
    if (initialQuestion) {
      chartState.editChart(initialQuestion, chartEditUrl, {
        onError: (e) => {
          messageManager.error(e.message);
          console.error(e);
        },
      });
    }
  }, [initialQuestion]);

  useEffect(() => {
    setChartState(stepData.chartState);
  }, [stepData.chartState]);

  const tabItems = useMemo(() => {
    const columns = chartState.availableColumns;

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
    <ChartStateContext.Provider value={{ ...chartState, setChartState }}>
      <div className="relative">
        <div className="flex flex-row gap-3 relative">
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

          {chartState.loading ? (
            <div className="w-full flex items-center justify-center">
              <SpinningLoader classNames="ml-2 w-8 h-8 text-gray-400"></SpinningLoader>
            </div>
          ) : (
            <ObservablePlot />
          )}
        </div>
      </div>
    </ChartStateContext.Provider>
  );
}

export default ChartContainer;
