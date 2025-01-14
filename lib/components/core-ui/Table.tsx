import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
  useTransition,
} from "react";
import { twMerge } from "tailwind-merge";
import { SingleSelect } from "./SingleSelect";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { MessageManagerContext } from "./Message";

const allowedPageSizes = [5, 10, 20, 50, 100];

interface Column {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number | string;
  sorter?: boolean | ((a: any, b: any) => number);
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  rows: any[];
  rootClassNames?: string;
  pagerClassNames?: string;
  paginationPosition?: 'top' | 'bottom' | 'both';
  pagination?: {
    defaultPageSize?: number;
    showSizeChanger?: boolean;
  };
  skipColumns?: string[];
  rowCellRender?: (props: RowCellRenderProps) => React.ReactNode;
  columnHeaderClassNames?: string;
}

interface ColumnHeaderRenderProps {
  column: Column;
  i: number;
  allColumns: Column[];
  toggleSort: (dataIndex: string) => void;
  sortOrder: 'asc' | 'desc' | null;
  sortColumn: string | null;
  columnHeaderClassNames?: string;
}

interface RowCellRenderProps {
  cellValue: any;
  colIdx: number;
  row: any;
  dataIndex: string;
  column: Column;
  dataIndexes: string[];
  allColumns: Column[];
  dataIndexToColumnMap: Record<string, Column>;
}

const defaultColumnHeaderRender = ({
  column,
  i,
  allColumns,
  toggleSort,
  sortOrder,
  sortColumn,
  columnHeaderClassNames,
}: ColumnHeaderRenderProps) => {
  return (
    <th
      key={column.dataIndex}
      scope="col"
      className={twMerge(
        i === 0 ? "pl-4" : "px-3",
        "text-left text-sm font-semibold text-gray-900 dark:text-gray-100",
        i === allColumns.length - 1 ? "pr-4 sm:pr-6 lg:pr-8" : "",
        columnHeaderClassNames
      )}
    >
      <div
        className="flex flex-row items-center cursor-pointer"
        onClick={() => {
          toggleSort(column);
        }}
      >
        <p className="pointer-events-none grow">{column.title}</p>
        <div className="flex flex-col items-center w-4 ml-5 overflow-hidden sorter-arrows">
          <button className="h-3">
            <div
              className={twMerge(
                "arrow-up cursor-pointer",
                "border-b-[5px] border-b-gray-300 dark:border-b-gray-600",
                sortOrder === "asc" && sortColumn.title === column.title
                  ? "border-b-gray-500 dark:border-b-gray-300"
                  : ""
              )}
            />
          </button>
          <button className="h-3">
            <div
              className={twMerge(
                "arrow-down cursor-pointer",
                "border-t-[5px] border-t-gray-300 dark:border-t-gray-600",
                sortOrder === "desc" && sortColumn.title === column.title
                  ? "border-t-gray-500 dark:border-t-gray-300"
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
}: RowCellRenderProps) => {
  return (
    <td
      key={(row.key || colIdx) + "-" + dataIndex}
      className={twMerge(
        colIdx === 0 ? "pl-4" : "px-3",
        "py-2 text-sm text-gray-500 dark:text-gray-400",
        colIdx === dataIndexes.length - 1 ? "pr-4 sm:pr-6 lg:pr-8" : ""
      )}
    >
      {(typeof cellValue === "number" || !isNaN(cellValue)) &&
      Math.abs(cellValue) > 10000
        ? Number(cellValue).toLocaleString()
        : cellValue}
    </td>
  );
};

const defaultSorter = (a: any, b: any, dataIndex: string): number => {
  return String(a[dataIndex]).localeCompare(String(b[dataIndex]));
};

const TableBody = React.memo(
  ({
    rows,
    dataIndexes,
    rowCellRender,
    dataIndexToColumnMap,
    columnsToDisplay,
  }: {
    rows: any[];
    dataIndexes: string[];
    rowCellRender?: (props: RowCellRenderProps) => React.ReactNode;
    dataIndexToColumnMap: Record<string, Column>;
    columnsToDisplay: Column[];
  }) => {
    return (
      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        {rows.map((row, rowIdx) => (
          <tr key={row.originalIndex + "-" + rowIdx}>
            {dataIndexes.map(
              (dataIndex, colIdx) =>
                rowCellRender?.({
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
        ))}
      </tbody>
    );
  }
);

const TableLoader = () => (
  <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center">
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Loading...
      </span>
    </div>
  </div>
);

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
}: TableProps) {
  const messageManager = useContext(MessageManagerContext);
  // name of the property in the rows objects where each column's data is stored
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.defaultPageSize || 10);
  const [isPending, startTransition] = useTransition();

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

  const maxPage = Math.max(1, Math.ceil(rows.length / pageSize));

  function toggleSort(newColumn) {
    let newOrder;

    // if it's not the same column that was earlier sorted, then force "restart" the sort "cycle"
    // and set to ascending order
    if (newColumn.dataIndex !== sortColumn?.dataIndex) {
      newOrder = "asc";
    } else {
      // else, if it's the same column being clicked again,
      // toggle the order
      // else sort the new column in ascending order
      if (!sortOrder) {
        newOrder = "asc";
      } else if (sortOrder === "asc") {
        newOrder = "desc";
      } else if (sortOrder === "desc") {
        newOrder = null;
      }
    }

    setSortColumn(newColumn);
    setSortOrder(newOrder);
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
          "mb-4 pl-4 text-sm pager text-center bg-white dark:bg-gray-800",
          pagerClassNames
        )}
      >
        <div className="flex flex-row items-center justify-end w-full">
          <div className="flex flex-row items-center w-50">
            <div className="text-gray-600 dark:text-gray-400">
              Page
              <span className="mx-1 font-semibold dark:text-gray-200">
                {currentPage}
              </span>
              /
              <span className="mx-1 font-semibold dark:text-gray-200">
                {maxPage}
              </span>
            </div>
            <ChevronLeft
              className={twMerge(
                "w-5 cursor-not-allowed",
                currentPage === 1
                  ? "text-gray-300 dark:text-gray-600"
                  : "hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
              )}
              onClick={() => {
                setCurrentPage(currentPage - 1 < 1 ? 1 : currentPage - 1);
              }}
            />
            <ChevronRight
              className={twMerge(
                "w-5 cursor-pointer",
                currentPage === maxPage
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
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
            <div className="flex w-full">
              <SingleSelect
                rootClassNames="w-24"
                options={allowedPageSizes.map((d) => ({ value: d, label: d }))}
                value={pageSize}
                onChange={(val: number) => {
                  startTransition(() => {
                    setPageSize(val || 10);
                    setCurrentPage(1);
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    ),
    [currentPage, maxPage, pageSize, allowedPageSizes]
  );

  const visibleRows = useMemo(
    () =>
      sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRows, currentPage, pageSize]
  );

  const minTableHeight = useMemo(() => {
    // Calculate approximate row height (adjust these values based on your actual row heights)
    const approximateRowHeight = 36; // height of each row in pixels
    const headerHeight = 48; // height of the header in pixels
    const actualRowCount = visibleRows.length;
    return Math.min(actualRowCount * approximateRowHeight + headerHeight, 800); // cap at 800px
  }, [visibleRows.length]);

  return (
    <div className={twMerge("overflow-auto", rootClassNames)}>
      {paginationPosition === "top" && pager}
      <div
        className="flex flex-row mx-auto overflow-auto max-w-7xl relative"
        style={{ minHeight: `${minTableHeight}px` }}
      >
        {isPending && <TableLoader />}
        <table className="w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
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
          <TableBody
            rows={visibleRows}
            dataIndexes={dataIndexes}
            rowCellRender={rowCellRender}
            dataIndexToColumnMap={dataIndexToColumnMap}
            columnsToDisplay={columnsToDisplay}
          />
        </table>
      </div>
      {paginationPosition === "bottom" && pager}
    </div>
  );
}
