import { CircleX, X } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { isNumber } from "../utils/utils";

const inputSizeClasses = {
  default: "py-1.5 pl-3",
  small: "py-0 pl-3",
};

const popupOptionSizeClasses = {
  default: "py-2 pl-3 pr-9",
  small: "py-1 pl-3 pr-9",
};

const createNewOption = (val) => {
  return {
    label: val,
    value: isNumber(val) ? +val : val,
  };
};

/**
 * @typedef {Object} MultiSelectProps
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [popupClassName] - Additional classes to be added to the popup.
 * @property {function} [onChange] - Function to be called when the option is changed.
 * @property {Array<{label: string, value: string}>} [defaultValue] - The default value of the multi select.
 * @property {Array<{label: string, value: string}>} [value] - The value of the multi select.
 * @property {boolean} [disabled] - If true, the multi select will be disabled.
 * @property {Array<{label: string, value: string}>} [options] - The options to be displayed.
 * @property {string} [label] - The label of the multi select.
 * @property {function} [optionRenderer] - Function to render the option.
 * @property {function} [tagRenderer] - Function to render the tag.
 * @property {string} [placeholder] - The placeholder of the multi select.
 * @property {string} [size] - The size of the multi select. Can be "default" or "small".
 * @property {boolean} [allowClear] - If true, the multi select will have a clear button.
 * @property {boolean} [allowCreateNewOption] - If true, the multi select will allow creating new options.
 */

/**
 * MultiSelect component
 * @param {MultiSelectProps} props
 * */
export function MultiSelect({
  rootClassNames = "",
  popupClassName = "",
  onChange = null,
  defaultValue = [],
  value = [],
  disabled = false,
  options = [],
  label = null,
  optionRenderer = null,
  tagRenderer = null,
  placeholder = "Select an option",
  size = "default",
  allowClear = true,
  allowCreateNewOption = true,
}) {
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const [internalOptions, setInternalOptions] = useState(options);
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const f = internalOptions.filter((option) =>
      option.label.toString().toLowerCase().includes(query.toLowerCase())
    );
    if (
      allowCreateNewOption &&
      query !== "" &&
      (!f.length ||
        !f.some(
          (option) => option.label === (isNumber(query) ? +query : query)
        ))
    ) {
      return [...f, createNewOption(query)];
    }
    return f;
  }, [query, internalOptions, allowCreateNewOption]);

  const [selectedOptions, setSelectedOptions] = useState(
    defaultValue
      .map((val) => internalOptions.find((option) => option.value === val))
      .filter(Boolean)
  );

  useEffect(() => {
    let hasMissing = false;
    const newInternalOptions = [...internalOptions];
    const newSelected = value
      .map((val) => {
        let option = internalOptions.find((opt) => opt.value === val);
        if (!option && allowCreateNewOption && val != null) {
          option = createNewOption(val);
          newInternalOptions.push(option);
          hasMissing = true;
        }
        return option;
      })
      .filter(Boolean);
    if (hasMissing) {
      setInternalOptions(newInternalOptions);
    }
    setSelectedOptions(newSelected);
  }, [value, allowCreateNewOption]);

  useEffect(() => {
    const newInternalOptions = [...internalOptions];
    let updated = false;
    selectedOptions.forEach((selected) => {
      if (
        selected &&
        allowCreateNewOption &&
        !newInternalOptions.some((option) => option.value === selected.value)
      ) {
        newInternalOptions.push(createNewOption(selected.value));
        updated = true;
      }
    });
    if (updated) {
      setInternalOptions(newInternalOptions);
    }
    ref?.current?.blur?.();
  }, [selectedOptions, internalOptions, allowCreateNewOption]);

  return (
    <div
      className={twMerge(
        "max-w-96 agui-item agui-select agui-multiselect",
        rootClassNames
      )}
    >
      {label && (
        <label className="block text-xs mb-2 font-light text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className={twMerge(
            "flex flex-row flex-wrap gap-2 items-start w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-400 dark:focus:ring-blue-500 sm:text-sm sm:leading-6",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          )}
          onClick={() => {
            ref.current.focus();
          }}
        >
          <input
            ref={ref}
            className="py-1 grow h-full rounded-md border-0 pr-12 ring-0 focus:ring-0 sm:text-sm sm:leading-6 bg-transparent"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 100)}
          />
          {selectedOptions.map((opt, i) => {
            return tagRenderer ? (
              tagRenderer(opt)
            ) : (
              <div
                key={opt.value + "-" + i}
                className="border border-gray-300 dark:border-gray-600 shadow-sm flex flex-row bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 items-center rounded-md cursor-default px-3 py-1"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newSelected = selectedOptions.filter(
                      (o) => o.value !== opt.value
                    );
                    setSelectedOptions(newSelected);
                    if (onChange)
                      onChange(
                        newSelected.map((d) => d.value),
                        newSelected
                      );
                  }}
                  className="ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {allowClear && selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOptions([]);
                if (onChange) onChange([], []);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
            >
              <CircleX className="w-4 h-4" />
            </button>
          )}
        </div>
        {open && (
          <ul
            style={{
              position: "fixed",
              width: ref.current?.getBoundingClientRect().width + "px",
              top: ref.current?.getBoundingClientRect().bottom + 4 + "px",
              left: ref.current?.getBoundingClientRect().left + "px",
            }}
            className={twMerge(
              "z-[100] bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-auto rounded-md py-1 text-base border border-gray-200 dark:border-gray-700",
              popupClassName
            )}
          >
            {filteredOptions.map((option, idx) => (
              <li
                key={option.value + "-" + idx}
                className={twMerge(
                  "cursor-pointer select-none relative px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800",
                  popupOptionSizeClasses[size] ||
                    popupOptionSizeClasses["default"]
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  let newSelected;
                  if (selectedOptions.find((o) => o.value === option.value)) {
                    newSelected = selectedOptions.filter(
                      (o) => o.value !== option.value
                    );
                  } else {
                    newSelected = [...selectedOptions, option];
                  }
                  setSelectedOptions(newSelected);
                  if (onChange)
                    onChange(
                      newSelected.map((d) => d.value),
                      newSelected
                    );
                  setQuery("");
                  setOpen(false);
                }}
              >
                {optionRenderer ? optionRenderer(option) : option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
