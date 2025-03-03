import React, { useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { twMerge } from "tailwind-merge";

/**
 * A simple toggle component.
 */
interface ToggleProps {
  /**
   * The title of the toggle.
   */
  title?: React.ReactNode;
  /**
   * The label when the toggle is on.
   */
  onLabel?: React.ReactNode;
  /**
   * The label when the toggle is off.
   */
  offLabel?: React.ReactNode;
  /**
   * The default state of the toggle.
   */
  defaultOn?: boolean;
  /**
   * Size
   */
  size?: "small" | "default" | "large";
  /**
   * Additional classes to be added to the title.
   */
  titleClassNames?: string;
  /**
   * Additional classes to be added to the on state.
   */
  onClassNames?: string;
  /**
   * Additional classes to be added to the off state.
   */
  offClassNames?: string;
  /**
   * Additional classes to be added to the toggle.
   */
  toggleClassNames?: string;
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Additional classes to be added to the label.
   */
  labelClasses?: string;
  /**
   * If true, the toggle will be disabled.
   */
  disabled?: boolean;
  /**
   * Function to be called when the toggle is toggled.
   */
  onToggle?: (on: boolean) => void;
}

const barClassNames = {
  small: "h-3 w-8",
  default: "h-5 w-9",
  large: "h-8 w-11",
};

const buttonClassNames = {
  small: "h-2 w-2",
  default: "h-4 w-4",
  large: "h-7 w-7",
};

/**
 * A simple toggle component.
 * @param {ToggleProps} props
 * */
export function Toggle({
  title = null,
  onLabel = null,
  offLabel = null,
  size = "default",
  defaultOn = false,
  titleClassNames = "",
  onClassNames = "",
  offClassNames = "",
  toggleClassNames = "",
  rootClassNames = "",
  labelClasses = "",
  disabled = false,
  onToggle = (...args) => {},
}: ToggleProps) {
  const [on, setOn] = useState(defaultOn);

  return (
    <div
      className={twMerge("agui-item agui-toggle flex flex-col", rootClassNames)}
    >
      {title && (
        <label
          className={twMerge(
            "block text-xs mb-2 font-light text-gray-600 dark:text-gray-400",
            titleClassNames
          )}
        >
          {title}
        </label>
      )}
      <Field
        as="div"
        className={twMerge(
          "agui-item agui-toggle-field flex items-center",
          toggleClassNames
        )}
      >
        <Switch
          disabled={disabled}
          checked={on}
          onChange={(v) => {
            setOn(v);
            onToggle(v);
          }}
          className={twMerge(
            on
              ? "bg-blue-500 dark:bg-blue-600"
              : "bg-gray-200 dark:bg-gray-700",
            "relative inline-flex items-center flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ",
            barClassNames[size],
            on ? onClassNames : offClassNames,
            !disabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          )}
        >
          <span
            aria-hidden="true"
            className={twMerge(
              on ? "right-0" : "right-full translate-x-full",
              "pointer-events-none absolute transform rounded-full bg-white dark:bg-gray-200 shadow ring-0 transition-all duration-[400ms] ease-in-out",
              buttonClassNames[size]
            )}
          />
        </Switch>
        <Label
          as="div"
          className={twMerge(
            "ml-2 block text-xs font-light text-gray-600 dark:text-gray-400",
            labelClasses
          )}
        >
          {on ? onLabel : offLabel}
        </Label>
      </Field>
    </div>
  );
}
