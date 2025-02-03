import { SingleSelect as Select } from "@ui-components";

// Define aggregation options
const AGGREGATE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Mean" },
];

// A modular component for aggregate function selection and color by selector
// Props:
// - selectedChart: the current chart type
// - aggregateFunction: the current aggregate function (defaulting to "sum")
// - onAggregateChange: callback when the aggregate function changes
// - chartSpecificOptions: chart specific settings containing aggregateFunction and colorBy
// - selectedColumns: currently selected columns for the chart
// - columns: available columns
// - handleColorByChange: callback when the color by value changes
export default function AggregateSelector({
  selectedChart,
  aggregateFunction,
  onAggregateChange,
}) {
  // Determine the effective aggregate function
  const effectiveAggregate = aggregateFunction || "sum";

  // Filter options: remove 'none' for line chart if exists, though here our options do not contain "none" by default
  const filteredOptions = AGGREGATE_OPTIONS.filter(
    (option) => option.value !== "none" || selectedChart !== "line"
  );

  return (
    <>
      <div>
        <Select
          style={{ width: "100%", minWidth: "100px" }}
          value={effectiveAggregate}
          onChange={onAggregateChange}
          options={filteredOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>
    </>
  );
}
