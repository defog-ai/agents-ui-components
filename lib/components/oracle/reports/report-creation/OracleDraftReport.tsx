import {
  Button,
  DropFiles,
  DropFilesHeadless,
  MessageManagerContext,
  SpinningLoader,
  TextArea,
  Toggle,
} from "@ui-components";
import { Command } from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ClarificationItem, ClarificationObject } from "./ClarificationItem";
import {
  generateReport,
  getClarifications,
  ORACLE_REPORT_STATUS,
} from "@oracle";

type QueryTaskType = "exploration" | "";

interface ReportDraft {
  userQuestion?: string;
  task_type?: QueryTaskType;
  clarifications?: ClarificationObject[];
  useWebsearch?: boolean;
  uploadedPDFs?: File[];
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
}: {
  apiEndpoint: string;
  dbName: string;
  token: string;
  onReportGenerated?: (
    userQuestion: string,
    reportId: string,
    status: string
  ) => void;
}) {
  const [draft, setDraft] = useState<ReportDraft>({
    useWebsearch: true,
    uploadedPDFs: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const [clarificationStarted, setClarificationStarted] =
    useState<boolean>(false);
  const loadingStatus = useRef<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  const message = useContext(MessageManagerContext);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  };

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      loadingStatus.current = "Submitting report for generation...";

      try {
        // This will always error because of a 10ms timeout
        await generateReport(
          apiEndpoint,
          token,
          dbName,
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
        ORACLE_REPORT_STATUS.THINKING
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

  return (
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto gap-10">
        <div className="w-full">
          <div className="text-lg dark:text-gray-200 font-light">
            What would you like a report on?
          </div>
          <TextArea
            ref={textAreaRef}
            rootClassNames="w-full h-full rounded-xl border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            textAreaClassNames="border-0 outline-0 ring-0 shadow-none focus:ring-0 bg-transparent"
            suffix={
              <>
                <span className="dark:text-gray-400">
                  Drop CSV or Excel files to analyse them. Press{" "}
                  {isMac ? (
                    <>
                      <Command className="inline align-middle w-2.5" />+ Enter
                    </>
                  ) : (
                    "Ctrl + Enter"
                  )}{" "}
                  to start.
                </span>
              </>
            }
            disabled={loading}
            placeholder="Type here"
            autoResize={true}
            defaultRows={1}
            textAreaHtmlProps={{
              style: { resize: "none" },
              onDrop: (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("bleh", e.dataTransfer?.files);
              },
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
                        message.error(`Error processing PDF: ${pdfFile.name}`);
                      }
                    }

                    console.log(
                      "Finished processing PDFs, total processed:",
                      pdfFiles.length
                    );
                  } else {
                    console.log("No PDFs to process");
                  }

                  const { clarifications, report_id } = await getClarifications(
                    apiEndpoint,
                    token,
                    dbName,
                    question,
                    pdfFiles
                  );

                  console.log("clarifications", clarifications);

                  setReportId(report_id);

                  setDraft((prev) => ({
                    ...prev,
                    clarifications,
                  }));
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
