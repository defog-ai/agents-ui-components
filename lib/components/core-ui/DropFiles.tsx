import React, { useState } from "react";
import { Download, File, XCircle } from "lucide-react";
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
  selectedFiles = [],
  onRemoveFile,
}: DropFilesProps) {
  const [isDropping, setIsDropping] = useState<boolean>(false);
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      data-testid="file-drop"
      className={twMerge(
        "min-w-full relative flex flex-col grow items-center justify-center border dark:border-gray-600 p-4 rounded-md text-gray-400 dark:text-gray-200 cursor-pointer group",
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
        <div className="w-full">
          <div className="flex flex-wrap gap-2 my-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex items-center max-w-[85%]">
                  <File className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">
                    {formatFileSize(file.size)}
                  </span>
                  {onRemoveFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(index);
                      }}
                      className="ml-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
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
        <Download className={twMerge("h-6 w-6 mx-auto", iconClassNames)} />
      )}

      <p className="text-xs text-gray-400 group-hover:underline z-[2] mt-4 relative pointer-events-none">
        Or click anywhere to select from your computer
      </p>
      <input
        multiple={allowMultiple}
        aria-label=""
        accept={acceptedFileTypes.join(",")}
        className="w-full h-full z-[1] opacity-0 absolute left-0 top-0 cursor-pointer"
        type="file"
        title="Click to select file"
        disabled={disabled}
        onInput={(e) => {
          e.preventDefault();
          if (disabled) return;
          
          console.log("DropFiles: File input triggered", e.currentTarget.files);
          
          if (e.currentTarget.files && e.currentTarget.files.length > 0) {
            console.log("DropFiles: Files selected", Array.from(e.currentTarget.files).map(f => f.name));
            onFileSelect(e as React.ChangeEvent<HTMLInputElement>);
          } else {
            console.warn("DropFiles: No files in input event");
          }

          // set value to null jic user wants to upload the same file again
          e.currentTarget.value = null;
        }}
      ></input>
    </div>
  );
}
