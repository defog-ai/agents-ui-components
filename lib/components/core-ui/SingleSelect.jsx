import { isNumber } from "../utils/utils";
import { Check, ChevronsUpDownIcon, CircleX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

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
    rawValue: val,
  };
};

const matchingValue = (option, value) => {
  return option.value === value || option.rawValue === value;
};

/**
 * @typedef {Object} SingleSelectProps - The props for the component
 * @property {string} [rootClassNames=""] - Additional classes to be added to the root div.
 * @property {string} [popupClassName=""] - Additional classes to be added to the popup.
 * @property {string} [labelClassNames=""] - Additional classes to be added to the label.
 * @property {function} [onChange=null] - Function to be called when the value changes.
 * @property {any} [defaultValue=undefined] - The default value of the select.
 * @property {any} [value=undefined] - The value of the select.
 * @property {boolean} [disabled=false] - If true, the select will be disabled.
 * @property {Array<{label: any, value: any}>} [options=[]] - The options of the select.
 * @property {string} [label=null] - The label of the select.
 * @property {function} [optionRenderer=null] - Function to render the options.
 * @property {string} [placeholder="Select an option"] - The placeholder of the select.
 * @property {string} [size="default"] - The size of the select. Can be "default" or "small".
 * @property {boolean} [allowClear=true] - If true, the select will have a clear button.
 * @property {boolean} [allowCreateNewOption=true] - If true, the select will allow creating new options.
 * */

/**
 * SingleSelect component
 * @param {SingleSelectProps} props
 * */
export function SingleSelect({
  rootClassNames = "",
  popupClassName = "",
  labelClassNames = "",
  onChange = null,
  defaultValue = undefined,
  value = undefined,
  disabled = false,
  options = [],
  label = null,
  optionRenderer = null,
  placeholder = "Select an option",
  size = "default",
  allowClear = true,
  allowCreateNewOption = true,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        width: rect.width + "px",
        top: rect.bottom + 4 + "px",
        left: rect.left + "px",
      });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      return () => window.removeEventListener("scroll", updatePosition, true);
    }
  }, [open]);
  const ref = useRef(null);
  const [internalOptions, setInternalOptions] = useState(
    options.map((d) => ({
      value: isNumber(d.value) ? +d.value : d.value,
      label: d.label,
      rawValue: d.value,
    }))
  );

  useEffect(() => {
    setInternalOptions(
      options.map((d) => ({
        value: isNumber(d.value) ? +d.value : d.value,
        label: d.label,
        rawValue: d.value,
      }))
    );
  }, [options]);

  const filteredOptions =
    query === ""
      ? internalOptions
      : internalOptions.filter((option) => {
          const labelText = typeof option.label === 'string' ? option.label : 
            (Array.isArray(option.label?.props?.children) ? 
              option.label.props.children.filter(child => typeof child === 'string').join('') : 
              option.label?.props?.children || 
              ''
            );
          return labelText.toLowerCase().includes(query.toLowerCase());
        });

  useEffect(() => {
    if (open && filteredOptions.length > 0) {
      setHighlightIndex(0);
    }
  }, [open, query, filteredOptions.length]);

  // if there's no matching option
  // or if there's no exact match
  // create a new option
  if (
    allowCreateNewOption &&
    query !== "" &&
    (filteredOptions.length === 0 ||
      !filteredOptions.find(
        (option) => option.label === (isNumber(query) ? +query : query)
      ))
  ) {
    filteredOptions.push({
      label: query,
      value: isNumber(query) ? +query : query,
      rawValue: query,
    });
  }

  // find the option matching the default value
  const [selectedOption, setSelectedOption] = useState(
    internalOptions.find((option) => matchingValue(option, defaultValue)) ||
      null
  );

  useEffect(() => {
    // if the option in the value doesn't exist,
    // create a new option and add to internal options
    let opt =
      internalOptions.find((option) => matchingValue(option, value)) || null;

    // if the opt exists, set it as the selected option
    if (
      opt &&
      value !== null &&
      typeof value !== "undefined" &&
      opt.value !== selectedOption?.value
    ) {
      setSelectedOption(opt);
    } else if (
      !opt &&
      allowCreateNewOption &&
      value !== null &&
      typeof value !== "undefined"
    ) {
      opt = createNewOption(value);
      setInternalOptions([...internalOptions, opt]);
      setSelectedOption(opt);
    }
  }, [
    value,
    allowCreateNewOption,
    internalOptions,
    selectedOption?.value,
  ]);

  useEffect(() => {
    // if the selected option doesn't exist
    // in our internal options (this can happen if a newly created option was selected)
    // create a new options and add to internal options
    if (
      selectedOption &&
      allowCreateNewOption &&
      typeof selectedOption !== "undefined" &&
      !internalOptions.find((option) => option.value === selectedOption?.value)
    ) {
      const newOption = createNewOption(selectedOption?.value);
      setInternalOptions([...internalOptions, newOption]);
    }
    ref?.current?.blur?.();
  }, [selectedOption?.value, internalOptions, allowCreateNewOption]);

  return (
    <div className={twMerge("agui-item agui-select", rootClassNames)}>
      {label && (
        <label
          className={twMerge(
            "block text-xs mb-2 font-light text-gray-600",
            labelClassNames
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={twMerge(
            "w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-400 dark:focus:ring-blue-500 sm:text-sm sm:leading-6 hover:ring-2 hover:ring-inset hover:ring-blue-400 dark:hover:ring-blue-500 hover:cursor-pointer",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          )}
          value={query !== "" ? query : (typeof selectedOption?.label === 'string' ? selectedOption?.label : '') || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
            setQuery("");
          }}
          readOnly={disabled}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              setHighlightIndex((prev) => (prev + 1) % filteredOptions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              setHighlightIndex(
                (prev) =>
                  (prev - 1 + filteredOptions.length) % filteredOptions.length
              );
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && filteredOptions.length > 0 && highlightIndex >= 0) {
                const option = filteredOptions[highlightIndex];
                setSelectedOption(option);
                setQuery("");
                setOpen(false);
                if (onChange) onChange(option.value, option);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {allowClear && (
          <button
            type="button"
            className="absolute inset-y-0 right-10 flex items-center px-2 focus:outline-none"
            onMouseDown={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setSelectedOption(null);
              setQuery("");
              if (onChange) onChange(null, null);
            }}
          >
            <CircleX className="w-4 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400" />
          </button>
        )}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-2 focus:outline-none"
          onMouseDown={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setOpen(!open);
          }}
        >
          <ChevronsUpDownIcon
            className="h-5 w-5 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </button>
        {open && filteredOptions.length > 0 && (
          <ul
            style={{...dropdownStyle, minWidth: 'fit-content'}}
            className={twMerge(
              "z-[100] max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg border border-gray-200 dark:border-gray-700",
              popupClassName
            )}
          >
            {filteredOptions.map((option, idx) => (
              <li
                key={idx}
                className={twMerge(
                  "cursor-pointer select-none relative py-2 pl-3 pr-9 truncate",
                  popupOptionSizeClasses[size] ||
                    popupOptionSizeClasses["default"],
                  highlightIndex === idx ? "bg-blue-100" : ""
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelectedOption(option);
                  setQuery("");
                  setOpen(false);
                  if (onChange) onChange(option.value, option);
                }}
              >
                {optionRenderer ? optionRenderer(option) : (typeof option.label === 'string' ? option.label : option.label)}
                {selectedOption &&
                  matchingValue(option, selectedOption.value) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
