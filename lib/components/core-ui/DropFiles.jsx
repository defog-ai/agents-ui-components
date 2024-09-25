import React from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";

/**
 * @typedef {Object} DropFilesProps
 * @property {string} [label] - Label for the dropzone.
 * @property {string[]} [acceptedFileTypes] - Array of file types to be accepted.
 * @property {function} [onDrop] - Function to be called when files are dropped.
 * @property {function} [onFileSelect] - Function to be called when a file is selected.
 * @property {function} [onDragOver] - Function to be called when a file is dragged over the dropzone.
 * @property {function} [onDragEnter] - Function to be called when a file is dragged over the dropzone.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [iconClassNames] - Additional classes to be added to the icon.
 * @property {string} [contentClassNames] - Additional classes to be added to the content div.
 * @property {string} [labelClassNames] - Additional classes to be added to the label div.
 * @property {React.ReactNode} [children] - The content of the dropzone.
 * @property {boolean} [showIcon] - If true, the drop icon will be shown.
 * @property {boolean} [disabled] - If true, the dropzone will be disabled.
 */

/**
 * File dropping component with a UI. If you want something headless, use the DropFilesHeadless component which gives a minimal UI.
 * @param {DropFilesProps} props
 */
export function DropFiles({
  label = "Drop files here",
  acceptedFileTypes = ["text/csv"],
  onDrop = (...args) => {},
  onFileSelect = (...args) => {},
  onDragOver = (...args) => {},
  onDragEnter = (...args) => {},
  rootClassNames = "",
  iconClassNames = "",
  contentClassNames = "",
  labelClassNames = "",
  children = null,
  showIcon = null,
  disabled = false,
}) {
  return (
    <div
      data-testid="file-drop"
      className={twMerge("relative text-gray-600", rootClassNames)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        onDrop(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        onDragEnter(e);
      }}
      onDragOver={(e) => {
        // Prevent default behavior (Prevent file from being opened)
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        onDragOver(e);
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
      <div className={contentClassNames}>
        {children}
        {showIcon && (
          <ArrowDownTrayIcon className={twMerge("h-6 w-6", iconClassNames)} />
        )}
        <div className="mt-2 relative group cursor-pointer">
          <p className="cursor-pointer text-xs text-gray-400 group-hover:underline z-[2] relative pointer-events-none">
            Select from your computer
          </p>
          <input
            aria-label=""
            accept={acceptedFileTypes.join(",")}
            className="cursor-pointer w-full h-full z-[1] opacity-0 absolute left-0 top-0"
            type="file"
            disabled={disabled}
            onInput={(e) => {
              e.preventDefault();
              if (disabled) return;
              onFileSelect(e);

              // set value to null jic user wants to upload the same file again
              e.target.value = null;
            }}
          ></input>
        </div>
      </div>
    </div>
  );
}
