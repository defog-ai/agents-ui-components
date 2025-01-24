import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  useRef,
  useCallback,
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
  columnHeaderCellRender?: (value: Object) => false | React.ReactNode;
}

interface ExtendedColumn extends Column {
  columnHeaderCellRender?: (value: Object) => false | React.ReactNode;
}

interface RowWithIndex {
  originalIndex: number;
  [key: string]: any;
}

interface TableProps {
  columns: Column[];
  rows: any[];
  rootClassNames?: string;
  pagerClassNames?: string;
  paginationPosition?: "top" | "bottom" | "both";
  pagination?: {
    defaultPageSize?: number;
    showSizeChanger?: boolean;
  };
  skipColumns?: string[];
  rowCellRender?: (props: RowCellRenderProps) => React.ReactNode;
  columnHeaderClassNames?: string;
  showSearch?: boolean;
}

interface ColumnHeaderRenderProps {
  column: Column;
  i: number;
  allColumns: Column[];
  toggleSort: (dataIndex: string) => void;
  sortOrder: "asc" | "desc" | null;
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
          toggleSort(column.dataIndex);
        }}
      >
        <p className="pointer-events-none grow">{column.title}</p>
        <div className="flex flex-col items-center w-4 ml-5 overflow-hidden sorter-arrows">
          <button className="h-3">
            <div
              className={twMerge(
                "arrow-up cursor-pointer",
                "border-b-[5px] border-b-gray-300 dark:border-b-gray-600",
                sortOrder === "asc" && sortColumn === column.dataIndex
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
                sortOrder === "desc" && sortColumn === column.dataIndex
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
 * @property {boolean} [showSearch=true] - Whether to show the search bar.
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
  rowCellRender = (_: any) => null,
  columnHeaderClassNames = "",
  showSearch = true,
}: TableProps) {
  const messageManager = useContext(MessageManagerContext);
  const pageInputRef = useRef<HTMLSpanElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const columnsToDisplay = useMemo<ExtendedColumn[]>(
    () =>
      columns
        .filter((d) => !skipColumns.includes(d.dataIndex))
        .map((d) => ({
          ...d,
          columnHeaderCellRender: d.columnHeaderCellRender || (() => false),
        })),
    [columns, skipColumns]
  );

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(
    pagination?.defaultPageSize || 10
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const dataIndexes = useMemo(
    () => columnsToDisplay.map((col) => col.dataIndex),
    [columnsToDisplay]
  );

  const dataIndexToColumnMap = useMemo(
    () =>
      columnsToDisplay.reduce<Record<string, Column>>((acc, column) => {
        acc[column.dataIndex] = column;
        return acc;
      }, {}),
    [columnsToDisplay]
  );

  const rowsWithIndex = useMemo(
    () =>
      rows.map((d, i) => ({
        ...d,
        originalIndex: i,
      })),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rowsWithIndex;

    return rowsWithIndex.filter((row) => {
      return dataIndexes.some((dataIndex) => {
        const cellValue = row[dataIndex];
        if (cellValue == null) return false;
        return String(cellValue)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
    });
  }, [rowsWithIndex, searchQuery, dataIndexes]);

  const sortedRows = useMemo(() => {
    if (!(sortColumn && sortOrder)) {
      return filteredRows;
    }

    const column = columnsToDisplay.find(
      (column) => column.dataIndex === sortColumn
    );
    const sorterFn =
      typeof column?.sorter === "function" ? column.sorter : defaultSorter;

    return filteredRows.slice().sort((a, b) => {
      return sortOrder === "asc"
        ? sorterFn(a, b, sortColumn)
        : sorterFn(b, a, sortColumn);
    });
  }, [filteredRows, sortColumn, sortOrder, columnsToDisplay]);

  const maxPage = useMemo(
    () => Math.ceil(sortedRows.length / pageSize),
    [sortedRows.length, pageSize]
  );

  useEffect(() => {
    if (pageInputRef.current) {
      pageInputRef.current.innerText = currentPage.toString();
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }
  }, [maxPage, currentPage]);

  useEffect(() => {
    const dataIndexes = columns.map((d) => d.dataIndex);
    const uniqueDataIndexes = new Set(dataIndexes);
    if (dataIndexes.length !== uniqueDataIndexes.size) {
      messageManager.warning(
        "There seem to be duplicate columns. Table shown might be garbled."
      );
    }
  }, [columns, messageManager]);

  const tryPageChange = useCallback(
    (page: number, setInnerText: boolean = true) => {
      if (!isNaN(page) && page >= 1 && page <= maxPage) {
        if (pageInputRef.current && setInnerText) {
          pageInputRef.current.innerText = page + "";
        }
        setCurrentPage(page);
      } else {
        if (pageInputRef.current && setInnerText) {
          pageInputRef.current.innerText = currentPage + "";
        }
      }
    },
    [currentPage, maxPage]
  );

  function toggleSort(newColumn: string) {
    let newOrder: "asc" | "desc" | null = null;

    if (newColumn !== sortColumn) {
      newOrder = "asc";
    } else {
      if (!sortOrder) {
        newOrder = "asc";
      } else if (sortOrder === "asc") {
        newOrder = "desc";
      }
    }

    setSortColumn(newColumn);
    setSortOrder(newOrder);
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        if (
          e.key === "Escape" &&
          document.activeElement === searchInputRef.current
        ) {
          searchInputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          tryPageChange(currentPage - 1 < 1 ? 1 : currentPage - 1);
          break;
        case "ArrowRight":
          tryPageChange(currentPage + 1 > maxPage ? maxPage : currentPage + 1);
          break;
        case "s":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
      }
    },
    [currentPage, maxPage, tryPageChange]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const pager = useMemo(() => {
    return (
      maxPage > 1 && (
        <div
          className={twMerge(
            "text-sm pager text-center bg-white dark:bg-gray-800",
            paginationPosition === "top" ? "mb-2" : "mt-2",
            pagerClassNames
          )}
        >
          <div className="flex flex-row items-center justify-end w-full">
            <div className="flex flex-row items-center">
              <button
                className={twMerge(
                  "cursor-not-allowed",
                  currentPage === 1
                    ? "text-gray-300 dark:text-gray-600"
                    : "hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
                )}
              >
                <ChevronLeft
                  type="button"
                  className="w-5 "
                  onClick={() => {
                    tryPageChange(currentPage - 1 < 1 ? 1 : currentPage - 1);
                  }}
                />
              </button>
              <div className="flex flex-row items-center">
                <span
                  contentEditable="true"
                  ref={pageInputRef}
                  onBlur={(e) => {
                    const value = parseInt(e.target.innerText);
                    tryPageChange(value);
                  }}
                  onInput={(e) => {
                    if (e.currentTarget.innerText === "") return;
                    const value = parseInt(e.currentTarget.innerText);
                    tryPageChange(value, false);
                  }}
                  className="border rounded px-2 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-w-[2rem] text-center empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                  data-placeholder={currentPage.toString()}
                />
                <span className="ml-2 text-gray-300 text-xs pointer-events-none whitespace-nowrap">
                  / {maxPage}
                </span>
              </div>
              <button
                className={twMerge(
                  "cursor-pointer",
                  currentPage === maxPage
                    ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : "hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
                )}
              >
                <ChevronRight
                  className={"w-5"}
                  onClick={() => {
                    tryPageChange(
                      currentPage + 1 > maxPage ? maxPage : currentPage + 1
                    );
                  }}
                />
              </button>
            </div>
            {(pagination.showSizeChanger === undefined
              ? true
              : pagination.showSizeChanger) && (
              <div className="flex w-full">
                <SingleSelect
                  allowClear={false}
                  rootClassNames="w-24"
                  options={allowedPageSizes.map((d) => ({
                    value: d,
                    label: d,
                  }))}
                  value={pageSize}
                  onChange={(val: number) => {
                    startTransition(() => {
                      setPageSize(val || 10);
                      tryPageChange(1);
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )
    );
  }, [currentPage, maxPage, pageSize, allowedPageSizes]);

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
    <div className={twMerge("px-4 sm:px-6 lg:px-8", rootClassNames)}>
      {showSearch && (
        <div className="mb-4">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table... (Press 's' to focus)"
            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      )}
      {paginationPosition === "top" && pager}
      <div
        className="flow-root overflow-x-auto"
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
