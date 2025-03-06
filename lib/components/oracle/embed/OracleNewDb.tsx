import {
  Button,
  DropFiles,
  MessageManagerContext,
  SpinningLoader,
} from "@ui-components";
import {
  arrayBufferToBase64,
  FILE_TYPES,
  isValidFileType,
  uploadFile,
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

  return (
    <div className="min-w-full min-h-full">
      <DropFiles
        disabled={loading}
        // rootClassNames={twMerge(loading ? "hidden" : "")}
        acceptedFileTypes={Object.values(FILE_TYPES)}
        showIcon={true}
        allowMultiple={true}
        selectedFiles={selectedFiles}
        onRemoveFile={(index) => {
          setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        }}
        onFileSelect={async (ev) => {
          // setLoading(true);
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
        }}
        onDrop={async (ev) => {
          // setLoading(true);
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
            setLoading(true);
            const fileBufs = [];
            for (let file of selectedFiles) {
              const buf = await file.arrayBuffer();
              fileBufs.push({
                file_name: file.name,
                base64_content: arrayBufferToBase64(buf),
              });
            }

            const { dbName, dbInfo } = await uploadMultipleFilesAsDb(
              apiEndpoint,
              token,
              fileBufs
            );
            message.success(`DB ${dbName} created successfully`);
            onDbCreated(dbName);
          } catch (e) {
            message.error(e.message || "Failed to upload files");
          } finally {
            setLoading(false);
          }
        }}
      >
        {selectedFiles.length > 0 ? (
          loading ? (
            <>
              <SpinningLoader />
              Uploading
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
