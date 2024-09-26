import { useState, useEffect, useMemo, useContext } from "react";
import { Tabs } from "antd";
import {
  ChartNoAxesCombined,
  SlidersHorizontal,
  FilterIcon,
} from "lucide-react";
import { PrimarySelection } from "./PrimarySelection";
import { Customization } from "./Customization";
import ObservablePlot from "./ObservablePlot";
import TabPaneWrapper from "./utils/TabPaneWrapper";
import FilterBuilder from "./Filtering";
import { ChartStateContext, createChartState } from "./ChartStateContext";
import { Input, MessageManagerContext } from "@ui-components";
import setupBaseUrl from "../utils/setupBaseUrl";
import { AgentConfigContext } from "../context/AgentContext";

export function ChartContainer({ columns, rows }) {
  const [chartState, setChartState] = useState(
    createChartState({ data: rows, availableColumns: columns })
  );

  chartState.setStateCallback = setChartState;

  const agentConfigContext = useContext(AgentConfigContext);
  const { apiEndpoint } = agentConfigContext.val;

  const chartEditUrl = setupBaseUrl({
    protocol: "http",
    path: "edit_chart",
    apiEndpoint: apiEndpoint,
  });

  const messageManager = useContext(MessageManagerContext);

  const { selectedColumns } = chartState;

  const [userQuestion, setUserQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  // if rows or columns change, update the chart state
  useEffect(() => {
    setChartState((prev) => {
      const newState = {
        ...prev,
        data: rows,
        availableColumns: columns,
        setStateCallback: setChartState,
      }.autoSelectVariables();

      return newState;
    });
  }, [rows, columns]);

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
                Object.values(selectedColumns || {}).includes(col.key)
              )}
            />
          </TabPaneWrapper>
        ),
      },
    ],
    [selectedColumns, columns]
  );

  return (
    <ChartStateContext.Provider value={{ ...chartState, setChartState }}>
      <div className="relative">
        <Input
          type="text"
          rootClassNames="w-full mb-6 p-2 rounded"
          label="Ask a question to edit the visualization"
          onChange={(e) => setUserQuestion(e.target.value)}
          disabled={loading}
          onPressEnter={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
              setLoading(true);

              if (!userQuestion || userQuestion === "") {
                throw new Error("Please enter a question");
              }

              const res = await fetch(chartEditUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_request: userQuestion,
                  // we only want to send non function properties
                  current_chart_state: chartState.clone([
                    "data",
                    "availableColumns",
                  ]),
                  columns: chartState.availableColumns.map((col) => ({
                    title: col.title,
                    col_type: col.colType,
                  })),
                }),
              }).then((res) => res.json());

              if (!res.success) {
                throw new Error(res.error_message || "Failed to edit chart");
              }

              const chartStateEdits = res["chart_state_edits"];

              chartState.mergeStateUpdates(chartStateEdits).render();
            } catch (e) {
              messageManager.error(e.message);
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
        />

        <div className="flex flex-row gap-3">
          <div className="min-w-[350px] max-w-[350px] h-full border-r">
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
          <ObservablePlot />
        </div>
      </div>
    </ChartStateContext.Provider>
  );
}

export default ChartContainer;
