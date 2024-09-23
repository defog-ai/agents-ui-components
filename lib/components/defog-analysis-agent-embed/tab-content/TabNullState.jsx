import React, { useContext, useState } from "react";
import { read, stream } from "xlsx";
import {
  DropFiles,
  MessageManagerContext,
  SingleSelect,
  SpinningLoader,
} from "@ui-components";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { parseCsvFile, parseExcelFile } from "../../utils/utils";

const FILE_TYPES = {
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  OLD_EXCEL: "application/vnd.ms-excel",
  CSV: "text/csv",
};

/**
 * SImple function to check if given gile type exists in the FILE_TYPES object
 */
function isValidFileType(fileType) {
  return Object.values(FILE_TYPES).includes(fileType);
}

export function TabNullState({
  availableDbs = [],
  onSelectDb = (...args) => {},
  onParseCsv = (...args) => {},
  onParseExcel = (...args) => {},
  fileUploading = false,
}) {
  const messageManager = useContext(MessageManagerContext);

  return (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <SingleSelect
        rootClassNames="w-96 max-w-[90%] border p-4 rounded-md"
        label={"Please select a database"}
        options={availableDbs.map((d) => {
          d.value = d.name;
          d.label = d.name;
          return d;
        })}
        disabled={fileUploading}
        onChange={(nm) => {
          onSelectDb(nm);
        }}
      />
      <DropFiles
        label="Or drop a CSV"
        rootClassNames="w-96 max-w-[90%] border p-4 rounded-md text-gray-400"
        disabled={fileUploading}
        onFileSelect={async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          // this is when the user selects a file from the file dialog
          try {
            let file = ev.target.files[0];
            if (!file || isValidFileType(file.type)) {
              throw new Error("Only CSV or Excel files are accepted");
            }

            if (file.type === "text/csv") {
              parseCsvFile(file, onParseCsv);
            } else {
              parseExcelFile(file, onParseExcel);
            }
          } catch (e) {
            messageManager.error("Failed to parse the file");
          }
        }}
        onDrop={async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          try {
            let file = ev?.dataTransfer?.items?.[0];
            if (!file || !file.kind || file.kind !== "file") {
              throw new Error("Invalid file");
            }

            if (!isValidFileType(file.type)) {
              throw new Error("Only CSV or Excel files are accepted");
            }

            file = file.getAsFile();

            if (file.type === "text/csv") {
              parseCsvFile(file, onParseCsv);
            } else {
              parseExcelFile(file, onParseExcel);
            }
          } catch (e) {
            messageManager.error(e.message || "Failed to parse the file");
            console.log(e.stack);
          }
        }}
        showIcon={false}
      >
        {fileUploading ? (
          <div className="text-sm">
            Uploading
            <SpinningLoader classNames="h-4 w-4 inline m-0 ml-2 text-gray-400" />
          </div>
        ) : (
          <>
            <span className="inline sm:hidden">Upload a CSV</span>
            <ArrowDownTrayIcon className="h-6 w-6 inline text-gray-400" />
          </>
        )}
      </DropFiles>
    </div>
  );
}
