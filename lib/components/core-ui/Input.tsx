import { CircleAlert, TriangleAlert } from "lucide-react";
import React, { forwardRef, Ref, useId } from "react";
import { twMerge } from "tailwind-merge";

const inputSizeClasses = {
  default: "py-1.5 pr-5 ",
  small: "py-0 pr-5",
};

interface InputProps {
  /** The value of the input. Setting this converts this to a controlled component. */
  value?: string | number;
  /** Default initial value of the input. */
  defaultValue?: string | number;
  /** Label for the input. */
  label?: string | React.ReactNode;
  /** The type of the input. Can be "text", "password", "email", "number", "tel", "url". */
  type?: string;
  /** The status of the input. Can be "error". If "error" is set, the input will have a red border. */
  status?: "error" | "warning" | null;
  /** If true, the input will be disabled. */
  disabled?: boolean;
  /** Additional classes to be added to the root div. */
  rootClassNames?: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Id of the input. */
  id?: string;
  /** Name of the input. */
  name?: string;
  /** Function to be called when the input value changes. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function to be called when the enter key is pressed. */
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Additional props to be added to the input element. */
  inputHtmlProps?: object;
  /** Additional classes to be added to the input element. */
  inputClassNames?: string;
  /** The size of the input. Can be "default" or "small". */
  size?: "default" | "small";
}

const statusClasses = {
  error:
    "focus:ring-rose-400 ring-rose-400 dark:focus:ring-rose-500 dark:ring-rose-500 pr-7",
  warning:
    "focus:ring-yellow-400 ring-yellow-400 dark:focus:ring-yellow-500 dark:ring-yellow-500 pr-7",
  default: "focus:ring-blue-400 dark:focus:ring-blue-500",
};

const statusIcons = {
  error: (
    <CircleAlert
      className="w-5 h-5 text-transparent stroke-rose-400"
      aria-hidden="true"
    />
  ),
  warning: (
    <TriangleAlert
      className="w-5 h-5 text-transparent stroke-yellow-400"
      aria-hidden="true"
    />
  ),
  default: <></>,
};

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
  }: InputProps,
  ref: Ref<HTMLInputElement>
) {
  const idInternal = useId();

  return (
    <div
      className={twMerge(
        "agui-item agui-input text-gray-600 dark:text-gray-300",
        rootClassNames
      )}
    >
      {label && (
        <label
          htmlFor={id || idInternal}
          className="block mb-2 text-xs font-light text-gray-600 dark:text-gray-400"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-md">
        <input
          ref={ref}
          type={type}
          name={name}
          id={id || idInternal}
          className={twMerge(
            "focus:outline-none block w-full shadow-sm px-2 rounded-md border-0 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-inset",
            "text-[16px] lg:text-sm sm:leading-6",
            inputSizeClasses[size] || inputSizeClasses["default"],
            statusClasses[status] || statusClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 focus:ring-gray-100 dark:focus:ring-gray-800 cursor-not-allowed"
              : "bg-white dark:bg-gray-900 dark:text-gray-100",
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
        {status && statusIcons[status] && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
            {statusIcons[status]}
          </div>
        )}
      </div>
    </div>
  );
});
export { Input };
