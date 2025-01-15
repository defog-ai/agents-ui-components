// @ts-nocheck
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { Tabs, message, Popover } from "antd";
import { chartNames, roundColumns } from "../../agentUtils";

import { Download, ChartBarIcon, Copy, TableIcon } from "lucide-react";
import ErrorBoundary from "../../../common/ErrorBoundary";
import ChartImage from "./ChartImage";

import Editor from "react-simple-code-editor";
// @ts-ignore
import { highlight, languages } from "prismjs/components/prism-core";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";

import "prismjs/themes/prism.css";
import { roundNumber } from "../../../utils/utils";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { Button, Table } from "@ui-components";
import { ChartContainer } from "../../../observable-charts/ChartContainer";

import type { ParsedOutput, Step } from "../analysisManager";
import type { AnalysisTreeManager } from "../../analysis-tree-viewer/analysisTreeManager";

// tabBarLeftContent: extra content for the tab bar on the left side
export function StepResultsTable({
  stepId,
  keyName,
  analysisId,
  nodeName,
  apiEndpoint,
  stepData = null,
  codeStr = null,
  sql = null,
  chartImages = null,
  initialQuestion = null,
  handleEdit = (...args) => {},
  analysisTreeManager = null,
}: {
  stepId: string;
  keyName: string;
  analysisId: string;
  nodeName: string;
  apiEndpoint: string;
  stepData?: ParsedOutput | null;
  codeStr?: string | null;
  sql?: string | null;
  chartImages?: any;
  initialQuestion: string | null;
  handleEdit?: (...args: any) => void;
  analysisTreeManager?: AnalysisTreeManager;
}) {
  const downloadCsvEndpoint = setupBaseUrl({
    protocol: "http",
    path: "download_csv",
    apiEndpoint: apiEndpoint,
  });
  const tableChartRef = useRef(null);
  const [sqlQuery, setSqlQuery] = useState(sql);
  const [toolCode, setToolCode] = useState(codeStr);
  const [csvLoading, setCsvLoading] = useState(false);

  async function saveCsv() {
    if (csvLoading) return;

    let csv = "";
    try {
      // tableData: {columns: Array(4), data: Array(1)}
      const tableData = stepData?.data;
      if (!tableData) return;
      const { columns, data } = tableData;

      // if data has >= 1000 rows, it might have been truncated
      // in this case, send a request to the server to get the full data
      // we will send the tool run id and also the output_storage_key we need to download
      if (data.length >= 1000) {
        setCsvLoading(true);

        const res = await fetch(downloadCsvEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step_id: stepId,
            output_storage_key: nodeName,
            analysis_id: analysisId,
            key_name: keyName,
          }),
        }).then((r) => r.json());

        if (!res?.success) {
          message.error(res?.error_message || "Error saving CSV.");
          return;
        } else if (res?.success && res?.csv) {
          csv = res.csv;
        }
      } else {
        const filteredColumns = columns.filter((d) => d.title !== "index");
        // Use columns to append to a string
        csv = filteredColumns.map((d) => d.title).join(",") + "\n";
        // Use data to append to a string
        // go through each row and each column and append to csv
        for (let i = 0; i < data.length; i++) {
          let row = data[i];
          for (let j = 0; j < filteredColumns.length; j++) {
            csv += row[filteredColumns[j].title];
            if (j < filteredColumns.length - 1) csv += ",";
          }
          csv += "\n";
        }
      }

      // Create a blob and download it
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // name with time stamp but without miliseconds

      a.download = `${nodeName}-${new Date().toISOString().split(".")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      // delete a tag
      a.remove();
      message.success("CSV saved.");
    } catch (e) {
      console.error(e);
      message.error("Error saving CSV.");
    } finally {
      setCsvLoading(false);
    }
  }

  const activeTab = useSyncExternalStore(
    (l) => analysisTreeManager.subscribeToActiveTabChanges(analysisId, l),
    () => analysisTreeManager.getActiveTab(analysisId)
  );

  const updateCodeAndSql = (
    updateProp: string | null = null,
    newVal: string
  ) => {
    // update values of the code and the SQL
    if (updateProp !== "sql" && updateProp !== "code") return;
    if (!stepId) return;
    if (!newVal) return;

    if (updateProp === "sql") {
      setSqlQuery(newVal);
    }
    if (updateProp === "code") {
      setToolCode(newVal);
    }
    handleEdit({
      step_id: stepId,
      update_prop: updateProp,
      new_val: newVal,
    });
  };

  useEffect(() => {
    setSqlQuery(sql);
    setToolCode(codeStr);
  }, [sql, codeStr]);

  const [results, setResults] = useState<any>([]);

  useEffect(() => {
    // extra tabs should be an array and all elements should be jsx components
    let tabs = [];
    const tableData = stepData?.data;
    if (tableData) {
      const roundedData = roundColumns(tableData.data, tableData.columns);

      // find which dataset is the current node
      tabs.push({
        component: (
          <Table
            rows={roundedData}
            // don't show index column in table
            columns={tableData.columns
              .filter((d) => d.title !== "index")
              .map((d) => {
                d.render = (text: string) => {
                  // popover with a copy button
                  return (
                    <Popover
                      content={() => (
                        <div
                          style={{
                            padding: 8,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            navigator.clipboard.writeText(text).then(() => {
                              message.success("Copied to clipboard.");
                            });
                          }}
                        >
                          <Copy className="w-3 h-3 table-chart-cell-copy-icon" />
                        </div>
                      )}
                      arrow={false}
                      placement="right"
                      rootClassName="table-chart-cell-copy-popover"
                    >
                      <div style={{ padding: 8 }}>{text}</div>
                    </Popover>
                  );
                };
                return d;
              })}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          />
        ),
        key: "table",
        tabLabel: "Table",
        icon: <TableIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
      });
    }

    if (!chartImages || chartImages.length <= 0) {
      if (stepData) {
        tabs.push({
          component: (
            <ErrorBoundary>
              <ChartContainer
                stepData={stepData}
                initialQuestion={initialQuestion}
              />
            </ErrorBoundary>
          ),
          tabLabel: "Chart",
          key: "chart",
          icon: <ChartBarIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
        });
      }
    } else {
      // if chartImagePath is present, load the image of the chart instead
      tabs.push({
        component: (
          <ErrorBoundary>
            <ChartImage apiEndpoint={apiEndpoint} images={chartImages} />
          </ErrorBoundary>
        ),
        key: "chart",
        tabLabel: chartNames[chartImages[0].type] || "Chart",
      });
    }

    if (toolCode !== null) {
      // show the codeStr query
      tabs.push({
        component: (
          <ErrorBoundary>
            <>
              <p>The following code was run:</p>
              <Editor
                className="language-python table-code-ctr"
                value={toolCode}
                highlight={(code) => {
                  return highlight(code, languages.python, "python");
                }}
                onValueChange={(newVal) => updateCodeAndSql("code", newVal)}
              />
            </>
          </ErrorBoundary>
        ),
        tabLabel: "Code",
      });
    }

    // convert to antd tabs
    tabs = (
      <Tabs
        tabBarExtraContent={{
          right: (
            <Button
              onClick={async () => {
                await saveCsv();
              }}
              title="Download CSV"
              disabled={csvLoading}
              variant="primary"
            >
              Download CSV <Download className="w-4 h-4" />
            </Button>
          ),
        }}
        activeKey={activeTab}
        onChange={(key) => {
          analysisTreeManager.setActiveTab(analysisId, key);
        }}
        items={tabs.map((d, i) => ({
          key: d.key,
          label: (
            <span>
              {d.icon ? d.icon : null}
              {d.tabLabel ? d.tabLabel : `Tab-${i}`}
            </span>
          ),
          children: d.component,
        }))}
      ></Tabs>
    );

    setResults(tabs);
  }, [stepData, chartImages, toolCode, sqlQuery, activeTab]);

  return (
    <div className="table-chart-ctr" ref={tableChartRef}>
      {results}
    </div>
  );
}
