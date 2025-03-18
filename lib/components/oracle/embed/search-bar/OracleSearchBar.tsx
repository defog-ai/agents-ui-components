import {
  generateReport,
  getClarifications,
  getTablesAndFiles,
  PdfFileInfo,
  ORACLE_REPORT_STATUS,
} from "@oracle";
import {
  AlertBanner,
  DropFilesHeadless,
  MessageManagerContext,
  SpinningLoader,
  TextArea,
  Toggle,
} from "@ui-components";
import { KeyboardShortcutIndicator } from "../../../../../lib/components/core-ui/KeyboardShortcutIndicator";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useKeyDown } from "../../../../../lib/components/hooks/useKeyDown";
import { OracleEmbedContext } from "../OracleEmbedContext";
import { Command, File, FileSpreadsheet, Telescope, Zap } from "lucide-react";
import { createProjectFromFiles } from "@utils/utils";
import { statusDescriptions, Mode } from "./oracleSearchBarManager";
import { OracleReportClarifications } from "../../reports/report-creation/OracleReportClarifications";
import { twMerge } from "tailwind-merge";
import { OracleHistoryItem } from "../OracleEmbed";
import { OracleSearchBarModeHeader } from "./OracleSearchBarModeHeader";
import { KEYMAP } from "../../../../../lib/constants/keymap";

const modeIcons: Record<Mode, React.ReactNode> = {
  "query-data": <Zap className="w-5 stroke-yellow-500" />,
  report: <Telescope className="w-5 stroke-fuchsia-300" />,
};

const itemTypeClasses = {
  default:
    "absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-full px-4",
  "query-data":
    "absolute bottom-40 left-1/2 -translate-x-1/2 translate-y-full w-full px-4",
  report:
    "absolute -bottom-48 left-1/2 -translate-x-1/2 translate-y-full w-full px-4 opacity-0",
  "new-project":
    "absolute -bottom-48 left-1/2 -translate-x-1/2 translate-y-full w-full px-4 opacity-0",
};

export function OracleSearchBar({
  projectName,
  uploadNewProjectOption,
  onReportGenerated,
  onNewProjectCreated,
  createNewFastAnalysis,
  rootClassNames = "",
  selectedItem = null,
}: {
  projectName: string;
  uploadNewProjectOption: string;
  onNewProjectCreated: (newProjectName?: string) => void;
  createNewFastAnalysis: (question: string, newProjectName?: string) => void;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
  }) => void;
  rootClassNames?: string;
  selectedItem: OracleHistoryItem;
}) {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const { searchBarManager, apiEndpoint, token } =
    useContext(OracleEmbedContext);

  const message = useContext(MessageManagerContext);

  const [isMac, setIsMac] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [availablePdfFiles, setAvailablePdfFiles] = useState<PdfFileInfo[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState<boolean>(false);
  const [showSubmitHint, setShowSubmitHint] = useState<boolean>(false);
  const [hasShownSubmitHint, setHasShownSubmitHint] = useState<boolean>(false);

  const newProjectName = useRef<string | null>(null);

  const draft = useSyncExternalStore(
    searchBarManager.subscribeToDraftChanges,
    searchBarManager.getDraft
  );

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerateReport = useCallback(async () => {
    try {
      if (!draft.reportId) {
        throw new Error("No report ID");
      }
      if (!textAreaRef.current.value && !draft.userQuestion) {
        throw new Error("No question!");
      }

      searchBarManager.setDraft((prev) => ({
        ...prev,
        status: "submitting",
      }));

      setLoading(true);

      // prepare either for success or a new error message
      setErrorMessage("");

      try {
        // This will always error because of a 10ms timeout
        await generateReport(
          apiEndpoint,
          token,
          projectName,
          draft.reportId,
          draft.userQuestion || textAreaRef.current?.value,
          draft.clarifications?.filter((c) => c.answer && c.is_answered) || [],
          // Add websearch parameter
          draft.useWebsearch
        );
      } catch (error) {
        message.success("Report submitted for generation");
        onReportGenerated({
          userQuestion: draft.userQuestion || textAreaRef.current?.value,
          reportId: draft.reportId,
          status: ORACLE_REPORT_STATUS.THINKING,
        });
      }

      // clear everything
      searchBarManager.resetDraft();
      textAreaRef.current.value = "";
    } catch (error) {
      setErrorMessage(`Error generating report: ${error}`);

      // also use message for this error because user is usually scrolled down to the bottom when they click "generate"
      message.error(`Error generating report: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [draft, apiEndpoint, token, projectName, onReportGenerated, message]);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
  }, []);

  // Fetch available tables and PDF files when the component mounts or project changes
  useEffect(() => {
    const fetchTablesAndFiles = async () => {
      if (!projectName || projectName === uploadNewProjectOption || !token) {
        // Reset the tables and files if we're on the upload new project option
        setAvailableTables([]);
        setAvailablePdfFiles([]);
        return;
      }

      try {
        setIsLoadingResources(true);
        const result = await getTablesAndFiles(apiEndpoint, token, projectName);
        setAvailableTables(result.tables);
        setAvailablePdfFiles(result.pdf_files);
      } catch (error) {
        console.error("Error fetching tables and files:", error);
        // Don't show error message to user, just log it
      } finally {
        setIsLoadingResources(false);
      }
    };

    fetchTablesAndFiles();
  }, [projectName, apiEndpoint, token, uploadNewProjectOption]);

  const [clarificationStarted, setClarificationStarted] =
    useState<boolean>(false);

  useEffect(() => {
    if (draft.userQuestion !== textAreaRef.current?.value) {
      textAreaRef.current.value = draft.userQuestion;
      // also focus it
      textAreaRef.current?.focus();
    }
  }, [draft]);

  // Handle keyboard shortcuts using the useKeyDown hook

  // Focus search with "/"
  useKeyDown(
    {
      key: KEYMAP.FOCUS_ORACLE_SEARCH,
      callback: (e) => {
        // don't focus on report view or "upload new" view (browser does weird stuff if we focus off screen things)
        if (
          projectName === uploadNewProjectOption ||
          selectedItem?.itemType === "report"
        )
          return;

        textAreaRef.current?.focus();
      },
    },
    [textAreaRef]
  );

  // New question with Cmd+K (or Ctrl+Q on Windows)
  useKeyDown(
    {
      key: KEYMAP.NEW_QUESTION,
      meta: true,
      callback: () => {
        // Emulate the behavior of clicking "New Report" in the sidebar
        if (selectedItem) {
          // If there's a selected item, clear it to create a new report
          window.dispatchEvent(new CustomEvent("oracle:new-report"));
        }

        // Reset the search bar and focus it
        searchBarManager.resetDraft();
        if (textAreaRef.current) {
          textAreaRef.current.value = "";
          textAreaRef.current.focus();
        }
      },
    },
    [searchBarManager, selectedItem, textAreaRef]
  );

  // Toggle mode with Cmd+M (or Ctrl+M on Windows)
  useKeyDown(
    {
      key: KEYMAP.TOGGLE_MODE,
      meta: true,
      callback: () => {
        // only toggle if we're not in any item
        if (!selectedItem) {
          // Toggle between fast and deep research modes
          const newMode = draft.mode === "query-data" ? "report" : "query-data";
          searchBarManager.setMode(newMode);
        }
      },
    },
    [draft.mode, searchBarManager, selectedItem]
  );

  // We no longer need to display uploaded files since they're immediately uploaded
  const UploadedFileIcons = useMemo(() => {
    return null; // Files are uploaded immediately so we don't need to show them in the search bar
  }, []);

  // Create a component to display available tables and PDF files
  const ResourcesDisplay = useMemo(() => {
    if (
      (availableTables.length === 0 && availablePdfFiles.length === 0) ||
      selectedItem?.itemType === "query-data" ||
      selectedItem?.itemType === "report"
    ) {
      return null;
    }

    return (
      <div className="mb-3">
        <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm max-h-96 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-2">
            {/* Tables section */}
            {availableTables.length > 0 && (
              <div>
                <div className="font-medium mb-1 flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                  <span className="text-gray-900 dark:text-gray-100">
                    Available Tables
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {availableTables.map((table) => (
                    <div
                      key={table}
                      className="bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-200 flex items-center"
                    >
                      {table}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF files section */}
            {availablePdfFiles.length > 0 && (
              <div>
                <div className="font-medium mb-1 flex items-center">
                  <File className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                  <span className="text-gray-900 dark:text-gray-100">
                    Available PDF Files
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {availablePdfFiles.map((file) => (
                    <div
                      key={file.file_id}
                      className="bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-200 flex items-center"
                      title={file.file_id}
                    >
                      {file.file_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoadingResources && (
              <div className="flex items-center justify-center p-1">
                <SpinningLoader classNames="w-4 h-4 mr-2" />
                <span className="text-xs text-gray-500">
                  Loading resources...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [availableTables, availablePdfFiles, isLoadingResources, selectedItem]);

  return (
    <div
      className={twMerge(
        "oracle-search transition-all duration-700 ease-in-out z-[10] *:transition-all *:duration-700 *:ease-in-out",
        itemTypeClasses[
          selectedItem?.itemType ||
            (projectName === uploadNewProjectOption ? "new-project" : "default")
        ]
      )}
    >
      {errorMessage && (
        <div className="mb-4 absolute -top-16">
          <AlertBanner
            type="error"
            message={errorMessage}
            dismissable={true}
            onDismiss={() => setErrorMessage("")}
          />
        </div>
      )}

      {/* Display available tables and PDF files */}
      {ResourcesDisplay}

      <DropFilesHeadless
        rootClassNames={twMerge(
          "drop-drop min-h-0 relative z-[2] rounded-2xl p-2 border bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
          selectedItem?.itemType === "query-data"
            ? "shadow-custom border-gray-300 dark:border-gray-600"
            : "",
          rootClassNames
        )}
        acceptedFileTypes={[".csv", ".pdf", ".xlsx", ".xls"]}
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
        onInvalidFiles={(e, invalidFiles, errorStr) => {
          message.error(errorStr);
        }}
        onDrop={async (e, files) => {
          try {
            e.preventDefault();
            e.stopPropagation();
            if (selectedItem?.itemType === "query-data") return;
            setIsDropping(false);

            // Handle dropped files
            const dataTransfer = e.dataTransfer;
            if (!dataTransfer) {
              console.error("No dataTransfer in drop event");
              return;
            }

            if (files.length === 0) {
              console.error("No valid files found");
              throw new Error("Only CSV, Excel or PDF files are accepted.");
            }

            // Set loading state for file upload
            setLoading(true);
            message.info("Uploading files...");

            try {
              // Immediately upload the files
              const uploadResponse = await createProjectFromFiles(
                apiEndpoint,
                token,
                files,
                projectName // Pass current project name
              );

              // If the upload creates a new project, save that info
              if (uploadResponse.projectName !== projectName) {
                console.log(
                  "New project created from file upload:",
                  uploadResponse.projectName
                );

                message.success(
                  "New project created from file upload: " +
                    uploadResponse.projectName
                );

                // Update the projectName to use
                newProjectName.current = uploadResponse.projectName;

                // Notify parent component about the new project
                onNewProjectCreated(newProjectName.current);

                // Fetch the updated tables and files
                const result = await getTablesAndFiles(
                  apiEndpoint,
                  token,
                  newProjectName.current
                );
                setAvailableTables(result.tables);
                setAvailablePdfFiles(result.pdf_files);
              } else {
                // If project stays the same, still refresh the tables and files
                const result = await getTablesAndFiles(
                  apiEndpoint,
                  token,
                  projectName
                );
                setAvailableTables(result.tables);
                setAvailablePdfFiles(result.pdf_files);
              }
            } catch (uploadError) {
              console.error("Error uploading files:", uploadError);
              throw new Error(`Failed to upload files: ${uploadError.message}`);
            } finally {
              setLoading(false);
            }

            // We no longer need to update draft with files
            // since they're uploaded immediately
          } catch (error) {
            console.error("Error processing files:", error);
            message.error(error.message);
            setLoading(false);
          }
        }}
      >
        <OracleSearchBarModeHeader selectedItem={selectedItem} />
        <TextArea
          onChange={(e) => {
            searchBarManager.setQuestion(e.target.value);
          }}
          prefix={UploadedFileIcons}
          ref={textAreaRef}
          rootClassNames="w-full py-2"
          textAreaClassNames="border-0 outline-0 ring-0 focus:ring-0 bg-gray-50"
          suffix={
            // selectedItem?.itemType !== "query-data" && (
            <div className={twMerge("flex flex-col")}>
              <div className={twMerge("dark:text-gray-400")}>
                <div className="flex items-center justify-between">
                  <div>
                    Press{" "}
                    {isMac ? (
                      <>
                        <Command className="inline align-middle w-2.5" />+ Enter
                      </>
                    ) : (
                      "Ctrl + Enter"
                    )}
                    {selectedItem?.itemType
                      ? " to submit. "
                      : " to start. Drop CSV or Excel files to analyse them. Drop PDFs to add context to the report. "}
                  </div>
                  <div className="relative">
                    {/* Regular button */}
                    <button
                      onClick={async () => {
                        if (!textAreaRef.current?.value) {
                          setErrorMessage("Please enter a question");
                          return;
                        }

                        // Simulate cmd+enter keypress by running the same logic
                        try {
                          setClarificationStarted(true);
                          setLoading(true);

                          searchBarManager.setDraft((prev) => ({
                            ...prev,
                            userQuestion: textAreaRef.current.value,
                            status: "getting_clarifications",
                          }));

                          setErrorMessage("");

                          if (draft.uploadedFiles?.length > 0) {
                            try {
                              await createProjectFromFiles(
                                apiEndpoint,
                                token,
                                draft.uploadedFiles,
                                projectName
                              );

                              const result = await getTablesAndFiles(
                                apiEndpoint,
                                token,
                                projectName
                              );
                              setAvailableTables(result.tables);
                              setAvailablePdfFiles(result.pdf_files);
                            } catch (uploadError) {
                              throw new Error(
                                `Failed to upload files: ${uploadError.message}`
                              );
                            }
                          }

                          const useProjectName =
                            newProjectName.current || projectName;

                          if (
                            draft.mode === "query-data" ||
                            selectedItem?.itemType === "query-data"
                          ) {
                            searchBarManager.resetDraft();
                            createNewFastAnalysis(
                              textAreaRef.current.value,
                              useProjectName
                            );
                            if (textAreaRef.current) {
                              textAreaRef.current.value = "";
                            }
                          } else {
                            const res = await getClarifications(
                              apiEndpoint,
                              token,
                              useProjectName,
                              textAreaRef.current.value
                            );

                            searchBarManager.setDraft((prev) => ({
                              ...prev,
                              loading: false,
                              userQuestion: textAreaRef.current.value,
                              status: "clarifications_received",
                              clarifications: res.clarifications,
                              reportId: res.report_id,
                              uploadedFiles: [],
                            }));
                          }
                        } catch (e) {
                          console.log(e);
                          setErrorMessage(e.toString());
                          searchBarManager.resetDraft();
                        } finally {
                          setLoading(false);
                          setClarificationStarted(false);
                          newProjectName.current = null;
                        }
                      }}
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit
                    </button>

                    {/* Tooltip that shows when needed */}
                    {showSubmitHint && (
                      <div className="absolute -top-10 right-0 z-40 px-3 py-2 text-sm font-medium bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-700 shadow-md whitespace-nowrap">
                        Press {isMac ? "⌘+Enter" : "Ctrl+Enter"} to submit
                        <div className="absolute w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-300 dark:border-gray-700 transform rotate-45 -bottom-1.5 right-4"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <KeyboardShortcutIndicator
                      keyValue={KEYMAP.FOCUS_ORACLE_SEARCH}
                      className="mr-1"
                      text="Focus search"
                    />
                  </span>
                  {selectedItem && (
                    <span className="flex items-center">
                      <KeyboardShortcutIndicator
                        keyValue={KEYMAP.NEW_QUESTION}
                        className="mr-1"
                        meta={true}
                        text="New question"
                      />
                    </span>
                  )}
                  {!selectedItem?.itemType && (
                    <span className="flex items-center">
                      <KeyboardShortcutIndicator
                        keyValue={KEYMAP.TOGGLE_MODE}
                        className="mr-1"
                        meta={true}
                        text="Toggle mode"
                      />
                    </span>
                  )}
                </div>
              </div>

              <div
                className={twMerge(
                  "flex flex-row mt-2 gap-4 items-center",
                  selectedItem?.itemType === "query-data" &&
                    "h-0 mt-0 overflow-hidden opacity-0"
                )}
              >
                <div className="flex items-center gap-3">
                  <Toggle
                    disabled={
                      selectedItem?.itemType === "query-data" ||
                      clarificationStarted ||
                      Boolean(
                        draft.clarifications && draft.clarifications.length
                      )
                    }
                    onToggle={(value) => {
                      searchBarManager.setMode(value ? "report" : "query-data");
                      setClarificationStarted(false);
                    }}
                    // Use checked prop to make it controlled
                    checked={draft.mode === "report"}
                    // Show both labels simultaneously
                    showBothLabels={true}
                    onLabel={
                      <span className="flex items-center gap-1">
                        {modeIcons["report"]}
                        <span className="whitespace-nowrap">Deep Research</span>
                      </span>
                    }
                    offLabel={
                      <span className="flex items-center gap-1">
                        {modeIcons["query-data"]}
                        <span className="whitespace-nowrap">Fast Analysis</span>
                      </span>
                    }
                  />
                </div>

                {draft.mode === "report" &&
                selectedItem?.itemType !== "query-data" ? (
                  <Toggle
                    onLabel="Use web search to enhance report"
                    offLabel="Use web search to enhance report"
                    defaultOn={draft.useWebsearch}
                    disabled={
                      clarificationStarted ||
                      Boolean(
                        draft.clarifications && draft.clarifications.length
                      )
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
            // )
          }
          disabled={loading}
          placeholder={
            selectedItem?.itemType === "query-data"
              ? "Type here"
              : isDropping
                ? "Release to drop"
                : draft.mode === "report"
                  ? "I will start a Deep Research process on your data tables, any PDF files you have uploaded, and the web. For best results:\n- include the kind of analysis you want done\n- your desired areas of focus\n- any concrete sources you want me to look at"
                  : "Type your question here or drop PDF, CSV or Excel files"
          }
          autoResize={true}
          defaultRows={1}
          textAreaHtmlProps={{
            style: { resize: "none" },
          }}
          onKeyDown={async (e) => {
            // only do this for slash
            if (e.key === "/") {
              e.stopPropagation();
            }
            // Show hint when normal Enter is pressed (not with modifiers)
            if (
              e.key === "Enter" &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.shiftKey &&
              !hasShownSubmitHint
            ) {
              e.stopPropagation();
              setShowSubmitHint(true);
              setHasShownSubmitHint(true);
              // Auto-hide after 3 seconds
              setTimeout(() => {
                setShowSubmitHint(false);
              }, 3000);
            }
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

                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  userQuestion: question,
                  status: "getting_clarifications",
                }));

                // prepare either for success or a new error message
                setErrorMessage("");

                // NOTE: Files are now uploaded immediately on drop, so this block
                // is unlikely to execute since draft.uploadedFiles should be empty.
                // Keeping a simplified version for backward compatibility.
                if (draft.uploadedFiles?.length > 0) {
                  console.log(
                    "Uploading remaining files before submitting question"
                  );
                  try {
                    await createProjectFromFiles(
                      apiEndpoint,
                      token,
                      draft.uploadedFiles,
                      projectName // Pass current project name
                    );

                    // Refresh tables and files
                    const result = await getTablesAndFiles(
                      apiEndpoint,
                      token,
                      projectName
                    );
                    setAvailableTables(result.tables);
                    setAvailablePdfFiles(result.pdf_files);
                  } catch (uploadError) {
                    console.error("Error uploading files:", uploadError);
                    throw new Error(
                      `Failed to upload files: ${uploadError.message}`
                    );
                  }
                }

                // Now get clarifications with the possibly updated project name
                const useProjectName = newProjectName.current || projectName;

                // If in query-data mode, create a new analysis instead of getting clarifications
                // of if we're in a query-data item itself, create analysis
                if (
                  draft.mode === "query-data" ||
                  selectedItem?.itemType === "query-data"
                ) {
                  console.log(
                    "Starting fast analysis with project name:",
                    useProjectName
                  );

                  searchBarManager.resetDraft();

                  // Create new analysis for fast data analysis mode
                  createNewFastAnalysis(question, useProjectName);

                  // Reset the search bar text
                  if (textAreaRef.current) {
                    textAreaRef.current.value = "";
                  }
                } else {
                  console.log(
                    "Getting clarifications with project name:",
                    useProjectName
                  );

                  const res = await getClarifications(
                    apiEndpoint,
                    token,
                    useProjectName,
                    question
                  );

                  searchBarManager.setDraft((prev) => ({
                    ...prev,
                    loading: false,
                    userQuestion: question,
                    status: "clarifications_received",
                    clarifications: res.clarifications,
                    reportId: res.report_id,
                    uploadedFiles: [],
                  }));
                }
              } catch (e) {
                console.log(e);
                setErrorMessage(e.toString());
                searchBarManager.resetDraft();
              } finally {
                setLoading(false);
                // If there's an error, allow the user to try again
                setClarificationStarted(false);
                newProjectName.current = null;
              }
            }
          }}
        />
      </DropFilesHeadless>

      {/* Clarification area */}
      {!loading &&
        draft.clarifications &&
        draft.clarifications.length > 0 &&
        !selectedItem &&
        draft.mode !== "query-data" && (
          <div className="w-11/12 mx-auto my-0 flex flex-col">
            {/* Scrollable clarifications section */}
            <div className="border border-blue-500 dark:border-sky-600 rounded-t-xl bg-sky-200 dark:bg-sky-900 border-b-0">
              <div className="h-96 overflow-y-auto py-2 px-4">
                <OracleReportClarifications />
              </div>
            </div>

            {/* Fixed Generate button section */}
            <div className="border border-blue-500 dark:border-sky-600 rounded-b-xl bg-sky-200 dark:bg-sky-900 py-3 px-4 border-t-0">
              <button
                className="bg-gray-600 text-white border-0 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-600 text-base py-2 px-4 rounded"
                onClick={handleGenerateReport}
              >
                Generate
              </button>
            </div>
          </div>
        )}

      {/* Loading state */}
      {loading && (
        <div className="w-11/12 mx-auto border border-blue-500 dark:border-sky-600 rounded-xl bg-sky-200 dark:bg-sky-900 overflow-hidden">
          <div className="flex flex-col gap-2 py-2 px-4">
            <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
              <SpinningLoader classNames="w-4 mr-1" />
              {statusDescriptions[draft.status]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
