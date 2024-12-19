import { isNumber } from "../utils/utils";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Check, ChevronsUpDownIcon, CircleX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

const inputSizeClasses = {
  default: "py-1.5 pl-3",
  small: "py-0 pl-3",
};

const popupSizeClasses = {
  default: "",
  small: "",
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
  }, [JSON.stringify(options)]);

  const filteredOptions =
    query === ""
      ? internalOptions
      : internalOptions.filter((option) => {
          return (option.label + "")
            .toLowerCase()
            .includes(query.toLowerCase());
        });

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
    JSON.stringify(internalOptions),
    selectedOption,
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
  }, [selectedOption, JSON.stringify(internalOptions), allowCreateNewOption]);

  return (
    <Combobox
      as="div"
      by="value"
      className={twMerge("agui-item agui-select", rootClassNames)}
      immediate={true}
      value={selectedOption}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(option) => {
        if (!option) return;
        setSelectedOption(option);

        if (option && onChange && typeof onChange === "function") {
          onChange(option.value, option);
        }
      }}
    >
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
        <ComboboxInput
          ref={ref}
          placeholder={placeholder}
          className={twMerge(
            "w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-400 dark:focus:ring-blue-500 sm:text-sm sm:leading-6",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          )}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onBlur={() => {
            setQuery("");
          }}
          displayValue={(option) => {
            return option && option?.label;
          }}
        />

        <ComboboxButton className="agui-item agui-btn absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          {allowClear && (
            <CircleX
              className="w-4 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                setSelectedOption(null);
                setQuery("");
                if (onChange && typeof onChange === "function") {
                  onChange(null, null);
                }
              }}
            />
          )}
          <ChevronsUpDownIcon
            className="h-5 w-5 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </ComboboxButton>

        {filteredOptions.length > 0 && (
          <ComboboxOptions
            anchor="bottom"
            className={twMerge(
              "agui-item agui-select-dropdown w-[var(--input-width)] z-50 mt-1 max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm absolute",
              popupSizeClasses[size] || popupSizeClasses["default"],
              popupClassName
            )}
          >
            {filteredOptions.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className={({ active }) =>
                  twMerge(
                    "agui-item agui-select-option relative cursor-default select-none",
                    popupOptionSizeClasses[size] ||
                      popupOptionSizeClasses["default"],
                    active
                      ? "bg-blue-500 dark:bg-blue-600 text-white"
                      : "text-gray-900 dark:text-gray-100",
                    optionRenderer ? "" : ""
                  )
                }
              >
                {({ selected, active }) => (
                  <>
                    {optionRenderer ? (
                      optionRenderer(option, { selected, active })
                    ) : (
                      <div className="flex items-center">
                        <span
                          className={twMerge(
                            "block truncate",
                            selected && "font-semibold"
                          )}
                        >
                          {option.label}
                        </span>

                        {selected ? (
                          <span
                            className={twMerge(
                              "absolute inset-y-0 right-0 flex items-center pr-4",
                              active
                                ? "text-white"
                                : "text-blue-500 dark:text-blue-400"
                            )}
                          >
                            <Check className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  );
}
