import {
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
    <div className="w-3/4 max-w-md mx-auto">
      <div className="mb-2 flex justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>Uploading file...</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const QueryDataNewDb = ({
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Helper function to process and upload a file
  const processAndUploadFile = async (file: File) => {
    console.time("QueryDataNewDb:processAndUploadFile");
    if (!file || !isValidFileType(file.type)) {
      throw new Error("Only CSV or Excel files are accepted");
    }

    console.time("QueryDataNewDb:uploadMultipleFilesAsDb");
    const { dbName } = await uploadMultipleFilesAsDb(
      apiEndpoint, 
      token, 
      [file],
      (progress) => {
        setUploadProgress(progress);
      }
    );
    console.timeEnd("QueryDataNewDb:uploadMultipleFilesAsDb");

    message.success(`DB ${dbName} created successfully`);
    onDbCreated(dbName);
    console.timeEnd("QueryDataNewDb:processAndUploadFile");
  };

  return (
    <div className="min-w-full min-h-full">
      <DropFiles
        disabled={loading}
        rootClassNames={twMerge(loading ? "hidden" : "")}
        acceptedFileTypes={Object.values(FILE_TYPES)}
        showIcon={true}
        onFileSelect={async (ev) => {
          console.time("QueryDataNewDb:onFileSelect");
          setLoading(true);
          setUploadProgress(0);
          ev.preventDefault();
          ev.stopPropagation();
          try {
            // this is when the user selects a file from the file dialog
            let file = ev.target.files[0];
            await processAndUploadFile(file);
          } catch (e) {
            console.error(e);
            message.error(e.message || "Failed to parse the file");
          } finally {
            setLoading(false);
            console.timeEnd("QueryDataNewDb:onFileSelect");
          }
        }}
        onDrop={async (ev) => {
          console.time("QueryDataNewDb:onDrop");
          setLoading(true);
          setUploadProgress(0);
          ev.preventDefault();
          ev.stopPropagation();

          try {
            let dataTransferObject: DataTransferItem =
              ev?.dataTransfer?.items?.[0];

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
            await processAndUploadFile(file);
          } catch (e) {
            message.error(e.message || "Failed to parse the file");
            console.log(e.stack);
          } finally {
            setLoading(false);
            console.timeEnd("QueryDataNewDb:onDrop");
          }
        }}
      />
      {loading && (
        <div className="flex flex-col w-full h-full items-center justify-center gap-4 text-gray-600 dark:text-gray-300">
          <div className="text-xs flex gap-1">
            <SpinningLoader /> {uploadProgress > 0 ? `Uploading your file (${uploadProgress}%)` : "Uploading your file"}
          </div>
          {uploadProgress > 0 && (
            <div className="w-3/4 max-w-md">
              <UploadProgressBar progress={uploadProgress} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
