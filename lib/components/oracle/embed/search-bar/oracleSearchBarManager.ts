import { AnalysisManager } from "lib/components/query-data/analysis/analysisManager";
import { ClarificationObject } from "../../reports/report-creation/ClarificationItem";

type QueryTaskType = "exploration" | "";

interface UploadedFile {
  buf: ArrayBuffer;
  fileName: string;
  size: number;
  type: string;
}

export type Mode = "query-data" | "oracle";

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
  uploadedPDFs?: UploadedFile[];
  /**
   * CSVs or Excel files. Once these are uploaded, they will be used as a "new db".
   */
  uploadedDataFiles?: UploadedFile[];
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
}

function createBlankDraft(): ReportDraft {
  return {
    reportId: "",
    status: "blank",
    loading: false,
    mode: "query-data",
    userQuestion: "",
    useWebsearch: true,
    uploadedPDFs: [],
    uploadedDataFiles: [],
  };
}

export const statusDescriptions: Record<Status, string> = {
  blank:
    "Add a spreadsheet or select a database, and start asking your questions!",
  getting_clarifications: "Getting clarifying questions...",
  clarifications_received: "Please answer these clarifying questions...",
  submitting: "Submitting for generation...",
};

export function OracleSearchBarManager(): OracleSearchBarManager {
  let draft: ReportDraft = createBlankDraft();
  let draftListeners: Listener[] = [];

  function alertDraftListeners() {
    console.log("called alertDraftListeners");
    draftListeners.forEach((listener) => listener());
  }

  function setDraft(newDraft: ReportDraft): void;
  function setDraft(draftFn: (oldDraft: ReportDraft) => ReportDraft): void;
  function setDraft(
    newDraftOrFn: ReportDraft | ((oldDraft: ReportDraft) => ReportDraft)
  ) {
    console.log("called setDraft");
    if (typeof newDraftOrFn === "function") {
      draft = newDraftOrFn(draft);
    } else {
      draft = newDraftOrFn;
    }

    alertDraftListeners();
  }

  function getDraft() {
    console.log("called getDraft");
    return draft;
  }

  function resetDraft() {
    console.log("called resetDraft");
    setDraft(createBlankDraft());
  }

  function subscribeToDraftChanges(listener: Listener) {
    console.log("called subscribeToDraftChanges");
    draftListeners.push(listener);

    return function unsubscribe() {
      console.log("called unsub subscribeToDraftChanges");
      draftListeners = draftListeners.filter((l) => l !== listener);
    };
  }

  function setMode(newMode: Mode) {
    setDraft({ ...draft, mode: newMode });
  }

  function setReportId(newReportId: string) {
    setDraft({ ...draft, reportId: newReportId });
  }

  function setStatus(newStatus: Status) {
    setDraft({ ...draft, status: newStatus });
  }

  return {
    getDraft,
    setDraft,
    resetDraft,
    subscribeToDraftChanges,
    setMode,
    setReportId,
    setStatus,
  };
}
