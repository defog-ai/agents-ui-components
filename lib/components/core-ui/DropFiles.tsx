import React, { useState } from "react";
import { Download } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface DropFilesProps {
  /** Label for the dropzone. **/
  label?: string;
  /** Array of file types to be accepted. **/
  acceptedFileTypes?: string[];
  /** Function to be called when files are dropped. **/
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Function to be called when a file is selected. **/
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function to be called when a file is dragged over the dropzone. **/
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Function to be called when a file is dragged over the dropzone. **/
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Function to be called when drag is over. **/
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Additional classes to be added to the root div. **/
  rootClassNames?: string;
  /** Additional classes to be added to the icon. **/
  iconClassNames?: string;
  /** Additional classes to be added to the content div. **/
  contentClassNames?: string;
  /** Additional classes to be added to the label div. **/
  labelClassNames?: string;
  /** The content of the dropzone. **/
  children?: React.ReactNode;
  /** If true, the drop icon will be shown. **/
  showIcon?: boolean;
  /** If true, the dropzone will be disabled. **/
  disabled?: boolean;
  /** If true, allows multiple files to be dropped/selected. **/
  allowMultiple?: boolean;
}

/**
 * File dropping component with a UI. If you want something headless, use the DropFilesHeadless component which gives a minimal UI.
 */
export function DropFiles({
  label = "Drop files here",
  acceptedFileTypes = ["text/csv"],
  onDrop = (...args) => {},
  onFileSelect = (...args) => {},
  onDragOver = (...args) => {},
  onDragEnter = (...args) => {},
  onDragLeave = (...args) => {},
  rootClassNames = "",
  iconClassNames = "",
  contentClassNames = "",
  labelClassNames = "",
  children = null,
  showIcon = null,
  disabled = false,
  allowMultiple = false,
}: DropFilesProps) {
  const [isDropping, setIsDropping] = useState<boolean>(false);

  return (
    <div
      data-testid="file-drop"
      className={twMerge(
        "min-w-full min-h-full relative flex flex-col grow items-center justify-center border dark:border-gray-600 p-4 rounded-md text-gray-400 dark:text-gray-200",
        isDropping ? "bg-dotted-blue" : "bg-dotted-gray",
        rootClassNames
      )}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        setIsDropping(false);

        onDrop(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        setIsDropping(true);

        onDragEnter(e);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        setIsDropping(false);

        onDragLeave(e);
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
            "block text-xs mb-2 font-light text-gray-600 dark:text-gray-300 drop-shadow-[0_0_3px_rgba(255,255,255,0.75)] ",
            labelClassNames
          )}
        >
          {label}
        </label>
      )}
      <div className={contentClassNames}>
        {children}
        {showIcon && (
          <Download className={twMerge("h-6 w-6 mx-auto", iconClassNames)} />
        )}
        <div className="mt-2 relative group cursor-pointer">
          <p className="cursor-pointer text-xs text-gray-400 dark:text-gray-500 group-hover:underline z-[2] relative pointer-events-none">
            Select from your computer
          </p>
          <input
            multiple={allowMultiple}
            aria-label=""
            accept={acceptedFileTypes.join(",")}
            className="cursor-pointer w-full h-full z-[1] opacity-0 absolute left-0 top-0"
            type="file"
            disabled={disabled}
            onInput={(e) => {
              e.preventDefault();
              if (disabled) return;
              onFileSelect(e as React.ChangeEvent<HTMLInputElement>);

              // set value to null jic user wants to upload the same file again
              e.currentTarget.value = null;
            }}
          ></input>
        </div>
      </div>
    </div>
  );
}
