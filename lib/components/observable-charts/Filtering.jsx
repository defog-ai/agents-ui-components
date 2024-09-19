import { useContext, useState, useCallback, useRef } from "react";
import { Select, Button, Space, Card, Tag } from "antd";
import { Input as TextInput } from "@ui-components";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ChartStateContext } from "./ChartStateContext";
import { HashIcon, CaseSensitive } from "lucide-react";

const { Option } = Select;

const FilterBuilder = ({ columns }) => {
  const [filters, setFilters] = useState([]);
  const chartState = useContext(ChartStateContext);
  const timeoutRef = useRef(null);

  const debounce = (func, delay) => {
    return (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => func(...args), delay);
    };
  };

  const updateFilterFunction = useCallback(
    (currentFilters) => {
      const filterFunction = currentFilters.length
        ? (d) =>
            currentFilters.every(({ column, operator, value }) => {
              if (!column || !operator || value === "") return true;
              const columnDef = columns.find((c) => c.dataIndex === column);
              const dValue = d[column];
              const compareValue =
                columnDef.variableType === "categorical" &&
                typeof dValue === "string"
                  ? dValue.toLowerCase()
                  : dValue;
              const filterValue =
                columnDef.variableType === "categorical" &&
                typeof value === "string"
                  ? value.toLowerCase()
                  : value;

              const operatorFunctions = {
                "==": (a, b) => a == b,
                "!=": (a, b) => a != b,
                ">": (a, b) => a > b,
                "<": (a, b) => a < b,
                ">=": (a, b) => a >= b,
                "<=": (a, b) => a <= b,
                in: (a, b) =>
                  b
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .includes(a),
                "not in": (a, b) =>
                  !b
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .includes(a),
                contains: (a, b) => a.includes(b),
                "starts with": (a, b) => a.startsWith(b),
                "ends with": (a, b) => a.endsWith(b),
                between: (a, b) => {
                  const [min, max] = b.split(",").map(Number);
                  return a >= min && a <= max;
                },
              };

              return operatorFunctions[operator](compareValue, filterValue);
            })
        : null;

      chartState
        .updateChartSpecificOptions({ filter: filterFunction })
        .render();
    },
    [chartState, columns]
  );

  const debouncedUpdateFilterFunction = useCallback(
    debounce(updateFilterFunction, 200),
    [updateFilterFunction]
  );

  const addFilter = () =>
    setFilters([...filters, { column: "", operator: "==", value: "" }]);

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    updateFilterFunction(newFilters);
  };

  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
    debouncedUpdateFilterFunction(newFilters);
  };

  const getOperators = (column) => {
    const commonOperators = ["==", "!="];
    const categoricalOperators = [
      "in",
      "not in",
      "contains",
      "starts with",
      "ends with",
    ];
    const quantitativeOperators = [">", "<", ">=", "<=", "between"];

    return column.variableType === "categorical"
      ? [...commonOperators, ...categoricalOperators]
      : column.variableType === "quantitative" ||
          column.variableType === "integer"
        ? [...commonOperators, ...quantitativeOperators]
        : commonOperators;
  };

  const getFilterPreview = (filter, column) => {
    if (!filter.column || !filter.operator || filter.value === "") return "";
    const columnName = column ? column.title : filter.column;
    let preview = `${columnName} ${filter.operator} `;

    if (["in", "not in"].includes(filter.operator)) {
      preview += filter.value
        .split(",")
        .map((v) => `"${v.trim()}"`)
        .join(", ");
    } else if (filter.operator === "between") {
      const [start, end] = filter.value.split(",");
      preview += `${start} and ${end}`;
    } else {
      preview += `"${filter.value}"`;
    }

    return preview;
  };

  const renderFilterInput = (filter, index, column) => {
    const commonInputProps = {
      className: "w-full",
      placeholder: "Value",
      value: filter.value,
      onChange: (e) => updateFilter(index, "value", e.target.value),
    };

    let inputType = "text";
    let placeholder = "Value";

    if (
      column.variableType === "categorical" &&
      ["in", "not in"].includes(filter.operator)
    ) {
      placeholder = "Comma-separated values";
    } else if (
      (column.variableType === "quantitative" ||
        column.variableType === "integer") &&
      filter.operator !== "between"
    ) {
      inputType = "number";
    }

    if (filter.operator === "between") {
      const [start, end] = filter.value.split(",");
      return (
        <div className="flex gap-2">
          <TextInput
            {...commonInputProps}
            type="number"
            className="w-1/2"
            placeholder="From"
            value={start || ""}
            onChange={(e) =>
              updateFilter(index, "value", `${e.target.value},${end || ""}`)
            }
          />
          <TextInput
            {...commonInputProps}
            type="number"
            className="w-1/2"
            placeholder="To"
            value={end || ""}
            onChange={(e) =>
              updateFilter(index, "value", `${start || ""},${e.target.value}`)
            }
          />
        </div>
      );
    }

    return (
      <TextInput
        {...commonInputProps}
        type={inputType}
        placeholder={placeholder}
      />
    );
  };

  const COLUMN_ICONS = {
    quantitative: HashIcon,
    categorical: CaseSensitive,
  };

  const renderColumnOption = (column) => {
    if (column.colType === "date") return null;

    const IconComponent = COLUMN_ICONS[column.variableType];
    return (
      <Option key={column.dataIndex} value={column.dataIndex}>
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="opacity-50" size={14} />}
          <span>{column.title}</span>
        </div>
      </Option>
    );
  };

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {filters.map((filter, index) => {
        const column = columns.find((c) => c.dataIndex === filter.column);
        const filterPreview = getFilterPreview(filter, column);
        const IconComponent = column
          ? COLUMN_ICONS[
              column.colType === "date" ? "date" : column.variableType
            ]
          : null;
        return (
          <Card
            key={index}
            size="small"
            title={
              <div className="flex items-center gap-2">
                {IconComponent && (
                  <IconComponent className="opacity-50" size={14} />
                )}
                {filterPreview ? (
                  <Tag color="blue" className="ml-2">
                    {filterPreview}
                  </Tag>
                ) : (
                  `Filter ${index + 1}`
                )}
              </div>
            }
            extra={
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFilter(index)}
              />
            }
          >
            <Space direction="vertical" className="w-full">
              <div className="flex gap-2">
                <Select
                  className="w-full"
                  value={filter.column}
                  onChange={(value) => updateFilter(index, "column", value)}
                  placeholder="Select column"
                >
                  {columns
                    .filter((col) => col.colType !== "date")
                    .map(renderColumnOption)}
                </Select>
                <Select
                  className="w-full"
                  value={filter.operator}
                  onChange={(value) => updateFilter(index, "operator", value)}
                  placeholder="Select operator"
                >
                  {column &&
                    getOperators(column).map((op) => (
                      <Option key={op} value={op}>
                        {op}
                      </Option>
                    ))}
                </Select>
              </div>
              {column && renderFilterInput(filter, index, column)}
            </Space>
          </Card>
        );
      })}
      <Button
        type="dashed"
        onClick={addFilter}
        className="w-full"
        icon={<PlusOutlined />}
      >
        Add Filter
      </Button>
    </Space>
  );
};

export default FilterBuilder;
