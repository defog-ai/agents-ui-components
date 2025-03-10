import {
  generateReport,
  getClarifications,
  uploadFiles,
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
import { formatFileSize, isValidFileType, raf } from "@utils/utils";
import { statusDescriptions, Mode } from "./oracleSearchBarManager";
import { OracleReportClarifications } from "../../reports/report-creation/OracleReportClarifications";
import { twMerge } from "tailwind-merge";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../../../../../lib/components/query-data/analysis-tree-viewer/analysisTreeManager";
import { OracleHistoryItem } from "../OracleEmbed";
import { OracleSearchBarModeHeader } from "./OracleSearchBarModeHeader";
import { scrollToAnalysis } from "../../../../../lib/components/query-data/analysis-tree-viewer/AnalysisTreeViewer";
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

// Upload Progress Bar Component
const UploadProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>Uploading files...</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const itemTypeClasses = {
  default:
    "absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-full px-4",
  "query-data":
    "absolute bottom-40 left-1/2 -translate-x-1/2 translate-y-full w-full px-4",
  report:
    "absolute -bottom-48 left-1/2 -translate-x-1/2 translate-y-full w-full px-4 opacity-0",
  "new-db":
    "absolute -bottom-48 left-1/2 -translate-x-1/2 translate-y-full w-full px-4 opacity-0",
};

export function OracleSearchBar({
  dbName,
  uploadNewDbOption,
  onClarified,
  onReportGenerated,
  onNewAnalysisTree,
  rootClassNames = "",
  selectedItem = null,
}: {
  dbName: string;
  uploadNewDbOption: string;
  onClarified: (newDbName?: string) => void;
  onReportGenerated?: (data: {
    userQuestion: string;
    reportId: string;
    status: string;
  }) => void;
  onNewAnalysisTree?: (data: {
    userQuestion: string;
    analysisTree: AnalysisTree;
    rootAnalysisId: string;
    treeManager: AnalysisTreeManager;
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const newDbName = useRef<string | null>(null);
  const newDbInfo = useRef<DbInfo | null>(null);

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
          dbName,
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
  }, [draft, apiEndpoint, token, dbName, onReportGenerated, message]);

  // Function to handle analysis creation when in query-data mode
  const createNewAnalysis = useCallback(
    async (question: string, treeManager?: AnalysisTreeManager) => {
      if (!onNewAnalysisTree) return;

      try {
        // Generate a new UUID for the analysis
        const analysisId = crypto.randomUUID();

        if (selectedItem && selectedItem.itemType === "query-data") {
          const { newAnalysis } = await selectedItem.treeManager?.submit({
            question,
            dbName,
            analysisId,
            rootAnalysisId: selectedItem.itemId,
            isRoot: false,
            directParentId: selectedItem.treeManager.getActiveAnalysisId(),
            activeTab: "table",
          });

          raf(() => {
            scrollToAnalysis(newAnalysis.analysisId);
          });
        } else {
          // Create a new analysis tree manager
          const newAnalysisTreeManager = treeManager || AnalysisTreeManager();

          // Submit the question to create a new root analysis
          await newAnalysisTreeManager.submit({
            question,
            dbName,
            analysisId,
            rootAnalysisId: analysisId,
            isRoot: true,
            directParentId: null,
            sqlOnly: false,
            isTemp: false,
            activeTab: "table",
          });

          // Get the tree data
          const treeData = newAnalysisTreeManager.getTree();

          // Notify parent component about the new analysis
          onNewAnalysisTree({
            userQuestion: question,
            analysisTree: treeData,
            rootAnalysisId: analysisId,
            treeManager: newAnalysisTreeManager,
          });
        }
      } catch (error) {
        console.error("Error creating new analysis:", error);
        setErrorMessage("Failed to create analysis: " + error.message);
      }
    },
    [selectedItem, dbName, onNewAnalysisTree]
  );

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
      callback: () => {
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
              <span>
                A new database will be created using your uploaded csv/excel
                files
              </span>
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
    <div
      className={twMerge(
        "transition-all duration-700 ease-in-out z-[10] *:transition-all *:duration-700 *:ease-in-out",
        itemTypeClasses[
          selectedItem?.itemType ||
            (dbName === uploadNewDbOption ? "new-db" : "default")
        ]
      )}
    >
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
        rootClassNames={twMerge(
          "drop-drop min-h-0 relative z-[2] rounded-2xl p-2 border bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
          selectedItem?.itemType === "query-data"
            ? "shadow-custom border-gray-300 dark:border-gray-600"
            : "",
          rootClassNames
        )}
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
          try {
            e.preventDefault();
            e.stopPropagation();
            if (selectedItem?.itemType === "query-data") return;
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

                if (isValidFileType(file.type, draft.mode === "report")) {
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

                if (
                  item.kind === "file" &&
                  isValidFileType(item.type, draft.mode === "report")
                ) {
                  const file = item.getAsFile();
                  if (file) {
                    console.log(`Item converted to file: ${file.name}`);
                    filesToProcess.push(file);
                  }
                }
              }
            }

            console.log(
              `Total valid files to process: ${filesToProcess.length}`
            );

            if (filesToProcess.length === 0) {
              console.error("No valid files found");
              throw new Error(
                draft.mode === "report"
                  ? "Only CSV, Excel or PDF files are accepted."
                  : "Only CSV or Excel files are accepted in fast analysis mode."
              );
            }

            // Update draft with processed files
            searchBarManager.setDraft((prev) => ({
              ...prev,
              uploadedFiles: filesToProcess,
            }));

            // Reset database info since we've added new files
            newDbName.current = null;
            newDbInfo.current = null;
          } catch (error) {
            console.error("Error processing files:", error);
            message.error(error.message);
          }
        }}
      >
        <OracleSearchBarModeHeader selectedItem={selectedItem} />
        <TextArea
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
                )}{" "}
                {selectedItem?.itemType ? "to submit " : "to start "}
                {draft.mode === "report" &&
                  selectedItem?.itemType !== "query-data" &&
                  "Drop PDFs to add context to the report. "}
                {selectedItem?.itemType !== "query-data"
                  ? "Drop CSV or Excel files to analyse them."
                  : ""}
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
                : draft.mode === "report"
                  ? "Type your question here or drop PDF, CSV or Excel files"
                  : "Type your question here or drop CSV or Excel files"
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

                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  userQuestion: question,
                  status: "getting_clarifications",
                }));

                // prepare either for success or a new error message
                setErrorMessage("");

                // If in query-data mode, create a new analysis instead of getting clarifications
                // of if we're in a query-data item itself, create analysis
                if (
                  draft.mode === "query-data" ||
                  selectedItem?.itemType === "query-data"
                ) {
                  // Create new analysis for fast data analysis mode
                  await createNewAnalysis(question);

                  // Reset the search bar text
                  if (textAreaRef.current) {
                    textAreaRef.current.value = "";
                  }
                } else {
                  // Oracle mode - upload files first if any, then get clarifications for deep research
                  let newDbNameFromUpload = null;
                  let newDbInfoFromUpload = null;

                  // Upload files first if there are any
                  if (draft.uploadedFiles?.length > 0) {
                    console.log("Uploading files first");
                    try {
                      setUploadProgress(0);
                      const uploadResponse = await uploadFiles(
                        apiEndpoint,
                        token,
                        dbName,
                        draft.uploadedFiles,
                        (progress) => {
                          setUploadProgress(progress);
                        }
                      );

                      // If the upload creates a new database, save that info
                      if (uploadResponse.db_name !== dbName) {
                        console.log(
                          "New DB created from file upload:",
                          uploadResponse.db_name
                        );
                        newDbNameFromUpload = uploadResponse.db_name;

                        // Update the dbName to use for clarifications
                        newDbName.current = uploadResponse.db_name;

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
                      }
                    } catch (uploadError) {
                      console.error("Error uploading files:", uploadError);
                      throw new Error(
                        `Failed to upload files: ${uploadError.message}`
                      );
                    }
                  }

                  // Now get clarifications with the possibly updated DB name
                  const useDbName = newDbNameFromUpload || dbName;
                  console.log(
                    "Getting clarifications with DB name:",
                    useDbName
                  );

                  const res = await getClarifications(
                    apiEndpoint,
                    token,
                    useDbName,
                    question
                  );

                  searchBarManager.setDraft((prev) => ({
                    ...prev,
                    status: "clarifications_received",
                    clarifications: res.clarifications,
                    reportId: res.report_id,
                  }));

                  // If we have a new DB name either from file upload or from clarifications
                  if (newDbNameFromUpload || res.new_db_name) {
                    // Prefer the upload response if it exists, otherwise use the clarification response
                    newDbName.current = newDbNameFromUpload || res.new_db_name;
                    newDbInfo.current = newDbInfoFromUpload || res.new_db_info;
                    onClarified(newDbName.current);
                  }
                }

                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  loading: false,
                  status: "clarifications_received",
                  userQuestion: question,
                }));
              } catch (e) {
                console.log(e);
                setErrorMessage(e.toString());
                searchBarManager.setDraft((prev) => ({
                  ...prev,
                  loading: false,
                  status: "blank",
                }));
              } finally {
                setLoading(false);
                // If there's an error, allow the user to try again
                setClarificationStarted(false);
              }
            }
          }}
        />
      </DropFilesHeadless>

      <div
        className={twMerge(
          "w-11/12 mx-auto my-0 h-0 relative z-[1] overflow-auto rounded-b-xl border-blue-500  dark:bg-sky-900 dark:border-sky-600 border border-t-0 bg-sky-200",
          loading && draft.uploadedFiles?.length > 0 && uploadProgress > 0
            ? "h-20 border" // Increased height when showing upload progress
            : loading
              ? "h-8 border-none"
              : draft.clarifications &&
                  draft.clarifications.length > 0 &&
                  !selectedItem &&
                  draft.mode !== "query-data"
                ? "h-96"
                : "h-0 border-none"
        )}
      >
        {loading ? (
          <div className="flex flex-col gap-2 py-2 px-4">
            <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
              <SpinningLoader classNames="w-4 mr-1" />
              {statusDescriptions[draft.status]}
            </span>
            {draft.uploadedFiles?.length > 0 && uploadProgress > 0 && (
              <UploadProgressBar progress={uploadProgress} />
            )}
          </div>
        ) : (
          <div className={twMerge("py-2 px-4")}>
            <OracleReportClarifications
              handleGenerateReport={handleGenerateReport}
            />
          </div>
        )}
      </div>
    </div>
  );
}
