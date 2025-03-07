import { ClarificationObject } from "../../reports/report-creation/ClarificationItem";

type QueryTaskType = "exploration" | "";

export type Mode = "query-data" | "report";

type Status =
  | "blank"
  | "getting_clarifications"
  | "clarifications_received"
  | "submitting";

interface ReportDraft {
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

type Listener = () => void;

export interface OracleSearchBarManager {
  getDraft(): ReportDraft;
  setDraft(draft: ReportDraft): void;
  setDraft(draftFn: (oldDraft: ReportDraft) => ReportDraft): void;
  resetDraft(): void;
  subscribeToDraftChanges(listener: Listener): () => void;
  setMode(newMode: Mode): void;
  setReportId(newReportId: string): void;
  setStatus(newStatus: Status): void;
  setQuestion(newQuestion: string): void;
}

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

export const statusDescriptions: Record<Status, string> = {
  blank:
    "Add a spreadsheet or select a database, and start asking your questions!",
  getting_clarifications:
    "Analyzing database and thinking if I need to ask clarifying questions. This can take 15-20 seconds...",
  clarifications_received: "Please answer these clarifying questions...",
  submitting: "Submitting for generation...",
};

export function OracleSearchBarManager(): OracleSearchBarManager {
  let draft: ReportDraft = createBlankDraft();
  let draftListeners: Listener[] = [];

  function alertDraftListeners() {
    draftListeners.forEach((listener) => listener());
  }

  function setDraft(newDraft: ReportDraft): void;
  function setDraft(draftFn: (oldDraft: ReportDraft) => ReportDraft): void;
  function setDraft(
    newDraftOrFn: ReportDraft | ((oldDraft: ReportDraft) => ReportDraft)
  ) {
    if (typeof newDraftOrFn === "function") {
      draft = newDraftOrFn(draft);
    } else {
      draft = newDraftOrFn;
    }

    alertDraftListeners();
  }

  function getDraft() {
    return draft;
  }

  function resetDraft() {
    setDraft(createBlankDraft());
  }

  function subscribeToDraftChanges(listener: Listener) {
    draftListeners.push(listener);

    return function unsubscribe() {
      draftListeners = draftListeners.filter((l) => l !== listener);
    };
  }

  function setMode(newMode: Mode) {
    setDraft((prev) => ({
      ...prev,
      mode: newMode,
      userQuestion: prev.userQuestion,
      clarifications: null,
    }));
  }

  function setReportId(newReportId: string) {
    setDraft({ ...draft, reportId: newReportId });
  }

  function setStatus(newStatus: Status) {
    setDraft({ ...draft, status: newStatus });
  }

  function setQuestion(newQuestion: string) {
    setDraft({ ...draft, userQuestion: newQuestion });
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
