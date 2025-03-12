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
  rawValue?: any;
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
  /**
   * If true, the select will add an "Other" option that allows custom input.
   */
  showOtherOption?: boolean;
  /**
   * The label for the Other option. Defaults to "Other...".
   */
  otherOptionLabel?: string;
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
  showOtherOption = false,
  otherOptionLabel = "Other...",
}: SingleSelectProps) {
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customValue, setCustomValue] = useState("");

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

  // Process options, adding an "Other" option if showOtherOption is true
  const processedOptions = showOtherOption
    ? [...options, { value: "__other__", label: otherOptionLabel }]
    : options;

  const [internalOptions, setInternalOptions] = useState(
    processedOptions.map((d) => ({
      value: isNumber(d.value) ? +d.value : d.value,
      label: d.label,
      rawValue: d.value,
    }))
  );

  useEffect(() => {
    const opts = showOtherOption
      ? [...options, { value: "__other__", label: otherOptionLabel }]
      : options;

    setInternalOptions(
      opts.map((d) => ({
        value: isNumber(d.value) ? +d.value : d.value,
        label: d.label,
        rawValue: d.value,
      }))
    );
  }, [options, showOtherOption, otherOptionLabel]);

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
    query !== null &&
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
  const [selectedOption, setSelectedOption] = useState<Option | null>(
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

  /**
   * This is specifically to deal with the situation when:
   * 1. use selects "other"
   * 2. types in something which sets customValue
   * 3. clicks away WITHOUT creating a new option or pressing enter
   *
   * in that case, we will reset back to the option that was selected before the user selected "other".
   */
  const optionSelectedBeforeClickingOther = useRef<Option | null>(null);

  /**
   * This is specifically to deal with when the user uses their keyboard to select other.
   * This seems to behave differently from them using the mouse. The mouse click event is bound to the <li>
   * but the keyUp event is bound to the input itself. this seems to trigger an extra blur event *after* set state.
   * hence receiving the isOtherSelected as true, but having an empty customValue, leading to a reset.
   */
  const ignoreBlur = useRef(false);

  return (
    <div className={twMerge("agui-item agui-select", rootClassNames)}>
      {label && (
        <label
          className={twMerge(
            "block text-sm mb-2 font-medium text-gray-700 dark:text-gray-200",
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
          placeholder={isOtherSelected ? "Enter custom value..." : placeholder}
          className={twMerge(
            "w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 sm:text-sm sm:leading-6 ",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled && !isOtherSelected
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 dark:ring-gray-700 cursor-not-allowed hover:cursor-not-allowed"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-400 dark:focus:ring-blue-500 hover:ring-2 hover:ring-inset hover:ring-blue-400 dark:hover:ring-blue-500 hover:cursor-pointer"
          )}
          value={
            query !== null
              ? query
              : isOtherSelected && customValue
                ? customValue
                : typeof selectedOption?.label === "string"
                  ? selectedOption?.label
                  : selectedOption?.value || ""
          }
          onChange={(e) => {
            if (disabled) return;
            if (isOtherSelected) {
              setCustomValue(e.target.value);
              if (onChange) {
                const customOption = {
                  value: e.target.value,
                  label: e.target.value,
                  rawValue: e.target.value,
                };
                onChange(e.target.value, customOption);
              }
            }
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            if (!isOtherSelected) {
              setOpen(true);
            }
          }}
          onBlur={(e) => {
            setTimeout(() => {
              if (ignoreBlur.current) {
                ignoreBlur.current = false;
                return;
              }

              setOpen(false);
              if (isOtherSelected) {
                setIsOtherSelected(false);
                setSelectedOption(
                  optionSelectedBeforeClickingOther.current || null
                );
                optionSelectedBeforeClickingOther.current = null;
                setQuery(null);
                setCustomValue("");
              } else if (!allowCreateNewOption) {
                // if no allow create is allowed, clear the query
                setQuery(null);
                setCustomValue("");
              } else if (!isOtherSelected && allowCreateNewOption && query) {
                setQuery(null);
                setCustomValue("");
              }
            }, 200);
          }}
          readOnly={disabled && !isOtherSelected}
          onKeyUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
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

                if (option.value === "__other__" && showOtherOption) {
                  optionSelectedBeforeClickingOther.current = selectedOption;
                  setIsOtherSelected(true);
                  setSelectedOption(option);
                  // Keep the dropdown open for custom input
                  setQuery("");
                  setOpen(false);
                  ignoreBlur.current = true;
                  setTimeout(() => {
                    ref?.current?.focus();
                  }, 50);
                } else {
                  optionSelectedBeforeClickingOther.current = option;
                  setIsOtherSelected(false);
                  setSelectedOption(option);
                  setQuery(null);
                  setOpen(false);
                  if (onChange) onChange(option.value, option);
                }
              } else if (isOtherSelected && query !== null) {
                // Handle "Enter" when in custom input mode
                setCustomValue(query);
                setOpen(false);
                if (onChange) {
                  const customOption = {
                    value: query,
                    label: query,
                    rawValue: query,
                  };
                  onChange(query, customOption);
                }
                setQuery(null);
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
              if (disabled) return;
              setSelectedOption(null);
              setQuery(null);
              setIsOtherSelected(false);
              setCustomValue("");
              if (onChange) onChange(null, null);
            }}
          >
            <CircleX
              className={twMerge(
                "w-3.5 text-gray-300 dark:text-gray-400 ",
                disabled
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 dark:ring-gray-700 cursor-not-allowed hover:cursor-not-allowed"
                  : "hover:text-gray-500 dark:hover:text-gray-200"
              )}
            />
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
                  if (option.value === "__other__" && showOtherOption) {
                    optionSelectedBeforeClickingOther.current = selectedOption;
                    setIsOtherSelected(true);
                    setSelectedOption(option);
                    // Keep the dropdown open for custom input
                    setQuery("");
                    setOpen(false);
                    setTimeout(() => {
                      ref?.current?.focus();
                    }, 50);
                  } else {
                    optionSelectedBeforeClickingOther.current = option;
                    setIsOtherSelected(false);
                    setSelectedOption(option);
                    setQuery(null);
                    setOpen(false);
                    if (onChange) onChange(option.value, option);
                  }
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
