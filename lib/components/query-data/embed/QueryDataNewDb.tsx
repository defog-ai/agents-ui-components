import { DropFiles, MessageManagerContext } from "@ui-components";
import {
  FILE_TYPES,
  isValidFileType,
  parseCsvFile,
  parseExcelFile,
  uploadFile,
} from "@utils/utils";
import { useContext, useState } from "react";

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

  return (
    <div className="h-full">
      <div className="flex items-center justify-center h-full">
        <DropFiles
          disabled={loading}
          rootClassNames="w-full h-full border p-4 rounded-md text-gray-400 text-center"
          iconClassNames="mx-auto"
          acceptedFileTypes={Object.values(FILE_TYPES)}
          showIcon={true}
          onFileSelect={async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // this is when the user selects a file from the file dialog
            try {
              let file = ev.target.files[0];
              if (!file || !isValidFileType(file.type)) {
                throw new Error("Only CSV or Excel files are accepted");
              }

              if (file.type === "text/csv") {
                parseCsvFile(file, async ({ file, rows, columns }) => {
                  try {
                    const dbName = await uploadFile(
                      apiEndpoint,
                      token,
                      file.name,
                      {
                        [file.name]: { rows, columns },
                      }
                    ).catch((e) => {
                      throw e;
                    });

                    onDbCreated(dbName);
                  } catch (e) {
                    throw e;
                  }
                });
              } else {
                parseExcelFile(file, async ({ file, sheets }) => {
                  try {
                    const dbName = await uploadFile(
                      apiEndpoint,
                      token,
                      file.name,
                      sheets
                    ).catch((e) => {
                      throw e;
                    });

                    onDbCreated(dbName);
                  } catch (e) {
                    throw e;
                  }
                });
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

              if (file.type === "text/csv") {
                parseCsvFile(file, async ({ file, rows, columns }) => {
                  try {
                    const dbName = await uploadFile(
                      apiEndpoint,
                      token,
                      file.name,
                      {
                        [file.name]: { rows, columns },
                      }
                    ).catch((e) => {
                      throw e;
                    });
                    message.success(`DB ${dbName} created successfully`);
                    console.log(dbName);
                    onDbCreated(dbName);
                  } catch (e) {
                    throw e;
                  }
                });
              } else {
                parseExcelFile(file, async ({ file, sheets }) => {
                  try {
                    const dbName = await uploadFile(
                      apiEndpoint,
                      token,
                      file.name,
                      sheets
                    ).catch((e) => {
                      throw e;
                    });
                    message.success(`DB ${dbName} created successfully`);
                    console.log(dbName);
                    onDbCreated(dbName);
                  } catch (e) {
                    throw e;
                  }
                });
              }
            } catch (e) {
              message.error(e.message || "Failed to parse the file");
              console.log(e.stack);
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
    </div>
  );
};
