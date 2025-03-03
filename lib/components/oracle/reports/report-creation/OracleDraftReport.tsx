import {
  Button,
  DropFiles,
  DropFilesHeadless,
  MessageManagerContext,
  SpinningLoader,
  TextArea,
  Toggle,
} from "@ui-components";
import { Command, File, XCircle } from "lucide-react";
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

interface DataFile {
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
  uploadedPDFs?: File[];
  /**
   * CSVs or Excel files. Once these are uploaded, they will be used as a "new db".
   */
  uploadedDataFiles?: DataFile[];
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
  onUploadDataFiles = () => {},
}: {
  apiEndpoint: string;
  dbName: string;
  token: string;
  onReportGenerated?: (
    userQuestion: string,
    reportId: string,
    status: string,
    newDbName?: string
  ) => void;
  onUploadDataFiles?: (dataFiles?: DataFile[]) => void;
  onUploadPDFs?: (pdfFiles: File[]) => void;
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
      }

      onReportGenerated(
        textAreaRef.current?.value || draft.userQuestion,
        reportId,
        ORACLE_REPORT_STATUS.THINKING,
        newDbName.current
      );

      // clear everything
      setDraft({
        useWebsearch: true,
        uploadedPDFs: [],
      });
      setClarificationStarted(false);
      loadingStatus.current = "";
      textAreaRef.current.value = "";
    } catch (error) {
      message.error("Error generating report:", error);
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

  // Handler for PDF file uploads
  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handlePDFUpload called, files:", e.target?.files);

    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );

      console.log("Filtered PDF files:", filesArray);

      if (filesArray.length === 0) {
        console.warn("No valid PDF files found in selection");
        message.error("Please select only PDF files");
        return;
      }

      setDraft((prev) => {
        const newUploadedPDFs = [...(prev.uploadedPDFs || []), ...filesArray];
        console.log("Updated state, new PDF count:", newUploadedPDFs.length);
        console.log(
          "PDF file names:",
          newUploadedPDFs.map((f) => f.name)
        );

        return {
          ...prev,
          uploadedPDFs: newUploadedPDFs,
        };
      });
    } else {
      console.warn("No files selected or e.target.files is null");
    }
  };

  // Handler for removing an uploaded PDF
  const handleRemovePDF = (index: number) => {
    console.log("Removing PDF at index:", index);

    setDraft((prev) => {
      const filteredPDFs =
        prev.uploadedPDFs?.filter((_, i) => i !== index) || [];
      console.log("After removal, PDF count:", filteredPDFs.length);
      console.log(
        "Remaining PDF file names:",
        filteredPDFs.map((f) => f.name)
      );

      return {
        ...prev,
        uploadedPDFs: filteredPDFs,
      };
    });
  };

  const [isDropping, setIsDropping] = useState<boolean>(false);

  const CsvIcons = useMemo(() => {
    return draft?.uploadedDataFiles?.length ? (
      <div className="w-full">
        <div className="flex flex-wrap gap-2">
          {draft.uploadedDataFiles.map((file, index) => (
            <div
              key={`${file.fileName}-${index}`}
              className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center max-w-[85%]">
                <File className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{file.fileName}</span>
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
        </div>
      </div>
    ) : null;
  }, [draft]);

  return (
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto gap-10">
        <div className="w-full">
          <div className="text-lg dark:text-gray-200 font-light">
            What would you like a report on?
          </div>
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

              if (!isValidFileType(dataTransferObject.type)) {
                throw new Error("Only CSV or Excel files are accepted");
              }

              let file = dataTransferObject.getAsFile();

              const buf = await file.arrayBuffer();

              const newDataFiles = [
                ...draft.uploadedDataFiles,
                {
                  buf,
                  fileName: file.name,
                  size: file.size,
                  type: file.type,
                },
              ];

              setDraft((prev) => ({
                ...prev,
                uploadedDataFiles: newDataFiles,
              }));

              newDbName.current = null;
              newDbInfo.current = null;
            }}
          >
            <TextArea
              prefix={CsvIcons}
              ref={textAreaRef}
              rootClassNames="w-full h-full rounded-xl border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 overflow-hidden"
              textAreaClassNames="border-0 outline-0 ring-0 shadow-none focus:ring-0 bg-transparent "
              suffix={
                <div className="flex flex-col">
                  <span className="dark:text-gray-400">
                    Press{" "}
                    {isMac ? (
                      <>
                        <Command className="inline align-middle w-2.5" />+ Enter
                      </>
                    ) : (
                      "Ctrl + Enter"
                    )}{" "}
                    to start. Drop CSV or Excel files to analyse them.
                  </span>
                </div>
              }
              disabled={loading}
              placeholder={isDropping ? "Release to drop" : "Type here"}
              autoResize={true}
              defaultRows={1}
              textAreaHtmlProps={{
                style: { resize: "none" },
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  const question = e.currentTarget.value;
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
                        draft.uploadedPDFs.map((f) => f.name)
                      );

                      for (const pdfFile of draft.uploadedPDFs) {
                        try {
                          const fileName = pdfFile.name;
                          console.log(
                            "Processing PDF:",
                            fileName,
                            "Size:",
                            pdfFile.size
                          );

                          const arrayBuffer = await pdfFile.arrayBuffer();
                          console.log(
                            "PDF buffer created, size:",
                            arrayBuffer.byteLength
                          );

                          // Convert ArrayBuffer to base64
                          const base64String = arrayBufferToBase64(arrayBuffer);
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
                          message.error(
                            `Error processing PDF: ${pdfFile.name}`
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
                          message.error(
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
                    }
                  } catch (e) {
                    message.error("Error getting clarifications");
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

        <div className="w-full mb-4">
          <Toggle
            title="Use web search to enhance report"
            onLabel="Web search is enabled"
            offLabel="Web search is disabled"
            defaultOn={draft.useWebsearch}
            disabled={clarificationStarted || Boolean(draft.clarifications)}
            onToggle={(value) => {
              setDraft((prev) => ({
                ...prev,
                useWebsearch: value,
              }));
            }}
            rootClassNames="mb-4"
          />

          {/* Show PDF section only if not in clarification process OR if PDFs were already uploaded */}
          {(!(clarificationStarted || Boolean(draft.clarifications)) ||
            (draft.uploadedPDFs && draft.uploadedPDFs.length > 0)) && (
            <div className="mt-4 mb-4">
              {/* Only show the upload area if not in clarification process */}
              {!(clarificationStarted || Boolean(draft.clarifications)) && (
                <>
                  <div className="text-sm font-medium mb-2 dark:text-gray-200">
                    Upload PDF files (optional)
                  </div>
                  <DropFiles
                    label="Drop PDF files here"
                    acceptedFileTypes={["application/pdf"]}
                    onFileSelect={handlePDFUpload}
                    onDrop={(e) => {
                      console.log("Drop event detected", e.dataTransfer?.files);
                      if (e.dataTransfer?.files) {
                        const fileList = e.dataTransfer.files;
                        const event = {
                          target: { files: fileList },
                        } as React.ChangeEvent<HTMLInputElement>;
                        handlePDFUpload(event);
                      }
                    }}
                    allowMultiple={true}
                    showIcon={true}
                    rootClassNames="border-dashed border-2 h-auto min-h-32 mb-2"
                    selectedFiles={draft.uploadedPDFs}
                    onRemoveFile={handleRemovePDF}
                  />
                </>
              )}

              {/* Files are now displayed in the DropFiles component */}
            </div>
          )}
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
