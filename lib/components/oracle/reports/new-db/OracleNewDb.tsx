import { OracleReportContext } from "@oracle";
import { DropFiles, MessageManagerContext } from "@ui-components";
import {
  FILE_TYPES,
  isValidFileType,
  parseCsvFile,
  parseData,
  parseExcelFile,
  uploadFile,
} from "@utils/utils";
import { useContext, useState } from "react";

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
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex items-center justify-center h-full">
        <DropFiles
          disabled={loading}
          rootClassNames="border p-4 rounded-md text-gray-400"
          acceptedFileTypes={Object.values(FILE_TYPES)}
          showIcon={true}
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
                  const dbName = await uploadFile(
                    apiEndpoint,
                    token,
                    file.name,
                    {
                      [file.name]: { rows, columns },
                    }
                  );
                  message.success(`DB ${dbName} created successfully`);
                  console.log(dbName);
                  onDbCreated(dbName);
                });
              } else {
                parseExcelFile(file, async ({ file, sheets }) => {
                  const dbName = await uploadFile(
                    apiEndpoint,
                    token,
                    file.name,
                    sheets
                  );
                  message.success(`DB ${dbName} created successfully`);
                  console.log(dbName);
                  onDbCreated(dbName);
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
