/**
 * ColorPicker component mimics the antd ColorPicker using a native HTML input and Tailwind CSS.
 *
 * Props:
 * - value: current color value in HEX format
 * - onChange: callback when color is changed, receiving the new color as argument
 * - ...rest: additional props applied to input element
 */
export const ColorPicker = ({ value, onChange, ...rest }) => {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) =>
        onChange && onChange({ toHexString: () => e.target.value })
      }
      className={`w-10 h-10 p-0 border rounded cursor-pointer`}
      {...rest}
    />
  );
};
