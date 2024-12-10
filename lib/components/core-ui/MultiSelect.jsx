import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { isNumber } from "../utils/utils";

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
  //   create a new option
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
    });
  }

  // find the option matching the default values
  const [selectedOptions, setSelectedOptions] = useState(
    defaultValue
      .map((val) => internalOptions.find((option) => option.value === val))
      .filter((opt) => opt)
  );

  useEffect(() => {
    const newInternalOptions = [...internalOptions];
    const newSelectedOptions = [];

    let missing = false;

    value.forEach((val) => {
      let opt = internalOptions.find((option) => option.value === val) || null;

      // if option doesn't exist, create a new one
      if (
        !opt &&
        allowCreateNewOption &&
        val !== null &&
        typeof val !== "undefined"
      ) {
        missing = true;
        opt = createNewOption(val);
        newInternalOptions.push(opt);
      }
      newSelectedOptions.push(opt);
    });

    if (missing) {
      setInternalOptions(newInternalOptions);
    }

    if (newSelectedOptions.length && value.length) {
      setSelectedOptions(newSelectedOptions);
    }
  }, [value, allowCreateNewOption, internalOptions, selectedOptions]);

  useEffect(() => {
    ref?.current?.blur?.();
    // if the selected option doesn't exist
    // in our internal options (this can happen if a newly created option was selected)
    // create a new options and add to internal options
    const newInternalOptions = [...internalOptions];
    let missing = false;
    selectedOptions.forEach((selectedOption) => {
      if (
        selectedOption.length &&
        allowCreateNewOption &&
        typeof selectedOption !== "undefined" &&
        !newInternalOptions.find(
          (option) => option.value === selectedOption?.value
        )
      ) {
        missing = true;
        const newOption = createNewOption(selectedOption?.value);
        newInternalOptions.push(newOption);
      }
      if (missing) {
        setInternalOptions(newInternalOptions);
      }
    });
  }, [selectedOptions, internalOptions, allowCreateNewOption]);

  return (
    <Combobox
      as="div"
      by="value"
      multiple
      immediate
      className={twMerge("max-w-96", rootClassNames)}
      value={selectedOptions}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(newSelectedOptions) => {
        if (!newSelectedOptions) return;
        setSelectedOptions(newSelectedOptions);

        if (newSelectedOptions && onChange && typeof onChange === "function") {
          onChange(
            newSelectedOptions.map((d) => d.value),
            newSelectedOptions
          );
        }
      }}
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
            disabled ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          )}
        >
          <ComboboxInput
            ref={ref}
            className={
              "py-1 grow h-full rounded-md border-0 pr-12 ring-0 focus:ring-0 sm:text-sm sm:leading-6 bg-transparent"
            }
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onBlur={() => {
              setQuery("");
            }}
          />
          {selectedOptions.map((opt, i) => {
            return tagRenderer ? (
              tagRenderer(opt)
            ) : (
              <div
                className="border border-gray-300 dark:border-gray-600 shadow-sm flex h-6 flex-row bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 items-center rounded-md cursor-default"
                key={opt.value + "-" + i}
              >
                <span className="pl-2">{opt.value}</span>
                <div
                  className="ml-2 w-4 rounded-r-md hover:bg-gray-400 dark:hover:bg-gray-600 hover:text-white dark:hover:text-gray-200 h-full flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    const newSel = selectedOptions.filter(
                      (selectedOption) => selectedOption.value !== opt.value
                    );
                    setSelectedOptions(newSel);
                    if (onChange && typeof onChange === "function") {
                      onChange(
                        newSel.map((d) => d.value),
                        newSel
                      );
                    }
                  }}
                >
                  <XMarkIcon className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>

        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          {allowClear && (
            <XCircleIcon
              className="w-4 fill-gray-200 hover:fill-gray-500 dark:fill-gray-700 dark:hover:fill-gray-400"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                setSelectedOptions([]);
                setQuery("");
                if (onChange && typeof onChange === "function") {
                  onChange([]);
                }
              }}
            />
          )}
          <ChevronUpDownIcon
            className="h-5 w-5 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </ComboboxButton>

        {filteredOptions.length > 0 && (
          <ComboboxOptions
            anchor="bottom"
            className={twMerge(
              "w-[var(--input-width)] z-50 mt-3 max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none sm:text-sm absolute",
              popupSizeClasses[size] || popupSizeClasses["default"],
              popupClassName
            )}
          >
            {filteredOptions.map((option, i) => (
              <ComboboxOption
                key={option.value + "-" + i}
                value={option}
                className={({ focus }) =>
                  twMerge(
                    "relative cursor-default select-none",
                    popupOptionSizeClasses[size] ||
                      popupOptionSizeClasses["default"],
                    focus ? "bg-blue-400 dark:bg-blue-500 text-white" : "text-gray-900 dark:text-gray-100"
                  )
                }
              >
                {({ focus, selected }) => {
                  return (
                    <>
                      {optionRenderer ? (
                        optionRenderer(option, focus, selected)
                      ) : (
                        <>
                          <span
                            className={twMerge(
                              "block truncate",
                              selected && "font-semibold"
                            )}
                          >
                            {option.label}
                          </span>
                        </>
                      )}
                      {selected && (
                        <span
                          className={twMerge(
                            "absolute inset-y-0 right-0 flex items-center pr-4",
                            focus ? "text-white" : "text-blue-400 dark:text-blue-500"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  );
                }}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  );
}
