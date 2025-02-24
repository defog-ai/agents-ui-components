import { useMemo, useState } from "react";
import { MultiSelect, Table } from "@ui-components";
import ErrorBoundary from "../../../../lib/components/common/ErrorBoundary";

export function MetadataTabContent({ metadata = null }) {
  // get unique table names
  const tables = useMemo(() => {
    if (!metadata) return [];

    return Array.isArray(metadata)
      ? Array.from(new Set(metadata.map((col) => col.table_name)))
      : [];
  }, [metadata]);

  const columns = Array.isArray(metadata)
    ? [
        { dataIndex: "table_name", title: "table_name", key: "table_name" },
        {
          dataIndex: "column_name",
          title: "column_name",
          key: "column_name",
        },
        {
          dataIndex: "column_description",
          title: "column_description",
          key: "column_description",
        },
        { dataIndex: "data_type", title: "data_type", key: "data_type" },
      ]
    : [];

  const [selectedTables, setSelectedTables] = useState(tables);

  const tableRows = Array.isArray(metadata)
    ? metadata.filter((d) => {
        return selectedTables.length === 0
          ? true
          : selectedTables.includes(d.table_name);
      })
    : [];

  if (!metadata)
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50 text-sm text-gray-400">
        No metadata available
      </div>
    );

  return (
    <ErrorBoundary>
      {Array.isArray(metadata) && (
        <>
          <div className="flex flex-col justify-center w-full">
            {/* <div className="py-2 border-b bg-white sticky top-2 mb-3 z-[20]">
              <MultiSelect
                rootClassNames="max-w-full"
                placeholder="Filter tables"
                value={[]}
                options={tables.map((d) => ({ label: d, value: d }))}
                onChange={(tableNames) => {
                  setSelectedTables(tableNames);
                }}
                allowCreateNewOption={false}
              />
            </div> */}

            <Table
              pagination={{
                defaultPageSize: 10,
              }}
              paginationPosition="top"
              rootClassNames="rounded-md max-w-full"
              columns={columns}
              rows={tableRows}
              columnHeaderClassNames="py-2"
            />
          </div>
        </>
      )}
    </ErrorBoundary>
  );
}
