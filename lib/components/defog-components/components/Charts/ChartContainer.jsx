// component that calles the required chart
// if not found, just renders the chartjs charts

import { useMemo } from "react";
import { createChartData } from "./utils";
import { MultiSelect } from "$ui-components";
import { SingleSelect } from "$ui-components";

/**
 * Lays out the chart body, x and y axis in a nice flexbox layout.
 * @component
 * @param {object} props - The props of the component
 * @param {object} props.rows - The rows of the data
 * @param {object} props.columns - The columns of the data
 *
 */

export function ChartContainer({ rows, columns }) {
  const {
    xAxisColumns,
    categoricalColumns,
    yAxisColumns,
    xAxisColumnValues,
    dateColumns,
    cleanedData,
  } = useMemo(() => {
    return createChartData(rows, columns);
  }, [rows, columns]);

  console.log("rows", rows);
  console.log("columns", columns);
  console.log("xAxisColumnValues", xAxisColumnValues);
  console.log("yAxisColumns", yAxisColumns);
  console.log("categoricalColumns", categoricalColumns);

  console.log("dateColumns", dateColumns);
  console.log("cleanedData", cleanedData);

  console.log("xAxisColumns", xAxisColumns);

  return (
    <div className="text-xs divide-y">
      {/* column chips that are draggable */}
      <div className="flex flex-row text-gray-500 items-start gap-2 py-4">
        <span className="pt-1 font-bold text-gray-400">Columns: </span>
        <div className="flex flex-row flex-wrap grow gap-2">
          {columns.map((column) => (
            <>
              <div
                key={column.key}
                className="bg-gray-200 border border-gray-300 h-6 flex items-center px-2 rounded-md cursor-pointer hover:bg-gray-400 hover:text-white"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("column", JSON.stringify(column));
                }}
              >
                {column.title}
              </div>
            </>
          ))}
        </div>
      </div>
      {/* x scale, y scale and facet column dropdowns */}
      <div className="flex flex-row gap-2 py-4">
        {/* xScale */}
        <SingleSelect
          label={"X Axis"}
          options={xAxisColumns.map((column) => ({
            label: column.title,
            value: column.dataIndex,
          }))}
        />
        {/* yScale */}
        <SingleSelect
          label={"Y Axis"}
          options={yAxisColumns.map((column) => ({
            label: column.title,
            value: column.dataIndex,
          }))}
        />
        {/* facet */}
        <MultiSelect
          label={"Facet By"}
          options={columns.map((column) => ({
            label: column.title,
            value: column.dataIndex,
          }))}
        />
      </div>
    </div>
  );
}
