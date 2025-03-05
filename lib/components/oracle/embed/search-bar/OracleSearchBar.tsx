import { getClarifications } from "@oracle";
import {
  AlertBanner,
  Dropdown,
  DropFilesHeadless,
  MenuItem,
  TextArea,
  Toggle,
} from "@ui-components";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { OracleEmbedContext } from "../OracleEmbedContext";
import {
  ChevronDown,
  Command,
  FileSpreadsheet,
  FileText,
  Info,
  Telescope,
  XCircle,
  Zap,
} from "lucide-react";
import {
  arrayBufferToBase64,
  formatFileSize,
  isValidFileType,
} from "@utils/utils";
import { statusDescriptions, Mode } from "./oracleSearchBarManager";
import { OracleReportClarifications } from "../../reports/report-creation/OracleReportClarifications";
import { twMerge } from "tailwind-merge";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "lib/components/query-data/analysis-tree-viewer/analysisTreeManager";

const modeDisplayName = {
  "query-data": "Fast data analysis",
  oracle: "Deep research",
};

const modeIcons: Record<Mode, React.ReactNode> = {
  "query-data": (
    <Zap className="w-5 stroke-yellow-500 dark:stroke-yellow-600" />
  ),
  oracle: <Telescope className="w-5 stroke-blue-500 dark:stroke-blue-400" />,
};

const modeDescriptions: Record<Mode, string> = {
  "query-data":
    "Executes quick, direct SQL queries to retrieve specific data points with minimal processing",
  oracle:
    "Performs in-depth analysis, synthesizing multiple data sources to generate comprehensive insights and structured reports",
};

export function OracleSearchBar({
  dbName,
  analysisTree = null,
  onClarified,
  onReportGenerated,
}: {
  dbName: string;
  analysisTree?: AnalysisTree | null;
  onClarified: (newDbName?: string) => void;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
  }) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const { searchBarManager, apiEndpoint, token } =
    useContext(OracleEmbedContext);

  const [isMac, setIsMac] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const loadingStatus = useRef<string>("");

  const newDbName = useRef<string | null>(null);
  const newDbInfo = useRef<DbInfo | null>(null);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const analysisTreeManager = useMemo<AnalysisTreeManager | null>(() => {
    if (analysisTree) {
      return AnalysisTreeManager(analysisTree);
    } else {
      return null;
    }
  }, [analysisTree]);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  const [clarificationStarted, setClarificationStarted] =
    useState<boolean>(false);

  const UploadedFileIcons = useMemo(() => {
    return draft?.uploadedDataFiles?.length || draft?.uploadedPDFs?.length ? (
      <div className="w-full">
        <div className="flex flex-wrap gap-2">
          {draft?.uploadedDataFiles?.length ? (
            <div className="flex flex-row items-center gap-2 w-full text-xs text-blue-600 dark:text-blue-400">
              <Info className="w-4 min-w-4" />
              <span>
                A new database will be created using your uploaded csv/excel
                files
              </span>
            </div>
          ) : (
            <></>
          )}
          {draft.uploadedDataFiles.map((file, index) => (
            <div
              key={`${file.fileName}-${index}`}
              className="flex items-center flex-wrap max-w-full overflow-hidden justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center max-w-[85%]">
                <FileSpreadsheet className="w-4 h-4 mr-2 flex-shrink-0 stroke-blue-500 dark:stroke-blue-400" />
                <span className="truncate max-w-40" title={file.fileName}>
                  {file.fileName}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">
                  {formatFileSize(file.size)}
                </span>
                {
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newDataFiles = draft.uploadedDataFiles?.filter(
                        (_, i) => i !== index
                      );

                      searchBarManager.setDraft((prev) => ({
                        ...prev,
                        uploadedDataFiles: newDataFiles,
                      }));

                      newDbInfo.current = null;
                      newDbName.current = null;
                    }}
                    className="cursor-pointer ml-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                }
              </div>
            </div>
          ))}
          {draft.uploadedPDFs.map((file, index) => (
            <div
              key={`${file.fileName}-${index}`}
              className="flex items-center flex-wrap max-w-full overflow-hidden justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center max-w-[85%]">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0 stroke-blue-500 dark:stroke-blue-400" />
                <span className="truncate max-w-40" title={file.fileName}>
                  {file.fileName}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">
                  {formatFileSize(file.size)}
                </span>
                {
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newPdfs = draft.uploadedPDFs?.filter(
                        (_, i) => i !== index
                      );

                      searchBarManager.setDraft((prev) => ({
                        ...prev,
                        uploadedPDFs: newPdfs,
                      }));
                    }}
                    className="cursor-pointer ml-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  }, [draft]);

  return (
    <>
      {errorMessage && (
        <div className="mb-4">
          <AlertBanner
            type="error"
            message={errorMessage}
            dismissable={true}
            onDismiss={() => setErrorMessage("")}
          />
        </div>
      )}

      <DropFilesHeadless
        rootClassNames="min-h-0 relative z-[2] rounded-2xl p-2 shadow-sm border bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
        fileSelection={false}
        allowMultiple={true}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropping(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropping(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropping(false);

          console.log("Drop event triggered");

          // Handle dropped files
          const dataTransfer = e.dataTransfer;
          if (!dataTransfer) {
            console.error("No dataTransfer in drop event");
            return;
          }

          // Log the number of files in both interfaces
          console.log(
            `Files in dataTransfer.files: ${dataTransfer.files ? dataTransfer.files.length : 0}`
          );
          console.log(
            `Items in dataTransfer.items: ${dataTransfer.items ? dataTransfer.items.length : 0}`
          );

          // Array to collect all files for processing
          const filesToProcess = [];

          // Prefer DataTransfer.files as it's more widely supported
          if (dataTransfer.files && dataTransfer.files.length > 0) {
            console.log("Processing files from dataTransfer.files");
            for (let i = 0; i < dataTransfer.files.length; i++) {
              const file = dataTransfer.files[i];
              console.log(`Checking file ${i}: ${file.name} (${file.type})`);

              if (isValidFileType(file.type, true)) {
                console.log(`File is valid: ${file.name}`);
                filesToProcess.push(file);
              } else {
                console.warn(
                  `Skipping invalid file type: ${file.type} (${file.name})`
                );
              }
            }
          }
          // As a fallback, try DataTransfer.items
          else if (dataTransfer.items && dataTransfer.items.length > 0) {
            console.log("Processing files from dataTransfer.items");
            for (let i = 0; i < dataTransfer.items.length; i++) {
              const item = dataTransfer.items[i];
              console.log(
                `Checking item ${i}: kind=${item.kind}, type=${item.type}`
              );

              if (item.kind === "file" && isValidFileType(item.type, true)) {
                const file = item.getAsFile();
                if (file) {
                  console.log(`Item converted to file: ${file.name}`);
                  filesToProcess.push(file);
                }
              }
            }
          }

          console.log(`Total valid files to process: ${filesToProcess.length}`);

          if (filesToProcess.length === 0) {
            console.error("No valid files found");
            throw new Error(
              "No valid files found. Only CSV, Excel or PDF files are accepted."
            );
          }

          // Process all collected files
          for (const file of filesToProcess) {
            try {
              console.log(`Processing file: ${file.name}`);
              const buf = await file.arrayBuffer();

              if (file.type.endsWith("pdf")) {
                console.log(`Adding PDF: ${file.name}`);
                searchBarManager.setDraft((prev) => {
                  const newPDFs = [
                    ...prev.uploadedPDFs,
                    {
                      buf,
                      fileName: file.name,
                      size: file.size,
                      type: file.type,
                      isCsv: false,
                      isPdf: true,
                    },
                  ];
                  console.log(`Total PDFs after adding: ${newPDFs.length}`);
                  return {
                    ...prev,
                    uploadedPDFs: newPDFs,
                  };
                });
              } else {
                console.log(`Adding data file: ${file.name}`);
                searchBarManager.setDraft((prev) => {
                  console.log(prev);
                  const newDataFiles = [
                    ...prev.uploadedDataFiles,
                    {
                      buf,
                      fileName: file.name,
                      size: file.size,
                      type: file.type,
                      isPdf: false,
                      isCsv: true,
                    },
                  ];
                  console.log(
                    `Total data files after adding: ${newDataFiles.length}`
                  );
                  return {
                    ...prev,
                    uploadedDataFiles: newDataFiles,
                  };
                });
              }
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
            }
          }

          // Reset database info since we've added new files
          newDbName.current = null;
          newDbInfo.current = null;
        }}
      >
        {draft.status !== "clarifications_received" && (
          <div className="text-lg dark:text-gray-200 font-light mb-4">
            {statusDescriptions[draft.status]}
          </div>
        )}
        <TextArea
          prefix={UploadedFileIcons}
          ref={textAreaRef}
          rootClassNames="w-full"
          textAreaClassNames="border-0 outline-0 ring-0 shadow-none focus:ring-0 bg-gray-50"
          suffix={
            <div className="flex flex-col">
              <div className="dark:text-gray-400 border-b dark:border-gray-700 pb-2">
                Press{" "}
                {isMac ? (
                  <>
                    <Command className="inline align-middle w-2.5" />+ Enter
                  </>
                ) : (
                  "Ctrl + Enter"
                )}{" "}
                to start. Drop PDFs to add context to the report. Drop CSV or
                Excel files to analyse them.
              </div>

              <div className="flex flex-row mt-2 gap-4 items-center">
                <Dropdown
                  trigger={
                    <>
                      {modeIcons[draft.mode]}
                      <span className="whitespace-nowrap">
                        {modeDisplayName[draft.mode]}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  }
                >
                  {Object.entries(modeIcons).map(([key, icon]) => (
                    <MenuItem
                      className="w-96"
                      onClick={() => searchBarManager.setMode(key as Mode)}
                      active={draft.mode === key}
                    >
                      <div className="flex flex-col gap-2">
                        <span className="flex flex-row items-center gap-2">
                          {icon}
                          {modeDisplayName[key]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {modeDescriptions[key]}
                        </span>
                      </div>
                    </MenuItem>
                  ))}
                </Dropdown>
                {draft.mode === "oracle" ? (
                  <Toggle
                    // size="small"
                    // title="Use web search to enhance report"
                    onLabel="Use web search to enhance report"
                    offLabel="Use web search to enhance report"
                    defaultOn={draft.useWebsearch}
                    disabled={
                      clarificationStarted || Boolean(draft.clarifications)
                    }
                    onToggle={(value) => {
                      searchBarManager.setDraft((prev) => ({
                        ...prev,
                        useWebsearch: value,
                      }));
                    }}
                  />
                ) : null}
              </div>
            </div>
          }
          disabled={loading}
          placeholder={
            isDropping
              ? "Release to drop"
              : "Type here or drop PDF, CSV or Excel files"
          }
          autoResize={true}
          defaultRows={1}
          textAreaHtmlProps={{
            style: { resize: "none" },
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              const question = e.currentTarget.value;
              if (!question) {
                setErrorMessage("Please enter a question");
                return;
              }
              try {
                // Set clarification started flag immediately
                setClarificationStarted(true);
                setLoading(true);
                loadingStatus.current =
                  "Analyzing database and thinking if I need to ask clarifying questions. This can take 15-20 seconds...";
                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  userQuestion: question,
                }));

                // Handle PDF uploads if there are any by creating an array of the PDF's filename and its base64 encoded content
                const pdfFiles = [];
                console.log(
                  "Processing uploaded PDFs:",
                  draft.uploadedPDFs?.length || 0
                );

                if (draft.uploadedPDFs && draft.uploadedPDFs.length > 0) {
                  console.log(
                    "Found PDFs to process:",
                    draft.uploadedPDFs.map((f) => f.fileName)
                  );

                  for (const pdfFile of draft.uploadedPDFs) {
                    try {
                      const fileName = pdfFile.fileName;
                      console.log(
                        "Processing PDF:",
                        fileName,
                        "Size:",
                        pdfFile.size
                      );

                      console.log(
                        "PDF buffer created, size:",
                        pdfFile.buf.byteLength
                      );

                      // Convert ArrayBuffer to base64
                      const base64String = arrayBufferToBase64(pdfFile.buf);
                      console.log(
                        "PDF converted to base64, length:",
                        base64String.length
                      );

                      pdfFiles.push({
                        file_name: fileName,
                        base64_content: base64String,
                      });
                      console.log("PDF added to processing list");
                    } catch (err) {
                      console.error("Error processing PDF:", err);
                      setErrorMessage(
                        `Error processing PDF: ${pdfFile.fileName}`
                      );
                    }
                  }

                  console.log(
                    "Finished processing PDFs, total processed:",
                    pdfFiles.length
                  );
                } else {
                  console.log("No PDFs to process");
                }

                // do the same for data files
                const dataFiles = [];
                console.log(
                  "Processing uploaded data files:",
                  dataFiles.length
                );

                if (draft.uploadedDataFiles?.length === 0) {
                  console.log("No data files to process");
                } else {
                  console.log(
                    "Found data files to process:",
                    draft.uploadedDataFiles.map((f) => f.fileName)
                  );

                  for (const dataFile of draft.uploadedDataFiles) {
                    try {
                      const fileName = dataFile.fileName;
                      console.log(
                        "Processing data file:",
                        fileName,
                        "Size:",
                        dataFile.size
                      );

                      console.log(
                        "data file buffer created, size:",
                        dataFile.buf.byteLength
                      );

                      // Convert ArrayBuffer to base64
                      const base64String = arrayBufferToBase64(dataFile.buf);
                      console.log(
                        "data file converted to base64, length:",
                        base64String.length
                      );

                      dataFiles.push({
                        file_name: fileName,
                        base64_content: base64String,
                      });
                      console.log("data file added to processing list");
                    } catch (err) {
                      console.error("Error processing data file:", err);
                      setErrorMessage(
                        `Error processing data file: ${dataFile.fileName}`
                      );
                    }
                  }

                  console.log(
                    "Finished processing PDFs, total processed:",
                    dataFiles.length
                  );
                }

                // prepare either for success or a new error message
                setErrorMessage("");

                const res = await getClarifications(
                  apiEndpoint,
                  token,
                  dbName,
                  question,
                  pdfFiles,
                  dataFiles
                );

                console.log("clarifications", res.clarifications);

                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  status: "clarifications_received",
                  clarifications: res.clarifications,
                  reportId: res.report_id,
                }));

                // if the res has a db_name and db_info
                // means a new db was created for the data files
                if (res.new_db_name && res.new_db_info) {
                  newDbName.current = res.new_db_name;
                  newDbInfo.current = res.new_db_info;
                  onClarified(newDbName.current);
                }
              } catch (e) {
                console.log(e);
                setErrorMessage(e.toString());
                // If there's an error, allow the user to try again
                setClarificationStarted(false);
              } finally {
                setLoading(false);
              }
            }
          }}
        />
      </DropFilesHeadless>

      <div
        className={twMerge(
          "w-11/12 mx-auto my-0 h-0 relative z-[1] transition-all duration-200 ease-in-out overflow-auto",
          !loading &&
            draft.clarifications &&
            draft.clarifications.length > 0 &&
            "p-4 h-96 rounded-b-xl bg-blue-200 dark:bg-sky-900 border-t-0"
        )}
      >
        <OracleReportClarifications
          dbName={dbName}
          onReportGenerated={onReportGenerated}
        />
      </div>
    </>
  );
}
