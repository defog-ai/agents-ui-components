import React, { useState } from "react";
import { Download, File, XCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { formatFileSize } from "@utils/utils";

interface DropFilesProps {
  /** Label for the dropzone. **/
  label?: string;
  /** Array of file types to be accepted. **/
  acceptedFileTypes?: string[];
  /** Function to be called when files are validated and dropped. **/
  onDrop?: (e: React.DragEvent<HTMLDivElement>, files: File[]) => void;
  /** Function to be called when files are validated and selected. **/
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>, files: File[]) => void;
  /** Function to handle invalid files - default shows console warnings **/
  onInvalidFiles?: (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>, invalidFiles: File[], message: string) => void;
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
  /** Currently selected files (optional) **/
  selectedFiles?: File[];
  /** Function to remove a file (optional) **/
  onRemoveFile?: (index: number) => void;
}

/**
 * File dropping component with a UI. If you want something headless, use the DropFilesHeadless component which gives a minimal UI.
 */
export function DropFiles({
  label = "Drop files here",
  acceptedFileTypes = ["text/csv"],
  onDrop = (e, files) => {},
  onFileSelect = (e, files) => {},
  onInvalidFiles = (e, invalidFiles, message) => {
    console.warn(`Invalid files: ${message}`, invalidFiles);
  },
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
  selectedFiles = [],
  onRemoveFile,
}: DropFilesProps) {
  const [isDropping, setIsDropping] = useState<boolean>(false);

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
    
    files.forEach(file => {
      // Check if any of the accepted types matches this file
      const isValid = acceptedFileTypes.some(type => {
        // Handle extension format (e.g., ".pdf")
        if (type.startsWith('.')) {
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
      const acceptedTypesStr = acceptedFileTypes.join(', ');
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

    setIsDropping(false);
    
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer || !dataTransfer.files || dataTransfer.files.length === 0) {
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
      console.warn("DropFiles: No files in input event");
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
      data-testid="file-drop"
      className={twMerge(
        "min-w-full min-h-full relative flex flex-col grow items-center justify-center border dark:border-gray-500 p-4 rounded-md text-gray-400 dark:text-gray-200 cursor-pointer group bg-white dark:bg-gray-800",
        isDropping
          ? "bg-dotted-blue dark:border-blue-500"
          : "bg-dotted-gray dark:border-gray-500",
        rootClassNames
      )}
      onDrop={handleDrop}
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
            "block text-xs mb-2 font-light text-gray-600 dark:text-gray-200 drop-shadow-[0_0_3px_rgba(255,255,255,0.75)] pointer-events-none text-center",
            labelClassNames
          )}
        >
          {label}
        </label>
      )}
      {children}

      {/* Display currently selected files */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="w-full z-20">
          <div className="flex flex-wrap gap-2 my-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <div className="flex items-center max-w-[85%]">
                  <File className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs mx-2">
                    {formatFileSize(file.size)}
                  </span>
                  {onRemoveFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        if (disabled) return;

                        e.stopPropagation();
                        onRemoveFile(index);
                      }}
                      className={twMerge(
                        "ml-1",
                        !disabled
                          ? "hover:text-red-500 dark:hover:text-red-400"
                          : "text-gray-300 dark:text-gray-600 opacity-0"
                      )}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show upload icon if there are no files or showIcon is true */}
      {(showIcon || selectedFiles.length === 0) && (
        <Download
          className={twMerge(
            "h-6 w-6 mx-auto text-gray-500 dark:text-gray-300",
            iconClassNames
          )}
        />
      )}

      <p className="text-xs text-gray-500 dark:text-gray-300 group-hover:underline z-[2] mt-4 relative pointer-events-none">
        Or click anywhere to select from your computer
      </p>
      <input
        multiple={allowMultiple}
        aria-label=""
        accept={acceptedFileTypes.join(",")}
        className={twMerge(
          "w-full h-full z-[1] opacity-0 absolute left-0 top-0",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        type="file"
        title={disabled ? "" : "Click to select file"}
        disabled={disabled}
        onChange={handleFileSelect}
      ></input>
    </div>
  );
}
