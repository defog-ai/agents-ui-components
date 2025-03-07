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

// Upload Progress Bar Component
const UploadProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="absolute bottom-1/3 left-0 right-0 mx-auto w-3/4 max-w-md bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className="mb-2 flex justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>Uploading files...</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
      
      {loading && uploadProgress > 0 && (
        <UploadProgressBar progress={uploadProgress} />
      )}
      
      <Button
        className={twMerge(
          "absolute bottom-1/4 p-4 left-0 right-0 mx-auto w-fit rounded-full z-[10] shadow-md",
          loading || !selectedFiles.length ? "pointer-events-none" : ""
        )}
        disabled={loading || selectedFiles.length === 0}
        variant="primary"
        onClick={async () => {
          console.time("OracleNewDb:uploadFiles");
          try {
            setLoading(true);
            setUploadProgress(0);
            
            console.time("OracleNewDb:uploadMultipleFilesAsDb");
            const { dbName } = await uploadMultipleFilesAsDb(
              apiEndpoint,
              token,
              selectedFiles,
              (progress) => {
                setUploadProgress(progress);
              }
            );
            console.timeEnd("OracleNewDb:uploadMultipleFilesAsDb");

            message.success(`DB ${dbName} created successfully`);
            onDbCreated(dbName);
          } catch (e) {
            console.error(`Error during file upload:`, e);
            message.error(e.message || "Failed to upload files");
          } finally {
            setLoading(false);
            console.timeEnd("OracleNewDb:uploadFiles");
          }
        }}
      >
        {selectedFiles.length > 0 ? (
          loading ? (
            <>
              <SpinningLoader />
              {uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : "Uploading"}
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
