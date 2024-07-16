// lets us query data with:
// 1. uploaded csv
// 2. selecting from a dropdown of available databses (aka keyNames aka api keys)
// allows editing the db metadata, and glossary
// allows passing predefined queries

import { useContext, useEffect, useState } from "react";
import {
  SingleSelect,
  SpinningLoader,
  DropFiles,
  MessageManagerContext,
} from "../../ui-components/lib/main";
import { parseCsvFile } from "../utils/utils";
import { twMerge } from "tailwind-merge";

export function QueryDataStandalone({
  keyName,
  token,
  rootClassNames = (selectedDb) => "",
  apiEndpoint = null,
  availableDbs = [],
  defaultSelectedDb = null,
  allowUploadFile = true,
  onDbChange = (...args) => {},
  onFileUploadSuccess = (...args) => {},
  children = null,
}) {
  const [selectedDb, setSelectedDb] = useState(defaultSelectedDb);
  const [parsingFile, setParsingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const messageManager = useContext(MessageManagerContext);

  const uploadFileToServer = async ({ file, parsedData, rows, columns }) => {
    try {
      const response = await fetch(`${apiEndpoint}/integration/upload_csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: parsedData,
          keyName: keyName,
          token: token,
        }),
      });
      const data = await response.json();
      console.log(data);

      if (data.status !== "success") {
        throw new Error("Failed to upload the file");
      }
      onFileUploadSuccess({ file, parsedData, columns, rows });
    } catch (e) {
      messageManager.error("Failed to upload the file");
      console.log(e.stack);
    } finally {
      setParsingFile(false);
      setLoading(false);
    }
  };

  console.log(selectedDb);

  return (
    <div
      className={twMerge(
        "w-full h-full p-2",
        typeof rootClassNames === "function" ? rootClassNames(selectedDb) : ""
      )}
    >
      <div className="w-full relative mb-4 text-gray-500 text-xs">
        <div className="w-16 font-bold absolute z-10 left-0 whitespace-nowrap py-2">
          Dataset:
        </div>
        <div className="pl-16 overflow-scroll flex flex-row gap-2 items-center rounded-md">
          {availableDbs.map((db, i) => {
            return (
              <span
                key={db + "-" + i}
                onClick={() => setSelectedDb(db)}
                className={twMerge(
                  "p-2 bg-gray-200 border border-gray-300 rounded-full cursor-pointer",
                  selectedDb === db
                    ? "bg-gray-600 border-transparent text-white"
                    : "hover:bg-gray-300 cursor-pointer"
                )}
              >
                {db}
              </span>
            );
          })}
        </div>
      </div>
      {allowUploadFile && !selectedDb && (
        <DropFiles
          disabled={loading}
          labelClassNames="text-sm"
          label={"Or drop a CSV"}
          rootClassNames="w-full max-w-96"
          contentClassNames="w-full bg-white p-4 ring-1 ring-gray-300 rounded-md shadow-sm"
          iconClassNames="text-gray-400"
          icon={
            parsingFile ? (
              <span className="text-xs">
                Parsing{" "}
                <SpinningLoader classNames="w-4 h-4 text-gray-300 ml-1" />
              </span>
            ) : null
          }
          onFileSelect={(ev) => {
            // this is when the user selects a file from the file dialog
            try {
              let file = ev.target.files[0];
              if (!file || file.type !== "text/csv") {
                throw new Error("Only CSV files are accepted");
              }
              setLoading(true);
              setParsingFile(true);

              parseCsvFile(file, uploadFileToServer);
            } catch (e) {
              messageManager.error("Failed to parse the file");
              setLoading(false);
              setParsingFile(false);
            }
          }}
          onDrop={(ev) => {
            ev.preventDefault();
            try {
              let file = ev?.dataTransfer?.items?.[0];
              if (
                !file ||
                !file.kind ||
                file.kind !== "file" ||
                file.type !== "text/csv"
              ) {
                throw new Error("Only CSV files are accepted");
              }

              file = file.getAsFile();

              setLoading(true);
              setParsingFile(true);

              parseCsvFile(file, uploadFileToServer);
            } catch (e) {
              messageManager.error("Failed to parse the file");
              console.log(e.stack);
              setLoading(false);
              setParsingFile(false);
            }
          }}
        >
          {/* <p className="text-gray-400 cursor-default block text-sm mb-2 font-bold">
            Or drop a CSV
          </p> */}
        </DropFiles>
      )}
      {children}
    </div>
  );
}
