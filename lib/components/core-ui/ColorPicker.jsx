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
  return (
    <div className="flex w-fit items-center gap-1.5">
      <div className="relative inline-block">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) =>
            onChange && onChange({ toHexString: () => e.target.value })
          }
          className="absolute inset-0 p-0 border rounded opacity-0 cursor-pointer size-8"
          {...rest}
        />
        <div
          className="border border-gray-200 rounded shadow-sm size-8"
          style={{ backgroundColor: value || "#ffffff" }}
        />
      </div>
      <div className="flex-1">
        <input
          type="text"
          value={value || ""}
          onChange={(e) =>
            onChange && onChange({ toHexString: () => e.target.value })
          }
          placeholder="#000000"
          className="w-[100px] h-8 px-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {allowClear && value && (
        <button
          onClick={() => onChange && onChange({ toHexString: () => "" })}
          className="px-1.5 text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          Clear
        </button>
      )}
    </div>
  );
};
