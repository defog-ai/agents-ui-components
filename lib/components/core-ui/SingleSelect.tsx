import { isNumber } from "@utils/utils";
import { Check, ChevronDown, CircleX } from "lucide-react";
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

type Option = {
  label: any;
  value: any;
};

interface SingleSelectProps {
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Additional classes to be added to the popup.
   */
  popupClassName?: string;
  /**
   * Additional classes to be added to the label.
   */
  labelClassNames?: string;
  /**
   * Function to be called when the value changes.
   */
  onChange?: (value: any, option: Option) => void;
  /**
   * The default value of the select.
   */
  defaultValue?: any;
  /**
   * The value of the select.
   */
  value?: any;
  /**
   * If true, the select will be disabled.
   */
  disabled?: boolean;
  /**
   * The options of the select.
   */
  options?: Option[];
  /**
   * The label of the select.
   */
  label?: string;
  /**
   * Function to render the options.
   */
  optionRenderer?: (option: Option) => React.ReactNode;
  /**
   * The placeholder of the select.
   */
  placeholder?: string;
  /**
   * The size of the select. Can be "default" or "small".
   */
  size?: string;
  /**
   * If true, the select will have a clear button.
   */
  allowClear?: boolean;
  /**
   * If true, the select will allow creating new options.
   */
  allowCreateNewOption?: boolean;
}

/**
 * SingleSelect component
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
}: SingleSelectProps) {
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const parentRect = ref.current.parentElement.getBoundingClientRect();

      // Calculate position relative to the parent container
      if (rect.bottom + 4 + rect.height + 240 > window.innerHeight) {
        // Position above the input
        setDropdownStyle({
          position: "absolute",
          width: "100%",
          bottom: "100%",
          marginBottom: "4px",
          left: "0",
          zIndex: 50,
        });
      } else {
        // Position below the input
        setDropdownStyle({
          position: "absolute",
          width: "100%",
          top: "100%",
          marginTop: "4px",
          left: "0",
          zIndex: 50,
        });
      }
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
    query === null
      ? internalOptions
      : internalOptions.filter((option) => {
          const labelText =
            typeof option.label === "string"
              ? option.label
              : Array.isArray(option.label?.props?.children)
                ? option.label.props.children
                    .filter((child) => typeof child === "string")
                    .join("")
                : option.label?.props?.children || "";
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
  }, [value, allowCreateNewOption, internalOptions, selectedOption?.value]);

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
            "block text-xs mb-2 font-light text-gray-600 dark:text-gray-300",
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
            "w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 sm:text-sm sm:leading-6 ",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 dark:ring-gray-700 cursor-not-allowed hover:cursor-not-allowed"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-400 dark:focus:ring-blue-500 hover:ring-2 hover:ring-inset hover:ring-blue-400 dark:hover:ring-blue-500 hover:cursor-pointer"
          )}
          value={
            query !== null
              ? query
              : typeof selectedOption?.label === "string"
                ? selectedOption?.label
                : selectedOption?.value || ""
          }
          onChange={(e) => {
            if (disabled) return;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
            setQuery(null);
          }}
          readOnly={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
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
                setQuery(null);
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
            className="absolute inset-y-0 flex items-center px-1 right-7 focus:outline-none"
            onMouseUp={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setSelectedOption(null);
              setQuery(null);
              if (onChange) onChange(null, null);
            }}
          >
            <CircleX className="w-3.5 text-gray-300 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-200" />
          </button>
        )}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-1.5 focus:outline-none"
          disabled={disabled}
          onMouseUp={(ev) => {
            if (disabled) return;
            ev.preventDefault();
            ev.stopPropagation();
            setOpen(!open);
          }}
        >
          <ChevronDown
            className={twMerge(
              "w-4 h-4 text-gray-400 dark:text-gray-300",
              disabled
                ? "text-gray-800 dark:text-gray-600 cursor-not-allowed"
                : ""
            )}
            aria-hidden="true"
            aria-disabled={disabled}
          />
        </button>
        {open && filteredOptions.length > 0 && (
          <ul
            style={{ ...dropdownStyle }}
            className={twMerge(
              "z-[100] w-fit max-w-full max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg border border-gray-200 dark:border-gray-700",
              popupClassName
            )}
          >
            {filteredOptions.map((option, idx) => (
              <li
                key={idx}
                className={twMerge(
                  "cursor-pointer select-none relative py-2 pl-3 pr-9 truncate text-gray-900 dark:text-gray-100",
                  popupOptionSizeClasses[size] ||
                    popupOptionSizeClasses["default"],
                  highlightIndex === idx
                    ? "bg-blue-100 dark:bg-blue-900/50"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                // change highlight index on hover
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseLeave={() => setHighlightIndex(-1)}
                // change selected option on click
                onMouseUp={(e) => {
                  e.preventDefault();
                  setSelectedOption(option);
                  setQuery(null);
                  setOpen(false);
                  if (onChange) onChange(option.value, option);
                }}
              >
                {optionRenderer
                  ? optionRenderer(option)
                  : typeof option.label === "string"
                    ? option.label
                    : option.label}
                {selectedOption &&
                  matchingValue(option, selectedOption.value) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Check
                        className="w-5 h-5 text-blue-500 dark:text-blue-400"
                        aria-hidden="true"
                      />
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
