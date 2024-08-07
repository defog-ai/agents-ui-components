import { useContext, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { SingleSelect } from "./SingleSelect";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { MessageManagerContext } from "./Message";

const allowedPageSizes = [5, 10, 20, 50, 100];

const defaultColumnHeaderRender = ({
  column,
  i,
  allColumns,
  toggleSort,
  sortOrder,
  sortColumn,
  columnHeaderClassNames,
}) => {
  return (
    <th
      key={column.dataIndex}
      scope="col"
      className={twMerge(
        i === 0 ? "pl-4" : "px-3",
        "text-left text-sm font-semibold text-gray-900",
        i === allColumns.length - 1 ? "pr-4 sm:pr-6 lg:pr-8" : "",
        columnHeaderClassNames
      )}
    >
      <div className="flex flex-row items-center">
        <p className="grow">{column.title}</p>
        <div className="sorter-arrows ml-5 flex flex-col items-center w-4 overflow-hidden">
          <button className="h-3">
            <div
              onClick={() => {
                toggleSort(column, "asc");
              }}
              className={twMerge(
                "arrow-up cursor-pointer",
                "border-b-[5px] border-b-gray-300 hover:border-b-gray-500",
                sortOrder === "asc" && sortColumn.title === column.title
                  ? "border-b-gray-500"
                  : ""
              )}
            />
          </button>
          <button className="h-3">
            <div
              onClick={() => {
                toggleSort(column, "desc");
              }}
              className={twMerge(
                "arrow-down cursor-pointer",
                "border-t-[5px] border-t-gray-300 hover:border-t-gray-500",
                sortOrder === "desc" && sortColumn.title === column.title
                  ? "border-t-gray-500"
                  : ""
              )}
            />
          </button>
        </div>
      </div>
    </th>
  );
};

const defaultRowCellRender = ({
  cellValue,
  colIdx,
  row,
  dataIndex,
  column,
  dataIndexes,
  allColumns,
  dataIndexToColumnMap,
}) => {
  return (
    <td
      key={(row.key || colIdx) + "-" + dataIndex}
      className={twMerge(
        colIdx === 0 ? "pl-4" : "px-3",
        "py-2 text-sm text-gray-500",
        colIdx === dataIndexes.length - 1 ? "pr-4 sm:pr-6 lg:pr-8" : ""
      )}
    >
      {cellValue}
    </td>
  );
};

const defaultSorter = (a, b, dataIndex) => {
  return String(a[dataIndex]).localeCompare(String(b[dataIndex]));
};


/**
 * Table component
 * @typedef {Object} TableProps
 * @property {Array<{ dataIndex: string, title: string, sorter?: (a: any, b: any) => number, columnHeaderCellRender?: (args: { column: any, i: number, allColumns: any[], toggleSort: (newColumn: any, newOrder: string) => void, sortOrder: string, sortColumn: any }) => JSX.Element }>} columns - The columns to be displayed in the table.
 * - `dataIndex` is the key in the row object where the data is stored.
 * - `title` is the title of the column.
 * - `sorter` is the function to be used for sorting the column.
 * - `columnHeaderCellRender` is the function to be used for rendering the column header. If this function returns a falsy value, the default renderer is used. So this can also be used for conditional rendering of column headers.
 * @property {Array<any>} rows - The rows to be displayed in the table.
 * @property {string} [rootClassNames=""] - Additional classes to be added to the root div.
 * @property {string} [pagerClassNames=""] - Additional classes to be added to the pager.
 * @property {"top" | "bottom"} [paginationPosition="bottom"] - The position of the pagination.
 * @property {{ defaultPageSize: number, showSizeChanger: boolean }} [pagination={ defaultPageSize: 10, showSizeChanger: true }] - The pagination options.
 * @property {string[]} [skipColumns=[]] - The columns to skip.
 * @property {(cellMetadata: { cellValue: any, colIdx: number, row: any, dataIndex: string, column: any, dataIndexes: string[], allColumns: any[], dataIndexToColumnMap: { [key: string]: any } }) => JSX.Element} [rowCellRender=(_) => null] - The row cell render function. If this function returns a falsy value, the default renderer is used. So this can also be used for conditional rendering of row cells.
 * @property {string} [columnHeaderClassNames=""] - Additional classes to be added to the column header.
 */
/**
 * Table component
 * @param {TableProps} props
 * @returns {JSX.Element}
 */
export function Table({
  columns = [],
  rows = [],
  rootClassNames = "",
  pagerClassNames = "",
  paginationPosition = "bottom",
  pagination = { defaultPageSize: 10, showSizeChanger: true },
  skipColumns = [],
  rowCellRender = (_) => null,
  columnHeaderClassNames = "",
}) {
  const messageManager = useContext(MessageManagerContext);
  // name of the property in the rows objects where each column's data is stored
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.defaultPageSize || 10);
  const columnsToDisplay = useMemo(
    () =>
      columns
        .filter((column) => !skipColumns.includes(column.dataIndex))
        .map((d) => ({
          ...d,
          columnHeaderCellRender: d.columnHeaderCellRender || (() => false),
        })),
    [columns, skipColumns]
  );

  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [sortedRows, setSortedRows] = useState(
    rows.map((d, i) => {
      d.originalIndex = i;
      return d;
    })
  );

  useEffect(() => {
    setCurrentPage(1);
    // if multiple columns have same dataIndex, show a warning that output might be confusing
    const dataIndexes = columns.map((d) => d.dataIndex);
    const uniqueDataIndexes = new Set(dataIndexes);
    if (dataIndexes.length !== uniqueDataIndexes.size) {
      messageManager.warning(
        "There seem to be duplicate columns. Table shown might be garbled."
      );
    }
  }, [rows, columns]);

  const dataIndexes = columnsToDisplay.map((d) => d.dataIndex);
  const dataIndexToColumnMap = columnsToDisplay.reduce((acc, column) => {
    acc[column.dataIndex] = column;
    return acc;
  }, {});

  const maxPage = Math.ceil(rows.length / pageSize);

  function toggleSort(newColumn, newOrder) {
    // if everything the same, set null
    if (sortColumn?.title === newColumn?.title && sortOrder === newOrder) {
      setSortColumn(null);
      setSortOrder(null);
    } else {
      setSortColumn(newColumn);
      setSortOrder(newOrder);
    }
  }

  useEffect(() => {
    if (sortColumn && sortOrder) {
      // each column has a sorter function defined
      const sorter = sortColumn.sorter || defaultSorter;
      const sortedRows = rows.slice().sort((a, b) => {
        return sortOrder === "asc"
          ? sorter(a, b, sortColumn.dataIndex)
          : sorter(b, a, sortColumn.dataIndex);
      });
      setSortedRows(sortedRows);
    } else {
      setSortedRows(rows);
    }
  }, [sortColumn, rows, sortOrder]);

  const pager = useMemo(
    () => (
      <div
        className={twMerge(
          "pl-4 text-sm pager text-center bg-white",
          pagerClassNames
        )}
      >
        <div className="w-full flex flex-row justify-end items-center">
          <div className="flex flex-row w-50 items-center">
            <div className="text-gray-600">
              Page
              <span className="mx-1 font-semibold">{currentPage}</span>/
              <span className="mx-1 font-semibold">{maxPage}</span>
            </div>
            <ChevronLeftIcon
              className={twMerge(
                "w-5 cursor-not-allowed",
                currentPage === 1
                  ? "text-gray-300"
                  : "hover:text-blue-500 cursor-pointer"
              )}
              onClick={() => {
                setCurrentPage(currentPage - 1 < 1 ? 1 : currentPage - 1);
              }}
            />
            <ChevronRightIcon
              className={twMerge(
                "w-5 cursor-pointer",
                currentPage === maxPage
                  ? "text-gray-300 cursor-not-allowed"
                  : "hover:text-blue-500 cursor-pointer"
              )}
              onClick={() => {
                setCurrentPage(
                  currentPage + 1 > maxPage ? maxPage : currentPage + 1
                );
              }}
            />
          </div>
          {(pagination.showSizeChanger === undefined
            ? true
            : pagination.showSizeChanger) && (
            <div className="w-full flex">
              <SingleSelect
                rootClassNames="w-24"
                options={allowedPageSizes.map((d) => ({ value: d, label: d }))}
                value={pageSize}
                onChange={(val) => setPageSize(val || 10)}
              />
            </div>
          )}
        </div>
      </div>
    ),
    [currentPage, maxPage, pageSize, allowedPageSizes]
  );

  return (
    <div className={twMerge("overflow-auto", rootClassNames)}>
      {paginationPosition === "top" && pager}
      <div className="overflow-auto max-w-6xl py-2 flex flex-row">
        <table className="divide-y w-full divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columnsToDisplay.map((column, i) => {
                return (
                  column.columnHeaderCellRender({
                    column,
                    i,
                    allColumns: columnsToDisplay,
                    toggleSort,
                    sortOrder,
                    sortColumn,
                    columnHeaderClassNames,
                  }) ||
                  defaultColumnHeaderRender({
                    column,
                    i,
                    allColumns: columnsToDisplay,
                    toggleSort,
                    sortOrder,
                    sortColumn,
                    columnHeaderClassNames,
                  })
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedRows
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((row, rowIdx) => {
                return (
                  <tr key={row.originalIndex + "-" + rowIdx}>
                    {dataIndexes.map(
                      (dataIndex, colIdx) =>
                        rowCellRender({
                          cellValue: row[dataIndex],
                          colIdx,
                          row,
                          dataIndex,
                          column: dataIndexToColumnMap[dataIndex],
                          dataIndexes,
                          allColumns: columnsToDisplay,
                          dataIndexToColumnMap,
                        }) ||
                        defaultRowCellRender({
                          cellValue: row[dataIndex],
                          colIdx,
                          row,
                          dataIndex,
                          column: dataIndexToColumnMap[dataIndex],
                          dataIndexes,
                          allColumns: columnsToDisplay,
                          dataIndexToColumnMap,
                        })
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {paginationPosition === "bottom" && pager}
    </div>
  );
}
