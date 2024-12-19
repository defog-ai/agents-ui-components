import { CircleAlert } from "lucide-react";
import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

const inputSizeClasses = {
  default: "py-1.5 pr-5 ",
  small: "py-0 pr-5",
};
/**
 * @typedef {Object} InputProps
 * @property {string} [value] - The value of the input. Setting this converts this to a controlled component.
 * @property {string} [defaultValue] - Default initial value of the input.
 * @property {string} [label] - Label for the input.
 * @property {string} [type] - The type of the input. Can be "text", "password", "email", "number", "tel", "url".
 * @property {string} [status] - The status of the input. Can be "error". If "error" is set, the input will have a red border.
 * @property {boolean} [disabled] - If true, the input will be disabled.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [placeholder] - Placeholder text for the input.
 * @property {string} [id] - Id of the input.
 * @property {string} [name] - Name of the input.
 * @property {function} [onChange] - Function to be called when the input value changes.
 * @property {function} [onPressEnter] - Function to be called when the enter key is pressed.
 * @property {object} [inputHtmlProps] - Additional props to be added to the input element.
 * @property {string} [inputClassNames] - Additional classes to be added to the input element.
 * @property {string} [size] - The size of the input. Can be "default" or "small".
 */

/**
 * @type {React.FC<InputProps>}
 * Input component
 */
let Input = forwardRef(function Input(
  {
    value = undefined,
    defaultValue = undefined,
    label = null,
    type = "text",
    status = null,
    disabled = false,
    rootClassNames = "",
    placeholder = "Enter text here",
    id = "",
    name = "text-input",
    onChange = (...args) => {},
    onPressEnter = (...args) => {},
    inputHtmlProps = {},
    inputClassNames = "",
    size = "default",
  },
  ref
) {
  return (
    <div
      className={twMerge(
        "agui-item agui-input text-gray-600 dark:text-gray-300",
        rootClassNames
      )}
    >
      {label && (
        <label
          htmlFor={name}
          className="block text-xs mb-2 font-light text-gray-600 dark:text-gray-400"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-md">
        <input
          ref={ref}
          type={type}
          name={name}
          id={id}
          className={twMerge(
            "focus:outline-none block w-full shadow-sm rounded-md border-0 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-inset",
            status !== "error"
              ? "focus:ring-blue-400 dark:focus:ring-blue-500"
              : "focus:ring-rose-400 ring-rose-400 dark:focus:ring-rose-500 dark:ring-rose-500",
            "text-[16px] lg:text-sm sm:leading-6",
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 focus:ring-gray-100 dark:focus:ring-gray-800 cursor-not-allowed"
              : "bg-white dark:bg-gray-900 dark:text-gray-100",
            inputSizeClasses[size] || inputSizeClasses["default"],
            inputClassNames
          )}
          placeholder={placeholder}
          aria-invalid="true"
          aria-describedby="email-error"
          disabled={disabled}
          onChange={(ev) => {
            if (disabled) return;
            onChange(ev);
          }}
          onKeyDown={(ev) => {
            if (disabled) return;
            if (ev.key === "Enter") {
              onPressEnter(ev);
            }
          }}
          {...inputHtmlProps}
          {...{ defaultValue, value }}
        />
        {status === "error" && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <CircleAlert
              className="h-5 w-5 stroke-rose-400 text-transparent"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
});
export { Input };
