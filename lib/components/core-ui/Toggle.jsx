import React, { useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { twMerge } from "tailwind-merge";

/**
 * A simple toggle component.
 * @typedef {Object} ToggleProps
 * @property {React.ReactNode} [title=null] - The title of the toggle.
 * @property {React.ReactNode} [onLabel=null] - The label when the toggle is on.
 * @property {React.ReactNode} [offLabel=null] - The label when the toggle is off.
 * @property {boolean} [defaultOn=false] - The default state of the toggle.
 * @property {string} [titleClassNames=""] - Additional classes to be added to the title.
 * @property {string} [onClassNames=""] - Additional classes to be added to the on state.
 * @property {string} [offClassNames=""] - Additional classes to be added to the off state.
 * @property {string} [toggleClassNames=""] - Additional classes to be added to the toggle.
 * @property {string} [rootClassNames=""] - Additional classes to be added to the root div.
 * @property {string} [labelClasses=""] - Additional classes to be added to the label.
 * @property {boolean} [disabled=false] - If true, the toggle will be disabled.
 * @property {function} [onToggle=() => {}] - Function to be called when the toggle is toggled.
 */

/**
 * A simple toggle component.
 * @param {ToggleProps} props
 * */
export function Toggle({
  title = null,
  onLabel = null,
  offLabel = null,
  defaultOn = false,
  titleClassNames = "",
  onClassNames = "",
  offClassNames = "",
  toggleClassNames = "",
  rootClassNames = "",
  labelClasses = "",
  disabled = false,
  onToggle = (...args) => {},
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <div className={twMerge("flex flex-col", rootClassNames)}>
      {title && (
        <label
          className={twMerge(
            "block text-xs mb-2 font-light text-gray-600",
            titleClassNames
          )}
        >
          {title}
        </label>
      )}
      <Field
        as="div"
        className={twMerge("flex items-center", toggleClassNames)}
      >
        <Switch
          disabled={disabled}
          checked={on}
          onChange={(v) => {
            setOn(v);
            onToggle(v);
          }}
          className={twMerge(
            on ? "bg-indigo-600" : "bg-gray-200",
            "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-none focus:ring-indigo-600 focus:ring-offset-2",
            on ? onClassNames : offClassNames,
            !disabled ? "cursor-pointer" : "cursor-not-allowed"
          )}
        >
          <span
            aria-hidden="true"
            className={twMerge(
              on ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
          />
        </Switch>
        <Label
          as="div"
          className={twMerge(
            "ml-2 block text-xs font-light text-gray-600",
            labelClasses
          )}
        >
          {on ? onLabel : offLabel}
        </Label>
      </Field>
    </div>
  );
}
