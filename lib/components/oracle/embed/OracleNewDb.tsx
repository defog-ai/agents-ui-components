import {
  Button,
  DropFiles,
  MessageManagerContext,
  SpinningLoader,
} from "@ui-components";
import {
  FILE_TYPES,
  isValidFileType,
  uploadMultipleFilesAsDb,
} from "@utils/utils";
import { useContext, useState } from "react";
import { twMerge } from "tailwind-merge";

export const OracleNewDb = ({
  apiEndpoint,
  token,
  onDbCreated = (...args) => {},
}: {
  apiEndpoint: string;
  token: string;
  onDbCreated?: (dbName: string) => void;
}) => {
  const message = useContext(MessageManagerContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("Uploading");

  return (
    <div className="min-w-full min-h-full">
      <DropFiles
        disabled={loading}
        acceptedFileTypes={[".csv", ".xls", ".xlsx"]}
        showIcon={true}
        allowMultiple={true}
        selectedFiles={selectedFiles}
        onRemoveFile={(index) => {
          console.time("OracleNewDb:onRemoveFile");
          setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
          console.timeEnd("OracleNewDb:onRemoveFile");
        }}
        onFileSelect={async (ev) => {
          console.time("OracleNewDb:onFileSelect");
          ev.preventDefault();
          ev.stopPropagation();
          try {
            // this is when the user selects a file from the file dialog
            let files = ev.target.files;

            for (let file of files) {
              if (!file || !isValidFileType(file.type)) {
                throw new Error("Only CSV or Excel files are accepted");
              }
            }

            setSelectedFiles([...selectedFiles, ...files]);
          } catch (e) {
            console.error(e);
            message.error("Failed to parse the file");
          }
          console.timeEnd("OracleNewDb:onFileSelect");
        }}
        onDrop={async (ev) => {
          console.time("OracleNewDb:onDrop");
          ev.preventDefault();
          ev.stopPropagation();

          try {
            let dataTransferObjects: DataTransferItemList =
              ev?.dataTransfer?.items;

            let files: File[] = [];

            for (let dataTransferObject of dataTransferObjects) {
              if (
                !dataTransferObject ||
                !dataTransferObject.kind ||
                dataTransferObject.kind !== "file"
              ) {
                throw new Error("Invalid file");
              }

              if (!isValidFileType(dataTransferObject.type)) {
                throw new Error("Only CSV or Excel files are accepted");
              }

              let file = dataTransferObject.getAsFile();

              files.push(file);
            }
            setSelectedFiles([...selectedFiles, ...files]);
          } catch (e) {
            message.error(e.message || "Failed to parse the file");
            console.log(e.stack);
          }
          console.timeEnd("OracleNewDb:onDrop");
        }}
      />

      <Button
        className={twMerge(
          "absolute bottom-1/4 p-4 left-0 right-0 mx-auto w-fit rounded-full z-[10] shadow-md",
          loading || !selectedFiles.length ? "pointer-events-none" : ""
        )}
        disabled={loading || selectedFiles.length === 0}
        variant="primary"
        onClick={async () => {
          try {
            console.time("OracleNewDb:uploadFiles");
            setLoading(true);

            const timeout = setTimeout(() => {
              setLoadingMessage("Cleaning formatting niggles...");
            }, 4000);

            const { dbName } = await uploadMultipleFilesAsDb(
              apiEndpoint,
              token,
              selectedFiles
            );

            clearTimeout(timeout);

            message.success(`DB ${dbName} created successfully`);
            onDbCreated(dbName);
          } catch (e) {
            console.error(`Error during file upload:`, e);
            message.error(e.message || "Failed to upload files");
          } finally {
            setLoading(false);
            setLoadingMessage("");
            console.timeEnd("OracleNewDb:uploadFiles");
          }
        }}
      >
        {selectedFiles.length ? (
          loading ? (
            <>
              <SpinningLoader />
              {loadingMessage}
            </>
          ) : (
            "Click to upload"
          )
        ) : (
          "Select some files"
        )}
      </Button>
    </div>
  );
};
