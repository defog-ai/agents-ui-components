import { Table } from "../../lib/components/core-ui/Table";

const sampleRows = [
  {
    id: 1,
    name: "John Doe",
    age: 25,
    email: "john@example.com",
    dob: "1994-01-01",
    large_number: Math.floor(Math.random() * 100000000),
  },
  {
    id: 2,
    name: "Manas",
    age: 27,
    email: "manas@example.com",
    dob: "2000-01-01",
    large_number: Math.floor(Math.random() * 100000000),
  },
  {
    id: 3,
    name: "Jane Doe",
    email: "jaja@jaja.com",
    dob: "2005-01-01",
    large_number: Math.floor(Math.random() * 100000000),
  },
];

const lotsOfData = [];
for (let i = 0; i < 100; i++) {
  lotsOfData.push({
    id: i,
    name: "John Doe",
    age: 25,
    email: "john@example.com",
    dob: "1994-01-01",
    large_number: Math.floor(Math.random() * 100000000),
  });
}

const sampleColumns = [
  { dataIndex: "id", title: "ID" },
  { dataIndex: "name", title: "Name" },
  { dataIndex: "age", title: "Age" },
  { dataIndex: "email", title: "Email" },
  { dataIndex: "dob", title: "Date of Birth" },
  { dataIndex: "large_number", title: "Large Number" },
];

export default {
  title: "Core UI/Table",
  component: Table,
  parameters: {
    layout: "centered",
    actions: {
      handles: ["click"],
    },
  },
  tags: ["autodocs"],
};

export const Primary = {
  name: "Basic table",
  args: { rows: sampleRows, columns: sampleColumns },
};

export const SomeData = {
  name: "Table with some data",
  args: { rows: sampleRows, columns: sampleColumns },
};

export const LotsOfData = {
  name: "Table with lots of data",
  args: { rows: lotsOfData, columns: sampleColumns },
};

export const PaginationOnTop = {
  name: "Table with pagination on top",
  args: { rows: sampleRows, columns: sampleColumns, paginationPosition: "top" },
};

// custom header render
export const CustomColumnHeaderClasses = {
  name: "Column header classes (tailwind)",
  args: {
    rows: sampleRows,
    columns: sampleColumns,
    columnHeaderClassNames: "text-rose-400 font-bold",
  },
};

// custom column header render function
export const CustomColumnHeaderRender = {
  name: "Custom column header render function + only for certain columns.",
  args: {
    rows: sampleRows,
    columns: sampleColumns.map((column) => ({
      ...column,
      columnHeaderCellRender: ({
        column,
        i,
        allColumns: columnsToDisplay,
        toggleSort,
        sortOrder,
        sortColumn,
        columnHeaderClassNames,
      }) => {
        if (column.dataIndex !== "email") return false;
        else {
          return (
            <th className="bg-rose-500 text-white border-2 border-rose-800">
              {column.title}
            </th>
          );
        }
      },
    })),
  },
};

export const CustomRowCellRender = {
  name: "Custom row cell render + only certain cells",
  args: {
    rows: sampleRows,
    columns: sampleColumns,
    rowCellRender: ({ row, column, i, allColumns }) => {
      if (
        column.dataIndex === "email" &&
        row[column.dataIndex] === "john@example.com"
      ) {
        return (
          <td className="bg-rose-500 text-white px-3 text-sm">
            {row[column.dataIndex]}
          </td>
        );
      }
      return false;
    },
  },
};

export const SkipColumns = {
  name: "Skip columns aka don't render certain columns",
  args: {
    rows: sampleRows,
    columns: sampleColumns,
    skipColumns: ["id"],
  },
};

export const PaginationControls = {
  name: "Pagination controls: default page size",
  args: {
    rows: sampleRows,
    columns: sampleColumns,
    pagination: {
      defaultPageSize: 5,
    },
  },
};
export const HideSizeChanger = {
  name: "Hide page size changer",
  args: {
    rows: sampleRows,
    columns: sampleColumns,
    pagination: {
      showSizeChanger: false,
    },
  },
};
