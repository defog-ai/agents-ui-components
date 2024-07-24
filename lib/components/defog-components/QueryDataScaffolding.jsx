import { useContext, useEffect, useState } from "react";
import {
  SpinningLoader,
  MessageManagerContext,
  DropFilesHeadless,
} from "../../ui-components/lib/main";
import { parseCsvFile } from "../utils/utils";
import { twMerge } from "tailwind-merge";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

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
export function QueryDataScaffolding({
  rootClassNames = (selectedDb) => "",
  availableDbs = [],
  defaultSelectedDb = null,
  allowUploadFile = true,
  onDbChange = (...args) => {},
  children = null,
  fileUploading = false,
  onParseCsv = (...args) => {},
}) {
  const [selectedDb, setSelectedDb] = useState(defaultSelectedDb);
  const [dropping, setDropping] = useState(false);
  const messageManager = useContext(MessageManagerContext);

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
        <div className="overflow-scroll flex flex-row gap-2 px-2 items-center rounded-md">
          {availableDbs.map((db, i) => {
            return (
              <span
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
          {allowUploadFile && (
            <DropFilesHeadless
              rootClassNames="flex items-center cursor-pointer group ml-auto self-end"
              disabled={fileUploading}
              onDragEnter={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                setDropping(true);

                console.log(ev.target);
              }}
              onDragLeave={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                setDropping(false);
              }}
              onFileSelect={(ev) => {
                console.log("here");
                // this is when the user selects a file from the file dialog
                try {
                  let file = ev.target.files[0];
                  if (!file) return;
                  if (file.type !== "text/csv") {
                    throw new Error("Only CSV files are accepted");
                  }
                  parseCsvFile(file, onParseCsv);
                } catch (e) {
                  messageManager.error(
                    e.message || "Only CSV files are accepted."
                  );
                  setDropping(false);
                }
              }}
              onDrop={(ev) => {
                console.log("here");
                ev.preventDefault();
                try {
                  let file = ev?.dataTransfer?.items?.[0];
                  console.log(file);
                  if (!file) return;
                  if (
                    !file.kind ||
                    file.kind !== "file" ||
                    file.type !== "text/csv"
                  ) {
                    throw new Error("Only CSV files are accepted");
                  }

                  file = file.getAsFile();

                  parseCsvFile(file, onParseCsv);
                } catch (e) {
                  messageManager.error(e.message || "Failed to parse the file");
                  console.log(e.stack);
                  setDropping(false);
                }
              }}
            >
              <span
                className={twMerge(
                  "rounded-full cursor-pointe p-2 flex items-center whitespace-nowrap",
                  fileUploading
                    ? "bg-gray-200 text-gray-400"
                    : "bg-secondary-highlight-1/40 text-white group-hover:bg-secondary-highlight-1 group-hover:text-white"
                )}
              >
                {fileUploading ? (
                  <>
                    Uploading
                    <SpinningLoader classNames="h-4 w-4 inline m-0 ml-2 text-gray-500" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {dropping ? "Drop here!" : "Upload / Drop a CSV"}
                    </span>
                    <span className="inline sm:hidden">Upload a CSV</span>
                    <ArrowDownTrayIcon className="h-4 w-4 inline ml-1" />
                  </>
                )}
              </span>
            </DropFilesHeadless>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
