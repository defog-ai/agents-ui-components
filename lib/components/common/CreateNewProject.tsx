import {
  Button,
  DropFiles,
  MessageManagerContext,
  SpinningLoader,
} from "@ui-components";
import { isValidFileType, createProjectFromFiles } from "@utils/utils";
import { useContext, useState } from "react";
import { twMerge } from "tailwind-merge";

const timeouts = [
  { message: "Checking format...", time: 4000 },
  { message: "Cleaning formatting niggles...", time: 10000 },
];

export const CreateNewProject = ({
  apiEndpoint,
  token,
  onClick = null,
  onProjectCreated = (...args) => {},
  children = null,
}: {
  apiEndpoint: string;
  token: string;
  onClick?: (selectedFiles: File[]) => Promise<void>;
  onProjectCreated?: (projectName: string, dbInfo: ProjectDbInfo) => void;
  children?: React.ReactNode;
}) => {
  const message = useContext(MessageManagerContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("Uploading");

  return (
    <div className="w-full h-full">
      <DropFiles
        disabled={loading}
        acceptedFileTypes={[".csv", ".xls", ".xlsx", ".pdf"]}
        showIcon={true}
        allowMultiple={true}
        selectedFiles={selectedFiles}
        onRemoveFile={(index) => {
          console.time("CreateNewProject:onRemoveFile");
          setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
          console.timeEnd("CreateNewProject:onRemoveFile");
        }}
        onFileSelect={async (ev, files) => {
          console.time("CreateNewProject:onFileSelect");
          try {
            // Our component has already filtered valid files for us
            setSelectedFiles([...selectedFiles, ...files]);
          } catch (e) {
            console.error(e);
            message.error("Failed to process the files");
          }
          console.timeEnd("CreateNewProject:onFileSelect");
        }}
        onDrop={async (ev, files) => {
          console.time("CreateNewProject:onDrop");
          try {
            // Our component has already filtered valid files for us
            setSelectedFiles([...selectedFiles, ...files]);
          } catch (e) {
            message.error(e.message || "Failed to process the files");
            console.log(e.stack);
          }
          console.timeEnd("CreateNewProject:onDrop");
        }}
        onInvalidFiles={(e, invalidFiles, errorMessage) => {
          console.warn("Invalid files:", errorMessage, invalidFiles);
          message.error("Only CSV or Excel files are accepted");
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
            if (onClick) {
              await onClick(selectedFiles);
              return;
            }

            console.time("CreateNewProject:uploadFiles");
            setLoading(true);

            const timeoutIds = timeouts.map(({ message, time }) => {
              return setTimeout(() => {
                setLoadingMessage(message);
              }, time);
            });

            setLoadingMessage("Sending to servers");

            const { projectName, dbInfo } = await createProjectFromFiles(
              apiEndpoint,
              token,
              selectedFiles
            );

            timeoutIds.forEach(clearTimeout);

            message.success(`Project ${projectName} created successfully`);
            onProjectCreated(projectName, dbInfo);
          } catch (e) {
            console.error(`Error during file upload:`, e);
            message.error(e.message || "Failed to upload files");
          } finally {
            setLoading(false);
            setLoadingMessage("");
            console.timeEnd("CreateNewProject:uploadFiles");
          }
        }}
      >
        {children ||
          (selectedFiles.length ? (
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
          ))}
      </Button>
    </div>
  );
};
