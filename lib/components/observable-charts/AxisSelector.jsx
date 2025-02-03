import { MultiSelect } from "@ui-components";

// A modular component for selecting an axis column
// Props:
// - axis: string ("x" or "y")
// - columns: array of available columns
// - selectedValue: the currently selected column key
// - onAxisChange: callback when the axis value changes
export default function AxisSelector({
  axis,
  columns,
  selectedValue,
  onAxisChange,
}) {
  return (
    <MultiSelect
      style={{ width: "100%", minWidth: "100px" }}
      value={
        Array.isArray(selectedValue)
          ? selectedValue
          : (selectedValue?.split("%%%%^^^%%%%") ?? [])
      }
      onChange={onAxisChange}
      placeholder={`Select ${axis.toUpperCase()} axis`}
      options={
        Array.isArray(columns)
          ? columns.map((col) => ({ label: col.title, value: col.key }))
          : null
      }
    />
  );
}
