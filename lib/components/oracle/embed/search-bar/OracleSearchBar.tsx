import {
  generateReport,
  getClarifications,
  ORACLE_REPORT_STATUS,
} from "@oracle";
import {
  AlertBanner,
  Dropdown,
  DropFilesHeadless,
  MenuItem,
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
import {
  ChevronDown,
  Command,
  FileSpreadsheet,
  Info,
  Telescope,
  XCircle,
  Zap,
} from "lucide-react";
import {
  formatFileSize,
  isValidFileType,
  createProjectFromFiles,
  FILE_TYPES,
} from "@utils/utils";
import { statusDescriptions, Mode } from "./oracleSearchBarManager";
import { OracleReportClarifications } from "../../reports/report-creation/OracleReportClarifications";
import { twMerge } from "tailwind-merge";
import { OracleHistoryItem } from "../OracleEmbed";
import { OracleSearchBarModeHeader } from "./OracleSearchBarModeHeader";
import { KEYMAP } from "../../../../../lib/constants/keymap";

const modeDisplayName = {
  "query-data": "Fast data analysis",
  report: "Deep research",
};

const modeIcons: Record<Mode, React.ReactNode> = {
  "query-data": (
    <Zap className="w-5 stroke-yellow-500 dark:stroke-yellow-600" />
  ),
  report: <Telescope className="w-5 stroke-blue-500 dark:stroke-blue-400" />,
};

const modeDescriptions: Record<Mode, string> = {
  "query-data":
    "Executes quick, direct SQL queries to retrieve specific data points with minimal processing",
  report:
    "Performs in-depth analysis, synthesizing multiple data sources to generate comprehensive insights and structured reports",
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

  const UploadedFileIcons = useMemo(() => {
    return draft?.uploadedFiles?.length ? (
      <div className="w-full">
        <div className="flex flex-wrap gap-2">
          {draft?.uploadedFiles?.length ? (
            <div className="flex flex-row items-center gap-2 w-full text-xs text-blue-600 dark:text-blue-400">
              <Info className="w-4 min-w-4" />
              <span>A new project will be created using your files</span>
            </div>
          ) : (
            <></>
          )}
          {draft.uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center flex-wrap max-w-full overflow-hidden justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center max-w-[85%]">
                <FileSpreadsheet className="w-4 h-4 mr-2 flex-shrink-0 stroke-blue-500 dark:stroke-blue-400" />
                <span className="truncate max-w-40" title={file.name}>
                  {file.name}
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
                      const newFiles = draft.uploadedFiles?.filter(
                        (_, i) => i !== index
                      );

                      searchBarManager.setDraft((prev) => ({
                        ...prev,
                        uploadedFiles: newFiles,
                      }));

                      newProjectName.current = null;
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

            // Update draft with processed files
            searchBarManager.setDraft((prev) => ({
              ...prev,
              uploadedFiles: [...prev.uploadedFiles, ...files],
            }));

            // Reset database info since we've added new files
            newProjectName.current = null;
          } catch (error) {
            console.error("Error processing files:", error);
            message.error(error.message);
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
                <Dropdown
                  disabled={selectedItem?.itemType === "query-data"}
                  trigger={
                    <>
                      {
                        modeIcons[
                          selectedItem?.itemType === "query-data"
                            ? "query-data"
                            : draft.mode
                        ]
                      }
                      <span className="whitespace-nowrap">
                        {
                          modeDisplayName[
                            selectedItem?.itemType === "query-data"
                              ? "query-data"
                              : draft.mode
                          ]
                        }
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  }
                >
                  {Object.entries(modeIcons).map(([key, icon]) => (
                    <MenuItem
                      key={key}
                      disabled={selectedItem?.itemType === "query-data"}
                      className="w-96"
                      onClick={() => {
                        searchBarManager.setMode(key as Mode);
                        setClarificationStarted(false);
                      }}
                      active={
                        (selectedItem?.itemType === "query-data" &&
                          key === "query-data") ||
                        draft.mode === key
                      }
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

                {draft.mode === "report" &&
                selectedItem?.itemType !== "query-data" ? (
                  <Toggle
                    // size="small"
                    // title="Use web search to enhance report"
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

                // Upload files first if there are any
                if (draft.uploadedFiles?.length > 0) {
                  console.log("Uploading files first");
                  try {
                    const uploadResponse = await createProjectFromFiles(
                      apiEndpoint,
                      token,
                      draft.uploadedFiles
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

                      // Update the projectName to use for clarifications
                      newProjectName.current = uploadResponse.projectName;

                      // Generate an automatic clarification question after file upload
                      // to understand what the user wants to analyze
                      if (question.trim() === "") {
                        const fileNames = [...(draft.uploadedFiles || [])]
                          .map((f) => f.name)
                          .join(", ");

                        // Set a default question about the uploaded files
                        const defaultQuestion = `I've uploaded ${fileNames}. What would you like to know about this data?`;

                        // Update the textarea with the default question
                        if (textAreaRef.current) {
                          textAreaRef.current.value = defaultQuestion;
                          textAreaRef.current.focus();
                        }

                        // Update the draft state with the default question
                        searchBarManager.setDraft((prev) => ({
                          ...prev,
                          userQuestion: defaultQuestion,
                        }));
                      }

                      onNewProjectCreated(newProjectName.current);
                    }
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
