import { Check, CircleX, X } from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { isNumber } from "@utils/utils";

const inputSizeClasses = {
  default: "py-1.5 pl-3",
  small: "py-0 pl-3",
};

const popupOptionSizeClasses = {
  default: "py-2 pl-3 pr-9",
  small: "py-1 pl-3 pr-9",
};

function createNewOption(val: string) {
  return {
    label: val,
    // if numeric, convert, else keep as string
    value: isNumber(val) ? +val : val,
  };
}

interface Option {
  label: string;
  value: string | number; // adjusted so numeric is possible if you like
}

interface MultiSelectProps {
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Additional classes to be added to the popup.
   */
  popupClassName?: string;
  /**
   * Function to be called when the option is changed.
   */
  onChange?: (
    selectedValues: Option["value"][],
    selectedOptions: Option[]
  ) => void;
  /**
   * The default value of the multi select (uncontrolled).
   */
  defaultValue?: Option["value"][];
  /**
   * The value of the multi select (controlled).
   */
  value?: Option["value"][];
  /**
   * If true, the multi select will be disabled.
   */
  disabled?: boolean;
  /**
   * The options to be displayed.
   */
  options?: Option[];
  /**
   * The label of the multi select.
   */
  label?: string;
  /**
   * Function to render the option.
   */
  optionRenderer?: (option: Option) => React.ReactNode;
  /**
   * Function to render the tags which show the options that are selected.
   */
  tagRenderer?: (option: Option) => React.ReactNode;
  /**
   * The placeholder of the multi select.
   */
  placeholder?: string;
  /**
   * The size of the multi select. Can be "default" or "small".
   */
  size?: "default" | "small";
  /**
   * If true, the multi select will have a clear button.
   */
  allowClear?: boolean;
  /**
   * If true, the multi select will allow creating new options.
   */
  allowCreateNewOption?: boolean;
}

export function MultiSelect(props: MultiSelectProps) {
  const {
    rootClassNames = "",
    popupClassName = "",
    onChange,
    defaultValue = [],
    value,
    disabled = false,
    options = [],
    label,
    optionRenderer,
    tagRenderer,
    placeholder = "Select an option",
    size = "default",
    allowClear = true,
    allowCreateNewOption = true,
  } = props;

  // Determine if we are in controlled mode:
  // - if `value` is provided, use that as the single source of truth
  // - otherwise, use internal state.
  const isControlled = typeof value !== "undefined";

  // State for the user’s typed query in the input
  const [query, setQuery] = useState("");

  // State for whether dropdown is open
  const [open, setOpen] = useState(false);

  // For arrow-key highlighting in the dropdown
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Local selection state (uncontrolled mode). Just store values, not entire options.
  const [internalSelectedValues, setInternalSelectedValues] =
    useState<Option["value"][]>(defaultValue);

  // The "final" selected values are either from props.value (controlled)
  // or from internal state if uncontrolled.
  const selectedValues = isControlled
    ? (value as Option["value"][])
    : internalSelectedValues;

  // We'll store a local copy of options so we can add newly created ones:
  const [internalOptions, setInternalOptions] = useState<Option[]>(() => [
    ...options,
  ]);

  // Keep internalOptions in sync if the original `options` prop changes:
  useEffect(() => {
    setInternalOptions([...options]);
  }, [options]);

  // Because selectedValues might reference items not in the default options,
  // add them to internalOptions if allowCreateNewOption = true.
  useEffect(() => {
    if (!allowCreateNewOption) return;
    setInternalOptions((prev) => {
      let changed = false;
      const newList = [...prev];
      for (const val of selectedValues) {
        if (!newList.find((o) => o.value === val)) {
          changed = true;
          newList.push(createNewOption(String(val)));
        }
      }
      return changed ? newList : prev;
    });
  }, [selectedValues, allowCreateNewOption]);

  // The actual Option[] objects for the current selection
  const selectedOptions = useMemo(() => {
    return selectedValues
      .map((val) => internalOptions.find((o) => o.value === val))
      .filter(Boolean) as Option[];
  }, [selectedValues, internalOptions]);

  // Filtered options for the dropdown, based on the query
  const filteredOptions = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    const baseFiltered = internalOptions.filter((option) =>
      option.label.toString().toLowerCase().includes(lowerQuery)
    );
    // If we allow creating new, and the query doesn't match any existing label
    if (
      allowCreateNewOption &&
      query.trim() !== "" &&
      !baseFiltered.some((opt) => String(opt.label) === query)
    ) {
      const newOpt = createNewOption(query);
      return [...baseFiltered, newOpt];
    }
    return baseFiltered;
  }, [query, internalOptions, allowCreateNewOption]);

  // When dropdown opens, highlight the first item if it exists
  useEffect(() => {
    if (open && filteredOptions.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  }, [open, filteredOptions]);

  // position the dropdown
  const ref = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeightEstimate = 200; // adjust if you want
      const wantToOpenUpwards = spaceBelow < dropdownHeightEstimate;

      setDropdownStyle({
        position: "fixed",
        width: rect.width + "px",
        top: wantToOpenUpwards
          ? rect.top - 4 - dropdownHeightEstimate + "px"
          : rect.bottom + 4 + "px",
        left: rect.left + "px",
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition, true);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition, true);
    };
  }, [open, updatePosition]);

  const handleSelectOption = (option: Option) => {
    // If it's already selected, remove it; otherwise add it
    const isAlreadySelected = selectedValues.includes(option.value);
    let newSelectedValues: Array<Option["value"]>;
    if (isAlreadySelected) {
      newSelectedValues = selectedValues.filter((v) => v !== option.value);
    } else {
      newSelectedValues = [...selectedValues, option.value];
    }
    // Fire onChange
    if (onChange) {
      // Build the new selected options array
      const newSelectedOptions = newSelectedValues
        .map((val) => internalOptions.find((o) => o.value === val))
        .filter(Boolean) as Option[];
      onChange(newSelectedValues, newSelectedOptions);
    }
    // In uncontrolled mode, update local state
    if (!isControlled) {
      setInternalSelectedValues(newSelectedValues);
    }
    setQuery("");
    setOpen(false);
  };

  const handleRemoveOption = (valueToRemove: Option["value"]) => {
    const newSelectedValues = selectedValues.filter((v) => v !== valueToRemove);
    if (onChange) {
      const newSelectedOptions = newSelectedValues
        .map((val) => internalOptions.find((o) => o.value === val))
        .filter(Boolean) as Option[];
      onChange(newSelectedValues, newSelectedOptions);
    }
    if (!isControlled) {
      setInternalSelectedValues(newSelectedValues);
    }
  };

  const handleClearAll = () => {
    if (onChange) onChange([], []);
    if (!isControlled) {
      setInternalSelectedValues([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filteredOptions.length > 0 && highlightIndex >= 0) {
        const option = filteredOptions[highlightIndex];
        handleSelectOption(option);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className={twMerge(
        "agui-item agui-select agui-multiselect max-w-96",
        rootClassNames
      )}
    >
      {label && (
        <label className="block text-xs mb-2 font-light text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="flex flex-col">
          <div
            ref={ref}
            className={twMerge(
              "flex flex-col items-start w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-400 dark:focus-within:ring-blue-500 sm:text-sm sm:leading-6",
              inputSizeClasses[size],
              disabled
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            )}
            onMouseUp={() => {
              if (disabled) return;
              setOpen(true);
            }}
          >
            {/* Input for typing query */}
            <input
              disabled={disabled}
              className="flex-grow py-1 min-w-[4rem] w-full rounded-md border-0 pr-12 ring-0 focus:ring-0 sm:text-sm sm:leading-6 bg-transparent cursor-text outline-none"
              placeholder={placeholder}
              value={query}
              onChange={(event) => {
                if (!disabled) {
                  setQuery(event.target.value);
                  setOpen(true);
                }
              }}
              onFocus={() => {
                if (!disabled) {
                  setOpen(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setOpen(false), 200);
                setQuery("");
              }}
              onKeyDown={handleKeyDown}
            />
            {/* Clear button */}
            {allowClear && selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              >
                <CircleX className="w-4 h-4" />
              </button>
            )}
            <div className="flex flex-row flex-wrap gap-2">
              {/* Render selected tags */}
              {selectedOptions.map((opt, i) =>
                tagRenderer ? (
                  <div key={opt.value + "-" + i}>{tagRenderer(opt)}</div>
                ) : (
                  <div
                    key={opt.value + "-" + i}
                    className="border border-gray-300 dark:border-gray-600 shadow-sm flex flex-row bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 items-center rounded-md px-2 py-1 text-xs"
                  >
                    {opt.label}
                    {!disabled && (
                      <button
                        type="button"
                        onMouseUp={(e) => {
                          e.stopPropagation();
                          handleRemoveOption(opt.value);
                        }}
                        className="ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {open && !disabled && (
          <ul
            style={dropdownStyle}
            className={twMerge(
              "z-[100] bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-auto rounded-md py-1 text-base border border-gray-200 dark:border-gray-700",
              popupClassName
            )}
          >
            {filteredOptions.map((option, idx) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <li
                  key={String(option.value) + "-" + idx}
                  className={twMerge(
                    "cursor-pointer select-none relative text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800",
                    popupOptionSizeClasses[size] ||
                      popupOptionSizeClasses["default"],
                    highlightIndex === idx
                      ? "bg-blue-100 dark:bg-blue-900/50"
                      : ""
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseUp={() => handleSelectOption(option)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseLeave={() => setHighlightIndex(-1)}
                >
                  {optionRenderer ? optionRenderer(option) : option.label}
                  {/* Check icon if selected */}
                  {isSelected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                    </span>
                  )}
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                No options
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
