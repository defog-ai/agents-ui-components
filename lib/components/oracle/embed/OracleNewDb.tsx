import { OracleReportContext } from "@oracle";
import {
  DropFiles,
  MessageManagerContext,
  SpinningLoader,
} from "@ui-components";
import {
  arrayBufferToBase64,
  FILE_TYPES,
  isValidFileType,
  uploadFile,
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

  return (
    <div className="min-w-full min-h-full">
      <DropFiles
        disabled={loading}
        rootClassNames={twMerge(loading ? "hidden" : "")}
        acceptedFileTypes={Object.values(FILE_TYPES)}
        showIcon={true}
        onFileSelect={async (ev) => {
          setLoading(true);
          ev.preventDefault();
          ev.stopPropagation();
          try {
            // this is when the user selects a file from the file dialog
            let file = ev.target.files[0];
            if (!file || !isValidFileType(file.type)) {
              throw new Error("Only CSV or Excel files are accepted");
            }

            const buf = await file.arrayBuffer();

            if (file.type === "text/csv") {
              try {
                const { dbName } = await uploadFile(
                  apiEndpoint,
                  token,
                  file.name,
                  arrayBufferToBase64(buf)
                ).catch((e) => {
                  throw e;
                });
                message.success(`DB ${dbName} created successfully`);

                onDbCreated(dbName);
              } catch (e) {
                setLoading(false);
                throw e;
              }
            } else {
              try {
                const { dbName } = await uploadFile(
                  apiEndpoint,
                  token,
                  file.name,
                  arrayBufferToBase64(buf)
                ).catch((e) => {
                  throw e;
                });
                message.success(`DB ${dbName} created successfully`);

                onDbCreated(dbName);
              } catch (e) {
                setLoading(false);
                throw e;
              }
            }
          } catch (e) {
            console.error(e);
            message.error("Failed to parse the file");
          }
        }}
        onDrop={async (ev) => {
          setLoading(true);
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

            const start = performance.now();

            const buf = await file.arrayBuffer();
            if (file.type === "text/csv") {
              try {
                const { dbName } = await uploadFile(
                  apiEndpoint,
                  token,
                  file.name,
                  arrayBufferToBase64(buf)
                ).catch((e) => {
                  throw e;
                });

                const end = performance.now();
                console.log(`CSV upload took ${end - start}ms`);
                message.success(`DB ${dbName} created successfully`);

                onDbCreated(dbName);
              } catch (e) {
                setLoading(false);
                throw e;
              }
            } else {
              // parseExcelFile(file, async ({ file, sheets }) => {
              try {
                const { dbName } = await uploadFile(
                  apiEndpoint,
                  token,
                  file.name,
                  arrayBufferToBase64(buf)
                );
                message.success(`DB ${dbName} created successfully`);

                onDbCreated(dbName);
              } catch (e) {
                setLoading(false);
                throw e;
              }
            }
          } catch (e) {
            message.error(e.message || "Failed to parse the file");
            console.log(e.stack);
          }
        }}
      />
      {loading && (
        <div className="text-xs flex w-full h-full items-center justify-center gap-1">
          <SpinningLoader /> Uploading your file
        </div>
      )}
    </div>
  );
};
