import { SingleSelect as Select } from "@ui-components";
import { twMerge } from "tailwind-merge";
// Define aggregation options
const AGGREGATE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Mean" },
];

// A modular component for aggregate function selection
// Props:
// - selectedChart: the current chart type
// - aggregateFunction: the current aggregate function (defaulting to "sum")
// - onAggregateChange: callback when the aggregate function changes
export default function AggregateSelector({
  selectedChart,
  aggregateFunction,
  onAggregateChange,
  rootClassNames = "",
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
          allowClear={false}
          rootClassNames={twMerge("w-24", rootClassNames)}
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
