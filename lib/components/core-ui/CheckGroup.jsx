import React, { useState } from "react";

/**
 * @typedef {Object} CheckGroupProps - The props for the component
 * @property {Array<{id: string, title: string}>} options - The options to be displayed.
 * @property {string} title - The title of the check group.
 * @property {string} subhead - The subhead of the check group.
 * @property {boolean} disabled - If true, the check group will be disabled.
 * @property {string} defaultChecked - The default checked option.
 * @property {function} onChange - Function to be called when the option is changed.
 */

/**
 * CheckGroup component
 * @param {CheckGroupProps} props
 */
export function CheckGroup({
  options = [],
  title = "Select an option",
  onChange = (...args) => {},
  subhead = null,
  disabled = false,
  defaultChecked = null,
}) {
  const [selectedOption, setSelectedOption] = useState(
    defaultChecked || options?.[0]?.id
  );

  return (
    <fieldset className="">
      <legend className="text-sm font-semibold leading-6 text-gray-900">
        {title}
      </legend>
      {subhead && (
        <p className="mt-1 text-sm leading-6 text-gray-600">{subhead}</p>
      )}

      <div className="mt-2 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
        {options.map((opt, i) => (
          <div
            key={opt.id}
            className="flex items-center"
            onClick={() => {
              setSelectedOption(opt.id);
              onChange(opt);
            }}
          >
            <input
              id={opt.id}
              name="rg-group"
              disabled={disabled}
              value={opt.id}
              type="checkbox"
              checked={opt.id === selectedOption}
              onChange={() => {
                setSelectedOption(opt.id);
                onChange(opt);
              }}
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label
              htmlFor={opt.id}
              className="ml-3 block text-sm font-medium leading-6 text-gray-900"
            >
              {opt.title}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
