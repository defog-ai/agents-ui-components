/**
 * ColorPicker component mimics the antd ColorPicker using a native HTML input and Tailwind CSS.
 *
 * Props:
 * - value: current color value in HEX format
 * - onChange: callback when color is changed, receiving the new color as argument
 * - allowClear: whether to show clear button
 * - ...rest: additional props applied to input element
 */
export const ColorPicker = ({ value, onChange, allowClear, ...rest }) => {
  // Default to white if no value is provided
  const currentColor = value || "#ffffff";
  // Only show the value in the input if it's explicitly set
  const displayValue = value || "";

  return (
    <div className="flex items-center w-[100px] gap-2">
      <div className="relative inline-block">
        <input
          type="color"
          value={currentColor}
          onChange={(e) =>
            onChange &&
            onChange({ toHexString: () => e.target.value, cleared: false })
          }
          className="absolute inset-0 w-8 h-8 p-0 border rounded-md opacity-0 cursor-pointer"
          {...rest}
        />
        <div
          className="w-8 h-8 border border-gray-200 rounded-md shadow-sm"
          style={{ backgroundColor: currentColor }}
        />
      </div>
      <div className="flex-1">
        <input
          type="text"
          value={displayValue}
          onChange={(e) =>
            onChange &&
            onChange({ toHexString: () => e.target.value, cleared: false })
          }
          placeholder="#000000"
          className="w-[100px]  px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {allowClear && value && (
        <button
          onClick={() =>
            onChange && onChange({ toHexString: () => "", cleared: true })
          }
          className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          Clear
        </button>
      )}
    </div>
  );
};
