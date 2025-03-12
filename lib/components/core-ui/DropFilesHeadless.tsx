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
   * Function to be called when valid files are dropped.
   * Receives the original event and an array of valid File objects.
   */
  onDrop?: (e: React.DragEvent<HTMLDivElement>, files: File[]) => void;
  /**
   * Function to be called when valid files are selected.
   * Receives the original event and an array of valid File objects.
   */
  onFileSelect?: (
    e: React.ChangeEvent<HTMLInputElement>,
    files: File[]
  ) => void;
  /**
   * Function to handle invalid files - default shows console warnings.
   */
  onInvalidFiles?: (
    e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
    invalidFiles: File[],
    message: string
  ) => void;
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  /**
   * Function to be called when a file is dragged over the dropzone.
   */
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Allows file selection from the finder or not. Defaults to true.
   */
  fileSelection?: boolean;
  /**
   * If true, allows multiple files to be dropped/selected. Defaults to false.
   */
  allowMultiple?: boolean;
}

/**
 * A component that gives file dropping functionality with bare bones UI.
 * @param {Props} props
 * */
export function DropFilesHeadless({
  children,
  acceptedFileTypes = ["text/csv"],
  disabled = false,
  onDrop = (e, files) => {},
  onFileSelect = (e, files) => {},
  onInvalidFiles = (e, invalidFiles, message) => {
    console.warn(`Invalid files: ${message}`, invalidFiles);
  },
  onDragOver = (...args) => {},
  onDragEnter = (...args) => {},
  onDragLeave = (...args) => {},
  rootClassNames = "",
  fileSelection = true,
  allowMultiple = false,
}: Props) {
  // Helper function to validate files against acceptedFileTypes
  const validateFiles = (
    e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
    fileList: FileList | File[]
  ): File[] => {
    const files = Array.from(fileList);

    // If no specific types are required, return all files
    if (!acceptedFileTypes || acceptedFileTypes.length === 0) {
      return files;
    }

    // Check if extensions (like .pdf) or MIME types (like application/pdf)
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    files.forEach((file) => {
      // Check if any of the accepted types matches this file
      const isValid = acceptedFileTypes.some((type) => {
        // Handle extension format (e.g., ".pdf")
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        // Handle MIME type format (e.g., "application/pdf")
        else {
          return file.type === type;
        }
      });

      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    });

    // Handle invalid files
    if (invalidFiles.length > 0) {
      const acceptedTypesStr = acceptedFileTypes.join(", ");
      onInvalidFiles(
        e,
        invalidFiles,
        `Only ${acceptedTypesStr} files are accepted.`
      );
    }

    return validFiles;
  };

  // Handler for drop events
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    const dataTransfer = e.dataTransfer;
    if (
      !dataTransfer ||
      !dataTransfer.files ||
      dataTransfer.files.length === 0
    ) {
      return;
    }

    const validFiles = validateFiles(e, dataTransfer.files);
    if (validFiles.length > 0) {
      // Pass both the original event and the validated files
      onDrop(e, validFiles);
    }
  };

  // Handler for file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    if (!e.currentTarget.files || e.currentTarget.files.length === 0) {
      console.warn("DropFilesHeadless: No files in input event");
      return;
    }

    const validFiles = validateFiles(e, e.currentTarget.files);
    if (validFiles.length > 0) {
      // Pass both the original event and the validated files
      onFileSelect(e, validFiles);
    }

    // Reset value so the same file can be selected again
    e.currentTarget.value = null;
  };

  return (
    <div
      className={twMerge(
        "relative min-h-full min-w-full bg-transparent",
        rootClassNames
      )}
      onDrop={handleDrop}
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
          multiple={allowMultiple}
          disabled={disabled}
          onChange={handleFileSelect}
        ></input>
      )}
      {children}
    </div>
  );
}
