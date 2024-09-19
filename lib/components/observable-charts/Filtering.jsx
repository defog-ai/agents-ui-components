import { useContext, useState, useCallback, useRef } from "react";
import {
  Select,
  Input,
  Button,
  DatePicker,
  Space,
  Card,
  Typography,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ChartStateContext } from "./ChartStateContext";
import { CalendarIcon, HashIcon, CaseSensitive } from "lucide-react";
import { Input as TextInput } from "@ui-components";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const FilterBuilder = ({ columns }) => {
  const [filters, setFilters] = useState([]);
  const chartState = useContext(ChartStateContext);
  const timeoutRef = useRef(null);

  const debounce = (func, delay) => {
    return (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const updateFilterFunction = useCallback(
    (currentFilters) => {
      // Check if all filters are empty or if there are no filters
      const allFiltersEmpty = currentFilters.every(
        (filter) => !filter.column || !filter.operator || filter.value === ""
      );

      if (allFiltersEmpty || currentFilters.length === 0) {
        // If all filters are empty or there are no filters, set the chart filter to null
        chartState.updateChartSpecificOptions({ filter: null }).render();
        return;
      }

      const filterFunction = (d) => {
        return currentFilters.every((filter) => {
          const { column, operator, value } = filter;
          if (!column || !operator || value === "") return true;

          const columnDef = columns.find((c) => c.dataIndex === column);
          const dValue = d[column];

          // Make string comparisons case-insensitive for categorical data
          const compareValue =
            columnDef.variableType === "categorical"
              ? typeof dValue === "string"
                ? dValue.toLowerCase()
                : dValue
              : dValue;
          const filterValue =
            columnDef.variableType === "categorical"
              ? typeof value === "string"
                ? value.toLowerCase()
                : value
              : value;

          switch (operator) {
            case "==":
              return compareValue == filterValue;
            case "!=":
              return compareValue != filterValue;
            case ">":
              return compareValue > filterValue;
            case "<":
              return compareValue < filterValue;
            case ">=":
              return compareValue >= filterValue;
            case "<=":
              return compareValue <= filterValue;
            case "in":
              return filterValue
                .split(",")
                .map((v) => v.trim().toLowerCase())
                .includes(compareValue);
            case "not in":
              return !filterValue
                .split(",")
                .map((v) => v.trim().toLowerCase())
                .includes(compareValue);
            case "contains":
              return compareValue.includes(filterValue);
            case "starts with":
              return compareValue.startsWith(filterValue);
            case "ends with":
              return compareValue.endsWith(filterValue);
            case "before":
              return (
                new Date(dValue).getTime() < new Date(filterValue).getTime()
              );
            case "after":
              return (
                new Date(dValue).getTime() > new Date(filterValue).getTime()
              );
            case "between":
              const [start, end] = filterValue.split(",");
              if (columnDef.colType === "date") {
                return (
                  new Date(dValue).getTime() >= new Date(start).getTime() &&
                  new Date(dValue).getTime() <= new Date(end).getTime()
                );
              }
              return compareValue >= start && compareValue <= end;
            default:
              return true;
          }
        });
      };

      // Update the filter function in the chart container
      chartState
        .updateChartSpecificOptions({ filter: filterFunction })
        .render();
    },
    [chartState]
  );

  const debouncedUpdateFilterFunction = useCallback(
    debounce(updateFilterFunction, 200),
    [updateFilterFunction]
  );

  const addFilter = () => {
    setFilters([...filters, { column: "", operator: "==", value: "" }]);
  };

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
    if (column.variableType === "categorical") {
      return [
        "==",
        "!=",
        "in",
        "not in",
        "contains",
        "starts with",
        "ends with",
      ];
    } else if (
      column.variableType === "quantitative" ||
      column.variableType === "integer"
    ) {
      return ["==", "!=", ">", "<", ">=", "<=", "between"];
    }
    // Commenting out date-specific operators
    // else if (column.colType === "date") {
    //   return ["==", "!=", "before", "after", "between"];
    // }
    return ["==", "!="];
  };

  const getFilterPreview = (filter, column) => {
    if (!filter.column || !filter.operator || filter.value === "") return "";
    console.log(column);
    const columnName = column ? column.title : filter.column;
    let preview = `${columnName} ${filter.operator} `;

    switch (filter.operator) {
      case "in":
      case "not in":
        preview += filter.value
          .split(",")
          .map((v) => `"${v.trim()}"`)
          .join(", ");
        break;
      case "between":
        const [start, end] = filter.value.split(",");
        preview += `${start} and ${end}`;
        break;
      default:
        preview += `"${filter.value}"`;
    }

    return preview;
  };

  const renderFilterInput = (filter, index, column) => {
    const commonInputProps = {
      className: "w-full",
      placeholder: "Value",
    };

    if (column.variableType === "categorical") {
      return (
        <TextInput
          {...commonInputProps}
          value={filter.value}
          onChange={(e) => updateFilter(index, "value", e.target.value)}
          placeholder={
            ["in", "not in"].includes(filter.operator)
              ? "Comma-separated values"
              : "Value"
          }
        />
      );
    }

    if (
      column.variableType === "quantitative" ||
      column.variableType === "integer"
    ) {
      if (filter.operator === "between") {
        return (
          <Input.Group compact>
            <TextInput
              {...commonInputProps}
              style={{ width: "50%" }}
              type="number"
              value={filter.value.split(",")[0] || ""}
              onChange={(e) =>
                updateFilter(
                  index,
                  "value",
                  `${e.target.value},${filter.value.split(",")[1] || ""}`
                )
              }
              placeholder="From"
            />
            <TextInput
              {...commonInputProps}
              style={{ width: "50%" }}
              type="number"
              value={filter.value.split(",")[1] || ""}
              onChange={(e) =>
                updateFilter(
                  index,
                  "value",
                  `${filter.value.split(",")[0] || ""},${e.target.value}`
                )
              }
              placeholder="To"
            />
          </Input.Group>
        );
      }
      return (
        <TextInput
          {...commonInputProps}
          type="number"
          value={filter.value}
          onChange={(e) => updateFilter(index, "value", e.target.value)}
        />
      );
    }

    // Commenting out date-specific input
    // if (column.colType === "date") {
    //   return filter.operator === "between" ? (
    //     <RangePicker
    //       {...commonInputProps}
    //       value={filter.value.split(",").map((v) => (v ? new Date(v) : null))}
    //       onChange={(dates, dateStrings) =>
    //         updateFilter(index, "value", dateStrings.join(","))
    //       }
    //     />
    //   ) : (
    //     <DatePicker
    //       {...commonInputProps}
    //       value={filter.value ? new Date(filter.value) : null}
    //       onChange={(date, dateString) =>
    //         updateFilter(index, "value", dateString)
    //       }
    //     />
    //   );
    // }

    return (
      <TextInput
        {...commonInputProps}
        value={filter.value}
        onChange={(e) => updateFilter(index, "value", e.target.value)}
      />
    );
  };

  const COLUMN_ICONS = {
    // date: CalendarIcon,
    quantitative: HashIcon,
    categorical: CaseSensitive,
  };

  const renderColumnOption = (column) => {
    // Skip date columns
    if (column.colType === "date") {
      return null;
    }

    const IconComponent = COLUMN_ICONS[column.variableType];
    return (
      <Option key={column.dataIndex} value={column.dataIndex}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {IconComponent && (
            <IconComponent style={{ opacity: 0.5 }} size={14} />
          )}
          <span>{column.title}</span>
        </div>
      </Option>
    );
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {IconComponent && (
                  <IconComponent style={{ opacity: 0.5 }} size={14} />
                )}
                {filterPreview ? (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
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
            <Space direction="vertical" style={{ width: "100%" }}>
              <div className="flex gap-2">
                <Select
                  style={{ width: "100%" }}
                  value={filter.column}
                  onChange={(value) => updateFilter(index, "column", value)}
                  placeholder="Select column"
                >
                  {columns
                    .filter((col) => col.colType !== "date") // Filter out date columns
                    .map(renderColumnOption)}
                </Select>
                <Select
                  style={{ width: "100%" }}
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
              <Text> </Text>
            </Space>
          </Card>
        );
      })}
      <Button type="dashed" onClick={addFilter} block icon={<PlusOutlined />}>
        Add Filter
      </Button>
    </Space>
  );
};

export default FilterBuilder;
