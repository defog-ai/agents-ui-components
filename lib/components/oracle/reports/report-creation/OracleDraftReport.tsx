import {
  AlertBanner,
  Button,
  DropFiles,
  DropFilesHeadless,
  MessageManagerContext,
  SpinningLoader,
  TextArea,
  Toggle,
} from "@ui-components";
import {
  Command,
  File,
  FileSpreadsheet,
  FileText,
  Info,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ClarificationItem, ClarificationObject } from "./ClarificationItem";
import {
  generateReport,
  getClarifications,
  ORACLE_REPORT_STATUS,
} from "@oracle";
import {
  arrayBufferToBase64,
  formatFileSize,
  isValidFileType,
} from "@utils/utils";

type QueryTaskType = "exploration" | "";

interface UploadedFile {
  buf: ArrayBuffer;
  fileName: string;
  size: number;
  type: string;
}
interface ReportDraft {
  userQuestion?: string;
  task_type?: QueryTaskType;
  clarifications?: ClarificationObject[];
  useWebsearch?: boolean;
  uploadedPDFs?: UploadedFile[];
  /**
   * CSVs or Excel files. Once these are uploaded, they will be used as a "new db".
   */
  uploadedDataFiles?: UploadedFile[];
}

/**
 * This stores the report before it is submitted for generation.
 * Stores the user question and the clarification questions + answers.
 * We don't "create" a report until the user finally submits
 */
export function OracleDraftReport({
  apiEndpoint,
  dbName,
  token,
  onReportGenerated,
  onClarified = () => {},
  onUploadDataFiles = () => {},
}: {
  apiEndpoint: string;
  dbName: string;
  token: string;
  onClarified?: (newDbName?: string) => void;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
    newDbName?: string;
  }) => void;
  onUploadDataFiles?: (dataFiles?: UploadedFile[]) => void;
}) {
  const [draft, setDraft] = useState<ReportDraft>({
    useWebsearch: true,
    uploadedPDFs: [],
    uploadedDataFiles: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const [clarificationStarted, setClarificationStarted] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const newDbName = useRef<string | null>(null);
  const newDbInfo = useRef<DbInfo | null>(null);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  const message = useContext(MessageManagerContext);

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      loadingStatus.current = "Submitting report for generation...";

      try {
        // This will always error because of a 10ms timeout
        await generateReport(
          apiEndpoint,
          token,
          newDbName.current || dbName,
          reportId,
          textAreaRef.current?.value || draft.userQuestion,
          draft.clarifications?.filter((c) => c.answer && c.is_answered) || [],
          // Add websearch parameter
          draft.useWebsearch
        );
      } catch (error) {
        message.success("Report submitted for generation");
        onReportGenerated({
          userQuestion: textAreaRef.current?.value || draft.userQuestion,
          reportId: reportId,
          status: ORACLE_REPORT_STATUS.THINKING,
          newDbName: newDbName.current,
        });
      }

      // clear everything
      setDraft({
        useWebsearch: true,
        uploadedPDFs: [],
      });
      setClarificationStarted(false);
      loadingStatus.current = "";
      textAreaRef.current.value = "";
    } catch (error) {
      setErrorMessage(`Error generating report: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [draft, apiEndpoint, token, dbName, reportId, onReportGenerated, message]);

  useEffect(() => {
    onUploadDataFiles(draft?.uploadedDataFiles);

    if (!draft?.uploadedDataFiles || draft?.uploadedDataFiles?.length === 0) {
      newDbName.current = null;
      newDbInfo.current = null;
    }
  }, [draft?.uploadedDataFiles]);

  const [isDropping, setIsDropping] = useState<boolean>(false);

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

                      setDraft((prev) => ({
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

                      setDraft((prev) => ({
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
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto gap-10">
        <div className="w-full">
          <div className="text-lg dark:text-gray-200 font-light mb-4">
            Add a spreadsheet or select a database, and start asking your
            questions!
          </div>
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
            fileSelection={false}
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

              let dataTransferObject: DataTransferItem =
                e?.dataTransfer?.items?.[0];
              if (
                !dataTransferObject ||
                !dataTransferObject.kind ||
                dataTransferObject.kind !== "file"
              ) {
                throw new Error("Invalid file");
              }

              if (!isValidFileType(dataTransferObject.type, true)) {
                throw new Error("Only CSV, Excel or PDF files are accepted");
              }

              let file = dataTransferObject.getAsFile();

              const buf = await file.arrayBuffer();

              if (file.type.endsWith("pdf")) {
                const newPDFs = [
                  ...draft.uploadedPDFs,
                  {
                    buf,
                    fileName: file.name,
                    size: file.size,
                    type: file.type,
                    isCsv: false,
                    isPdf: true,
                  },
                ];

                setDraft((prev) => ({
                  ...prev,
                  uploadedPDFs: newPDFs,
                }));
              } else {
                const newDataFiles = [
                  ...draft.uploadedDataFiles,
                  {
                    buf,
                    fileName: file.name,
                    size: file.size,
                    type: file.type,
                    isPdf: false,
                    isCsv: true,
                  },
                ];

                setDraft((prev) => ({
                  ...prev,
                  uploadedDataFiles: newDataFiles,
                }));
              }

              newDbName.current = null;
              newDbInfo.current = null;
            }}
          >
            <TextArea
              prefix={UploadedFileIcons}
              ref={textAreaRef}
              rootClassNames="p-2 w-full h-full rounded-xl border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 overflow-hidden"
              textAreaClassNames="border-0 outline-0 ring-0 shadow-none focus:ring-0"
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
                    to start. Drop PDFs to add context to the report. Drop CSV
                    or Excel files to analyse them.
                  </div>
                  <Toggle
                    title="Use web search to enhance report"
                    onLabel=""
                    offLabel=""
                    defaultOn={draft.useWebsearch}
                    disabled={
                      clarificationStarted || Boolean(draft.clarifications)
                    }
                    onToggle={(value) => {
                      setDraft((prev) => ({
                        ...prev,
                        useWebsearch: value,
                      }));
                    }}
                    rootClassNames="mt-2"
                  />
                </div>
              }
              disabled={loading}
              placeholder={
                isDropping
                  ? "Release to drop"
                  : "Type here or drop PDF, CSV or Excel file"
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
                    setDraft((prev) => ({
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
                          const base64String = arrayBufferToBase64(
                            dataFile.buf
                          );
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

                    const res = await getClarifications(
                      apiEndpoint,
                      token,
                      dbName,
                      question,
                      pdfFiles,
                      dataFiles
                    );

                    console.log("clarifications", res.clarifications);

                    setReportId(res.report_id);

                    setDraft((prev) => ({
                      ...prev,
                      clarifications: res.clarifications,
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
        </div>

        {!loading && draft.clarifications && (
          <div className="my-4 max-w-2xl">
            <div className="font-light mb-2 dark:text-gray-300">
              Add Details
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                {draft.clarifications.map((obj, idx) => (
                  <ClarificationItem
                    {...obj}
                    key={idx + obj.clarification}
                    onAnswerChange={(answer) => {
                      setDraft((prev) => ({
                        ...prev,
                        clarifications: prev.clarifications.map((d, i) => {
                          if (i === idx) {
                            return {
                              ...d,
                              answer,
                              is_answered: !answer
                                ? false
                                : typeof answer === "string"
                                  ? Boolean(answer)
                                  : answer.length > 0,
                            };
                          }
                          return d;
                        }),
                      }));
                    }}
                    onDismiss={() => {
                      setDraft((prev) => ({
                        ...prev,
                        clarifications: prev.clarifications.filter(
                          (_, i) => i !== idx
                        ),
                      }));
                    }}
                  />
                ))}
              </div>
              <Button
                className="bg-gray-600 text-white border-0 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={handleGenerateReport}
              >
                {loading ? loadingStatus.current : "Generate"}
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="w-full text-sm text-gray-400 dark:text-gray-500 relative flex items-start rounded-xl">
            <SpinningLoader></SpinningLoader>
            {loadingStatus.current}
          </div>
        )}
      </div>
    </div>
  );
}
