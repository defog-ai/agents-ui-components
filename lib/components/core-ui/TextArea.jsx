import { CircleAlert } from "lucide-react";
import React, { forwardRef, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

function setHeight(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/**
 * @typedef {Object} TextAreaProps
 * @property {string} [value] - The value of the textarea. Setting this converts this to a controlled component.
 * @property {string} [defaultValue] - Default initial value of the textarea.
 * @property {string} [status] - The status of the textarea. Can be "error". If "error" is set, the textarea will have a red border.
 * @property {string} [label] - Label for the textarea.
 * @property {boolean} [disabled] - If true, the textarea will be disabled.
 * @property {number} [defaultRows] - Default number of rows for the textarea.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [textAreaClassNames] - Additional classes to be added to the textarea element.
 * @property {string} [placeholder] - Placeholder text for the textarea.
 * @property {string} [id] - Id of the textarea.
 * @property {string} [name] - Name of the textarea.
 * @property {function} [onChange] - Function to be called when the textarea value changes.
 * @property {function} [onKeyDown] - Function to be called when a key is pressed down.
 * @property {object} [textAreaHtmlProps] - Additional props to be added to the textarea element.
 * @property {boolean} [autoResize] - If true, the textarea will resize automatically based on the content.
 * @property {React.Ref<HTMLTextAreaElement>} [ref] - Forwarded Ref to the textarea element.
 */

/**
 * @type {React.FC<TextAreaProps>}
 * TextArea component
 * */
let TextArea = forwardRef(function TextArea(
  {
    value = undefined,
    defaultValue = undefined,
    status = null,
    label = null,
    disabled = false,
    defaultRows = 4,
    rootClassNames = "",
    textAreaClassNames = "",
    placeholder = "Enter text here",
    id = "",
    name = "text-input",
    onChange = (...args) => {},
    onKeyDown = (...args) => {},
    textAreaHtmlProps = {},
    autoResize = true,
  },
  ref
) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (autoResize && rootRef?.current) {
      const textArea = rootRef.current.querySelector("textarea");
      if (!textArea) return;

      setHeight(textArea);
    }
  });
  return (
    <div
      className={twMerge("text-gray-600 dark:text-gray-300", rootClassNames)}
      ref={rootRef}
    >
      {label && (
        <label htmlFor={name} className="block text-xs mb-2 font-light">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <div className="">
          <textarea
            data-testid={id}
            ref={ref}
            disabled={disabled}
            rows={defaultRows}
            name={name}
            id={id}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            className={twMerge(
              "focus:outline-none pl-2 block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600",
              "text-[16px] lg:text-sm leading-6",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              status !== "error"
                ? "focus:ring-blue-400 dark:focus:ring-blue-500"
                : "ring-rose-400 focus:ring-rose-400 dark:ring-rose-500 dark:focus:ring-rose-500",
              disabled
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 focus:ring-gray-100 dark:focus:ring-gray-700 cursor-not-allowed"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
              textAreaClassNames
            )}
            onFocus={(ev) => {
              if (autoResize) {
                setHeight(ev.target);
              }
            }}
            onChange={(ev) => {
              if (autoResize) {
                setHeight(ev.target);
              }
              onChange(ev);
            }}
            {...textAreaHtmlProps}
            {...{ defaultValue, value }}
          />
        </div>
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

export { TextArea };
