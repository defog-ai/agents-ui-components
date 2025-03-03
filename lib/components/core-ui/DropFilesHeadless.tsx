import React from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  /**
   * The content of the dropzone.
   */
  children: React.ReactNode;
  /**
   * File types to be accepted.
   */
  acceptedFileTypes?: string[];
  /**
   * If true, the dropzone will be disabled.
   */
  disabled?: boolean;
  /**
   * Function to be called when files are dropped.
   */
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => {};
  /**
   * Function to be called when a file is selected.
   */
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => {};
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => {};
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => {};
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => {};
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Allows file selection from the finder or not. Defaults to true.
   */
  fileSelection?: boolean;
}

/**
 * A component that gives file dropping functionality with bare bones UI.
 * @param {Props} props
 * */
export function DropFilesHeadless({
  children,
  acceptedFileTypes = ["text/csv"],
  disabled = false,
  onDrop = (...args) => {},
  onFileSelect = (...args) => {},
  onDragOver = (...args) => {},
  onDragEnter = (...args) => {},
  onDragLeave = (...args) => {},
  rootClassNames = "",
  fileSelection = true,
}) {
  return (
    <div
      className={twMerge(
        "relative min-h-full min-w-full bg-transparent",
        rootClassNames
      )}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        onDrop(e);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        onDragLeave(e);
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
      {fileSelection && (
        <input
          aria-label=""
          accept={acceptedFileTypes.join(",")}
          className="w-full h-full z-[1] opacity-0 absolute left-0 top-0 cursor-pointer"
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
      )}
      {children}
    </div>
  );
}
