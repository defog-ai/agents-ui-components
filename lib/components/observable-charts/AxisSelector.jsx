import { MultiSelect } from "@ui-components";
import { useEffect } from "react";
import { KEYMAP, matchesKey } from "../../constants/keymap";

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
  const handleKeyPress = (e) => {
    if (document.activeElement === document.body) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }
      if (axis === "x" && matchesKey(e.key, KEYMAP.SET_X_AXIS)) {
        e.preventDefault();
        // focus on the input inside the appropriate data-axis element
        const xAxisInput = document.querySelector('div[data-axis="x"] input');
        xAxisInput?.focus();
      }
      if (axis === "y" && matchesKey(e.key, KEYMAP.SET_Y_AXIS)) {
        e.preventDefault();
        // focus on the input inside the appropriate data-axis element
        const yAxisInput = document.querySelector('div[data-axis="y"] input');
        yAxisInput?.focus();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [axis]);

  return (
    <div data-axis={axis}>
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
    </div>
  );
}
