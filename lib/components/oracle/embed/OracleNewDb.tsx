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
            const startTime = performance.now();
            console.log(`[0ms] Starting file upload process`);
            
            const fileBufs = [];
            for (let file of selectedFiles) {
              const fileStartTime = performance.now();
              console.log(`[${Math.round(fileStartTime - startTime)}ms] Processing file: ${file.name}, size: ${file.size} bytes`);
              
              const bufferStartTime = performance.now();
              const buf = await file.arrayBuffer();
              console.log(`[${Math.round(performance.now() - startTime)}ms] ArrayBuffer created for ${file.name}, took ${Math.round(performance.now() - bufferStartTime)}ms`);
              
              const base64StartTime = performance.now();
              const base64Content = arrayBufferToBase64(buf);
              console.log(`[${Math.round(performance.now() - startTime)}ms] Base64 conversion for ${file.name}, took ${Math.round(performance.now() - base64StartTime)}ms, size: ${base64Content.length} chars`);
              
              fileBufs.push({
                file_name: file.name,
                base64_content: base64Content,
              });
              console.log(`[${Math.round(performance.now() - startTime)}ms] Added ${file.name} to upload queue, total processing time: ${Math.round(performance.now() - fileStartTime)}ms`);
            }

            console.log(`[${Math.round(performance.now() - startTime)}ms] All files processed, starting API call to uploadMultipleFilesAsDb`);
            const apiCallStartTime = performance.now();
            const { dbName, dbInfo } = await uploadMultipleFilesAsDb(
              apiEndpoint,
              token,
              fileBufs
            );
            console.log(`[${Math.round(performance.now() - startTime)}ms] API call completed, took ${Math.round(performance.now() - apiCallStartTime)}ms`);
            
            message.success(`DB ${dbName} created successfully`);
            onDbCreated(dbName);
            console.log(`[${Math.round(performance.now() - startTime)}ms] Total upload process completed`);
          } catch (e) {
            console.error(`Error during file upload:`, e);
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
