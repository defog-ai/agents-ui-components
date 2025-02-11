import { Check, CircleX, X } from "lucide-react";
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

interface Option {
  label: string;
  value: string;
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
   * The default value of the multi select.
   */
  defaultValue?: Option["value"][];
  /**
   * The value of the multi select.
   */
  value?: Option["value"][];
  /**
   * If true, the multi select will be disabled.
   */
  disabled?: boolean;
  /**
   * The options to be displayed.
   */
  options?: Array<{ label: string; value: string }>;
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
  size?: string;
  /**
   * If true, the multi select will have a clear button.
   */
  allowClear?: boolean;
  /**
   * If true, the multi select will allow creating new options.
   */
  allowCreateNewOption?: boolean;
}

/**
 * MultiSelect component
 * @param {MultiSelectProps} props
 * */
export function MultiSelect(props: MultiSelectProps) {
  const {
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
  } = props;
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const [internalOptions, setInternalOptions] = useState(options);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // if this out of the window when rendering below the dropdown, render it on top
      if (rect.bottom + 4 + rect.height > window.innerHeight) {
        setDropdownStyle({
          position: "fixed",
          width: rect.width + "px",
          top: rect.top - rect.height - 60 + "px",
          left: rect.left + "px",
        });
      } else {
        setDropdownStyle({
          position: "fixed",
          width: rect.width + "px",
          top: rect.bottom + 4 + "px",
          left: rect.left + "px",
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

  useEffect(() => {
    if (open && filteredOptions.length > 0) {
      setHighlightIndex(0);
    }
  }, [open, query, filteredOptions.length]);

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

    // note on this dep array:
    // we need to do a stringify here because value is an array
    // and because of the default prop
  }, [JSON.stringify(value), allowCreateNewOption]);

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
            className="py-1 grow h-full rounded-md border-0 pr-12 ring-0 focus:ring-0 sm:text-sm sm:leading-6 bg-transparent hover:ring-2 hover:ring-inset hover:ring-blue-400 dark:hover:ring-blue-500 hover:cursor-pointer"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 100)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!open) {
                  setOpen(true);
                  return;
                }
                setHighlightIndex(
                  (prev) => (prev + 1) % filteredOptions.length
                );
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
                  if (selectedOptions.find((o) => o.value === option.value)) {
                    // If already selected, remove it
                    const newSelected = selectedOptions.filter(
                      (o) => o.value !== option.value
                    );
                    setSelectedOptions(newSelected);
                    if (onChange)
                      onChange(
                        newSelected.map((o) => o.value),
                        newSelected
                      );
                  } else {
                    // Add the option
                    const newSelected = [...selectedOptions, option];
                    setSelectedOptions(newSelected);
                    if (onChange)
                      onChange(
                        newSelected.map((o) => o.value),
                        newSelected
                      );
                  }
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {selectedOptions.map((opt, i) => {
            return tagRenderer ? (
              tagRenderer(opt)
            ) : (
              <div
                key={opt.value + "-" + i}
                className="border border-gray-300 dark:border-gray-600 shadow-sm flex flex-row bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 items-center rounded-md cursor-default px-3 py-1 text-xs"
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
            style={dropdownStyle}
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
                    popupOptionSizeClasses["default"],
                  highlightIndex === idx
                    ? "bg-blue-100 dark:bg-blue-900/50"
                    : ""
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  let newSelected: Option[] = [];
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
                // change highlight index on hover
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseLeave={() => setHighlightIndex(-1)}
              >
                {optionRenderer ? optionRenderer(option) : option.label}
                {selectedOptions.find((o) => o.value === option.value) && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <Check className="w-5 h-5" aria-hidden="true" />
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
