import { useContext, useState, useCallback, useRef, useEffect } from "react";
import { SingleSelect, Button, TextArea } from "@ui-components";
import { ChartManagerContext } from "./ChartManagerContext";
import { HashIcon, CaseSensitive, Trash2, CirclePlus } from "lucide-react";

const FilterBuilder = ({ columns }) => {
  const [filters, setFilters] = useState([]);
  const chartManager = useContext(ChartManagerContext);
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
        ? (d) => {
            return currentFilters.every(
              ({ column, operator, value, isValid }) => {
                if (!isValid || !column || !operator || value === "")
                  return true;
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
              },
            );
          }
        : null;

      chartManager
        .updateChartSpecificOptions({ filter: filterFunction })
        .render();
    },
    [chartManager.config, columns],
  );

  const debouncedUpdateFilterFunction = useCallback(
    debounce(updateFilterFunction, 200),
    [updateFilterFunction],
  );

  useEffect(() => {
    const selectedColumnKeys = Object.values(
      chartManager.config.selectedColumns || {},
    ).flat();

    const newFilters = filters.map((filter) => ({
      ...filter,
      isValid:
        filter.column &&
        (selectedColumnKeys.includes(filter.column) || filter.column === ""),
    }));

    if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
      setFilters(newFilters);
      debouncedUpdateFilterFunction(newFilters);
    }
  }, [
    chartManager.config.selectedColumns,
    filters,
    debouncedUpdateFilterFunction,
  ]);

  const addFilter = () => {
    setFilters([
      ...filters,
      { column: "", operator: "==", value: "", isValid: true },
    ]);
  };

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    updateFilterFunction(newFilters);
  };

  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    if (field === "column") {
      const selectedColumn = columns.find((c) => c.dataIndex === value);
      newFilters[index][field] = selectedColumn ? value : "";
    } else {
      newFilters[index][field] = value;
    }
    setFilters(newFilters);

    // Immediate update for column/operator changes, debounced for value changes
    if (field === "column" || field === "operator") {
      updateFilterFunction(newFilters);
    } else {
      debouncedUpdateFilterFunction(newFilters);
    }
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

  const COLUMN_ICONS = {
    quantitative: HashIcon,
    categorical: CaseSensitive,
  };

  const renderColumnOption = (column) => {
    const IconComponent = COLUMN_ICONS[column.variableType];
    return {
      label: (
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="opacity-50" size={14} />}
          <span>{column.title}</span>
        </div>
      ),
      value: column.dataIndex,
    };
  };

  const renderFilterInput = (filter, index, column) => {
    const commonInputProps = {
      className: "w-full",
      placeholder: "Value",
      value: filter.value,
      onChange: (e) => updateFilter(index, "value", e.target.value),
    };

    if (filter.operator === "between") {
      const [start, end] = filter.value.split(",");
      return (
        <div className="flex gap-2">
          <TextArea
            {...commonInputProps}
            type="number"
            className="w-1/2"
            placeholder="From"
            value={start || ""}
            onChange={(e) =>
              updateFilter(index, "value", `${e.target.value},${end || ""}`)
            }
          />
          <TextArea
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
      <TextArea
        {...commonInputProps}
        size="small"
        autoResize={column.variableType !== "quantitative"}
        type={column.variableType === "quantitative" ? "number" : "text"}
        placeholder={
          ["in", "not in"].includes(filter.operator)
            ? "Comma-separated values"
            : "Value"
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <span className="flex items-center gap-2">Filters</span>
        </label>
        <p className="text-xs text-gray-500">
          Filter data based on selected columns
        </p>
      </div>

      <div className="space-y-2">
        {filters.map((filter, index) => {
          const column = columns.find((c) => c.dataIndex === filter.column);
          const IconComponent = column
            ? COLUMN_ICONS[column.variableType]
            : null;

          return (
            <div
              key={index}
              className="p-2 space-y-2 border border-gray-200 rounded-md bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {IconComponent && (
                    <IconComponent className="text-gray-400" size={13} />
                  )}
                  <span className="text-xs font-medium text-gray-700">
                    Filter {index + 1}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<Trash2 className="w-3 h-3" />}
                  onClick={() => removeFilter(index)}
                />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <SingleSelect
                    value={filter.column}
                    onChange={(value) => updateFilter(index, "column", value)}
                    placeholder="Select column"
                    options={columns
                      .filter(
                        (col) =>
                          col.dataIndex === filter.column ||
                          col.colType !== "date",
                      )
                      .map(renderColumnOption)}
                    allowClear
                  />
                  <SingleSelect
                    value={filter.operator}
                    disabled={!filter.isValid || !filter.column}
                    onChange={(value) => updateFilter(index, "operator", value)}
                    placeholder="Select operator"
                    options={
                      column
                        ? getOperators(column).map((op) => ({
                            label: op,
                            value: op,
                          }))
                        : []
                    }
                  />
                </div>
                {column && renderFilterInput(filter, index, column)}
              </div>

              {!filter.isValid && (
                <div className="text-xs text-red-500">
                  Filter may be outdated and not apply to the chart.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={addFilter}
        type="default"
        className="flex items-center justify-center w-full gap-2 mt-4 text-sm font-medium text-gray-700 border-gray-200 h-9 bg-gray-50 hover:bg-gray-100"
        icon={<CirclePlus className="w-4 h-4" />}
      >
        Add Filter
      </Button>
    </div>
  );
};

export default FilterBuilder;
