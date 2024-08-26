import { isValidElement, useEffect, useState, useMemo, useRef } from "react";
import { Tabs, Button, message, Popover } from "antd";
import { chartNames, roundColumns } from "../../agentUtils";

import {
  ArrowDownTrayIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid";
import ErrorBoundary from "../../../common/ErrorBoundary";
import ChartImage from "./ChartImage";

import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";

import "prismjs/themes/prism.css";
import { roundNumber } from "../../../utils/utils";
import setupBaseUrl from "../../../utils/setupBaseUrl";
import { Table } from "@ui-components";
import { ChartContainer } from "../../../observable-charts/ChartContainer";
import { DashboardProvider } from "../../../observable-charts/dashboardState";

// tabBarLeftContent: extra content for the tab bar on the left side
export function StepResultsTable({
  stepId,
  analysisId,
  nodeId,
  apiEndpoint,
  tableData = null,
  codeStr = null,
  sql = null,
  chartImages = null,
  reactiveVars = null,
  handleEdit = () => {},
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
            output_storage_key: nodeId,
            analysis_id: analysisId,
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

      a.download = `${nodeId}-${new Date().toISOString().split(".")[0]}.csv`;
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

  // if reactive vars change, add dragstart handler to them
  // useEffect(() => {
  //   if (!tableChartRef.current) return;
  //   const reactiveEls = tableChartRef.current.getElementsByClassName(
  //     "table-chart-reactive-var"
  //   );

  //   Array.from(reactiveEls).forEach((el) => {
  //     el.ondragstart = (e) => {
  //       e.stopPropagation();
  //       e.dataTransfer.clearData();
  //       e.dataTransfer.setData(
  //         "text/html",
  //         `<reactive-var
  //             data-reactive-var='true'
  //             data-reactive-var-name=${el.dataset.reactiveVarName}
  //             data-val=${roundNumber(+el.dataset.val)}
  //             data-reactive-var-nest-location=${
  //               el.dataset.reactiveVarNestLocation
  //             }
  //             data-table-id=${el.dataset.stepId}>
  //           </reactive-var>`
  //       );
  //     };
  //   });
  // }, [reactiveVars]);

  const updateCodeAndSql = (updateProp = null, newVal) => {
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

  const [results, setResults] = useState([]);
  useEffect(() => {
    // extra tabs should be an array and all elements should be jsx components
    let tabs = [];
    if (tableData) {
      const roundedData = roundColumns(tableData.data, tableData.columns);

      // find which dataset is the current node
      tabs.push({
        component: (
          <Table
            key="0"
            rows={roundedData}
            // don't show index column in table
            columns={tableData.columns
              .filter((d) => d.title !== "index")
              .map((d) => {
                d.render = (text, record, index) => {
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
                          <DocumentDuplicateIcon className="w-3 h-3 table-chart-cell-copy-icon" />
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
        tabLabel: "Table",
        icon: <TableCellsIcon className="w-4 h-4 mb-0.5 mr-1 inline" />,
      });
    }

    if (!chartImages || chartImages.length <= 0) {
      if (tableData) {
        tabs.push({
          component: (
            <ErrorBoundary>
              <ChartContainer
                rows={tableData.data}
                columns={tableData.columns}
              />
            </ErrorBoundary>
          ),
          tabLabel: "Chart",
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
        tabLabel: chartNames[chartImages[0].type] || "Chart",
      });
    }
    if (sqlQuery !== null) {
      // show the sql query
      tabs.push({
        component: (
          <ErrorBoundary>
            <>
              <p>The following query was generated:</p>
              <Editor
                className="language-sql table-code-ctr"
                value={sqlQuery}
                highlight={(code) => {
                  return highlight(code, languages.sql, "sql");
                }}
                onValueChange={(newVal) => {
                  updateCodeAndSql("sql", newVal);
                }}
              />
            </>
          </ErrorBoundary>
        ),
        tabLabel: "SQL",
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
              size="small"
              title="Download CSV"
              loading={csvLoading}
              disabled={csvLoading}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </Button>
          ),
        }}
        defaultActiveKey={!chartImages || !chartImages.length ? "0" : "1"}
        items={tabs.map((d, i) => ({
          key: String(i),
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
  }, [tableData, chartImages, toolCode, sqlQuery]);

  function nestedDivsUntilNumericKeys(key, obj, nestLocation) {
    if (typeof obj[key] === "object") {
      return (
        <div className="table-chart-reactive-var-group" key={key}>
          <>
            <div className="table-chart-reactive-var-group-name">{key}</div>
            <div className="table-chart-reactive-var-vals">
              {Object.keys(obj[key]).map((nestedKey) =>
                nestedDivsUntilNumericKeys(
                  nestedKey,
                  obj[key],
                  nestLocation + "---" + nestedKey
                )
              )}
            </div>
          </>
        </div>
      );
    }

    return (
      <div
        className="table-chart-reactive-var"
        key={key}
        data-reactive-var-name={key}
        data-val={obj[key]}
        data-reactive-var-nest-location={nestLocation}
        data-table-id={stepId}
        draggable="true"
      >
        <span className="reactive-var-name">{key}</span>
        <Popover
          content={() => <span>{obj[key]}</span>}
          rootClassName="reactive-var-popover-val"
          arrow={false}
          placement="left"
        >
          <span
            className="reactive-var-value"
            onClick={() => {
              let clipboardItem = new ClipboardItem({
                "text/html": new Blob(
                  [
                    `<reactive-var
                            data-reactive-var='true'
                            data-reactive-var-name=${key}
                            data-val=${roundNumber(+obj[key])}
                            data-reactive-var-nest-location=${nestLocation}
                            data-table-id=${stepId}>
                          </reactive-var>&nbsp;`,
                  ],
                  { type: "text/html" }
                ),
              });

              navigator.clipboard.write([clipboardItem]).then(() => {
                message.success("Copied to clipboard.");
              });
            }}
          >
            {roundNumber(obj[key])}
          </span>
          <DocumentDuplicateIcon
            className="w-3 h-3 reactive-var-copy-icon"
            title="Copy"
            onClick={() => {
              let clipboardItem = new ClipboardItem({
                "text/html": new Blob(
                  [
                    `<reactive-var
                            data-reactive-var='true'
                            data-reactive-var-name=${key}
                            data-val=${roundNumber(+obj[key])}
                            data-reactive-var-nest-location=${nestLocation}
                            data-table-id=${stepId}>
                          </reactive-var>&nbsp;`,
                  ],
                  { type: "text/html" }
                ),
              });

              navigator.clipboard.write([clipboardItem]).then(() => {
                message.success("Copied to clipboard.");
              });
            }}
          />
        </Popover>
      </div>
    );
  }

  const reactiveVarJsx = useMemo(() => {
    if (
      !reactiveVars ||
      typeof reactiveVars !== "object" ||
      Object.keys(reactiveVars).length <= 0
    )
      return <></>;

    if (
      reactiveVars &&
      typeof reactiveVars === "object" &&
      Object.keys(reactiveVars).length > 0
    ) {
      // keep nesting into divs until we get to the keys that are not objects

      let keys = Object.keys(reactiveVars);

      return (
        <>
          <div className="table-chart-reactive-var-ctr">
            <div className="sticky">
              <p className="small">STATISTICS</p>
              {keys.map((key) =>
                nestedDivsUntilNumericKeys(key, reactiveVars, key)
              )}
            </div>
          </div>
        </>
      );
    }
  }, [reactiveVars]);

  return (
    <DashboardProvider>
      <div className="table-chart-ctr" ref={tableChartRef}>
        {results}
        {reactiveVarJsx}
      </div>
    </DashboardProvider>
  );
}
