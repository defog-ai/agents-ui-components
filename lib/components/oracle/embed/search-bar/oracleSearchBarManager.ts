import { ClarificationObject } from "../../reports/report-creation/ClarificationItem";

/**
 * Type representing the task type for a query
 */
export type QueryTaskType = "exploration" | "";

/**
 * Available modes for the Oracle search bar
 */
export type Mode = "query-data" | "report";

/**
 * Status states for the search bar
 */
export type Status =
  | "blank"
  | "getting_clarifications"
  | "clarifications_received"
  | "submitting";

/**
 * Interface for the draft report state
 */
export interface ReportDraft {
  reportId: string;
  status: Status;
  mode: Mode;
  loading: boolean;
  userQuestion?: string;
  task_type?: QueryTaskType;
  clarifications?: ClarificationObject[];
  useWebsearch?: boolean;
  uploadedFiles?: File[];
}

/**
 * Type for listener functions
 */
type Listener = () => void;

/**
 * Interface defining the search bar manager methods
 */
export interface OracleSearchBarManager {
  /**
   * Get the current draft state
   */
  getDraft(): ReportDraft;
  
  /**
   * Set draft with new draft object
   */
  setDraft(draft: ReportDraft): void;
  
  /**
   * Set draft with a function that receives the old draft and returns a new one
   */
  setDraft(draftFn: (oldDraft: ReportDraft) => ReportDraft): void;
  
  /**
   * Reset the draft to its initial state
   */
  resetDraft(): void;
  
  /**
   * Subscribe to changes in the draft state
   * @returns Unsubscribe function
   */
  subscribeToDraftChanges(listener: Listener): () => void;
  
  /**
   * Update the search bar mode
   */
  setMode(newMode: Mode): void;
  
  /**
   * Update the report ID
   */
  setReportId(newReportId: string): void;
  
  /**
   * Update the search bar status
   */
  setStatus(newStatus: Status): void;
  
  /**
   * Update the user question
   */
  setQuestion(newQuestion: string): void;
}

/**
 * Create a blank draft with default values
 */
function createBlankDraft(): ReportDraft {
  return {
    reportId: "",
    status: "blank",
    loading: false,
    mode: "query-data",
    userQuestion: "",
    useWebsearch: true,
    uploadedFiles: [],
  };
}

/**
 * Descriptions for each status state
 */
export const statusDescriptions: Record<Status, string> = {
  blank:
    "Add a spreadsheet or select a database, and start asking your questions!",
  getting_clarifications:
    "Analyzing database and thinking if I need to ask clarifying questions. This can take 15-20 seconds...",
  clarifications_received: "Please answer these clarifying questions...",
  submitting: "Submitting for generation...",
};

/**
 * Factory function that creates an OracleSearchBarManager instance
 */
export function OracleSearchBarManager(): OracleSearchBarManager {
  let draft: ReportDraft = createBlankDraft();
  let draftListeners: Listener[] = [];

  /**
   * Notify all listeners of draft changes
   */
  function alertDraftListeners() {
    draftListeners.forEach((listener) => listener());
  }

  /**
   * Implementation for setDraft that handles both function and object inputs
   */
  function setDraft(newDraftOrFn: ReportDraft | ((oldDraft: ReportDraft) => ReportDraft)) {
    if (typeof newDraftOrFn === "function") {
      draft = newDraftOrFn(draft);
    } else {
      draft = newDraftOrFn;
    }

    alertDraftListeners();
  }

  /**
   * Get the current draft state
   */
  function getDraft() {
    return draft;
  }

  /**
   * Reset draft to initial state
   */
  function resetDraft() {
    setDraft(createBlankDraft());
  }

  /**
   * Subscribe to draft changes
   * @returns Unsubscribe function
   */
  function subscribeToDraftChanges(listener: Listener) {
    draftListeners.push(listener);

    return function unsubscribe() {
      draftListeners = draftListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Update the search bar mode
   */
  function setMode(newMode: Mode) {
    setDraft((prev) => ({
      ...prev,
      mode: newMode,
    }));
  }

  /**
   * Update the report ID
   */
  function setReportId(newReportId: string) {
    setDraft((prev) => ({
      ...prev,
      reportId: newReportId,
    }));
  }

  /**
   * Update the search bar status
   */
  function setStatus(newStatus: Status) {
    setDraft((prev) => ({
      ...prev,
      status: newStatus,
    }));
  }

  /**
   * Update the user question
   */
  function setQuestion(newQuestion: string) {
    setDraft((prev) => ({
      ...prev,
      userQuestion: newQuestion,
    }));
  }

  return {
    getDraft,
    setDraft,
    resetDraft,
    subscribeToDraftChanges,
    setMode,
    setReportId,
    setStatus,
    setQuestion,
  };
}