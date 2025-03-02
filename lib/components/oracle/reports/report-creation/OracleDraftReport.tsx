import {
  Button,
  DropFiles,
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

  const handleGenerateReport = useCallback(async () => {
    try {
      setLoading(true);
      loadingStatus.current = "Submitting report for generation...";

      // Handle PDF uploads if there are any
      const formData = new FormData();
      if (draft.uploadedPDFs && draft.uploadedPDFs.length > 0) {
        draft.uploadedPDFs.forEach((pdfFile, index) => {
          formData.append("pdf_files", pdfFile);
        });

        try {
          // Upload PDFs first
          const uploadResponse = await fetch(
            `${apiEndpoint}/oracle/upload_pdfs`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload PDF files");
          }
        } catch (uploadError) {
          message.error("Error uploading PDF files");
          throw uploadError;
        }
      }

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
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );

      setDraft((prev) => ({
        ...prev,
        uploadedPDFs: [...(prev.uploadedPDFs || []), ...filesArray],
      }));
    }
  };

  // Handler for removing an uploaded PDF
  const handleRemovePDF = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      uploadedPDFs: prev.uploadedPDFs?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <div className="h-full overflow-auto py-4 px-1 lg:px-10">
      <div className="flex flex-col items-start justify-center min-h-full m-auto">
        <TextArea
          ref={textAreaRef}
          rootClassNames="w-full"
          textAreaClassNames="rounded-xl dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          suffix={
            <span className="flex items-center dark:text-gray-400">
              Press{" "}
              {isMac ? (
                <>
                  <Command className="inline w-2.5 mx-1" /> + Enter
                </>
              ) : (
                "Ctrl + Enter"
              )}{" "}
              to start
            </span>
          }
          disabled={loading}
          label={
            <div className="text-lg dark:text-gray-200">
              What would you like a report on?
            </div>
          }
          placeholder="Type here"
          autoResize={true}
          defaultRows={1}
          textAreaHtmlProps={{ style: { resize: "none" } }}
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

                const { clarifications, report_id } = await getClarifications(
                  apiEndpoint,
                  token,
                  dbName,
                  question
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
                    allowMultiple={true}
                    showIcon={true}
                    rootClassNames="border-dashed border-2 h-32 mb-2"
                  />
                </>
              )}

              {draft.uploadedPDFs && draft.uploadedPDFs.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-sm font-medium dark:text-gray-300">
                    Uploaded PDFs:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.uploadedPDFs.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md"
                      >
                        <span className="text-sm truncate max-w-[200px]">
                          {file.name}
                        </span>
                        {!clarificationStarted && !draft.clarifications && (
                          <button
                            className="ml-2 text-gray-500 hover:text-red-500"
                            onClick={() => handleRemovePDF(index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
