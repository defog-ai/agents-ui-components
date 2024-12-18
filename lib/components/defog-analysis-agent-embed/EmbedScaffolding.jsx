import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Upload } from "lucide-react";
/**
 * This is a scaffolding component
 * which allows us to have db selections and file upload buttons on top
 * the actual content inside of this component should be rendered as children of this component
 * for eg:
 * ```
 * <QueryDataStandalone {...props}>
 *   <Content>
 * </QueryDataStandalone>
 * ```
 */
export function EmbedScaffolding({
  rootClassNames = (selectedDb) => "",
  availableDbs = [],
  defaultSelectedDb = null,
  onDbChange = (...args) => {},
  children = null,
  fileUploading = false,
}) {
  const [selectedDb, setSelectedDb] = useState(defaultSelectedDb);

  useEffect(() => {
    setSelectedDb(defaultSelectedDb);
  }, [defaultSelectedDb]);

  return (
    <div
      className={twMerge(
        "w-full h-full p-2",
        typeof rootClassNames === "function" ? rootClassNames(selectedDb) : ""
      )}
    >
      <div className="w-full relative mb-4 text-gray-500 text-xs flex flex-row">
        <div className="h-full mr-2 font-bold z-10 whitespace-nowrap py-2">
          Dataset:
        </div>
        <div className="overflow-auto flex flex-row gap-2 px-2 items-center rounded-md">
          {availableDbs.map((db, i) => {
            return (
              <span
                data-testid="db-tab"
                data-selected-db={selectedDb === db}
                key={db + "-" + i}
                onClick={() => {
                  if (fileUploading) return;

                  setSelectedDb(db);
                  onDbChange(db);
                }}
                className={twMerge(
                  "p-2 bg-gray-200 border border-gray-300 rounded-full cursor-pointer whitespace-nowrap",
                  selectedDb === db
                    ? "bg-gray-600 border-transparent text-white"
                    : "hover:bg-gray-300",
                  fileUploading
                    ? "cursor-not-allowed bg-gray-200 text-gray-400 hover:bg-gray-200"
                    : ""
                )}
              >
                {db}
              </span>
            );
          })}
        </div>
        <div className="self-end ml-auto pl-3">
          <span
            data-testid="db-selection-file-upload"
            onClick={() => {
              if (fileUploading) return;

              setSelectedDb(null);
              onDbChange(null);
            }}
            className={twMerge(
              "text-xs p-2 border flex items-center border-secondary-highlight-1/5 bg-secondary-highlight-1/40 hover:bg-secondary-highlight-1 text-white  rounded-full cursor-pointer whitespace-nowrap",
              fileUploading
                ? "cursor-not-allowed bg-gray-200 text-gray-400 hover:bg-gray-200"
                : "",
              selectedDb === null ? "bg-secondary-highlight-1" : ""
            )}
          >
            Upload <Upload className="w-3 ml-1" />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
