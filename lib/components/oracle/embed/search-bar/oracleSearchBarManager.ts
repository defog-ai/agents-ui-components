import { ClarificationObject } from "../../reports/report-creation/ClarificationItem";

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

type Listener = () => void;

export interface OracleSearchBarManager {
  getDraft(): ReportDraft;
  setDraft(draft: ReportDraft): void;
  setDraft(draftFn: (oldDraft: ReportDraft) => ReportDraft): void;
  resetDraft(): void;
  subscribeToDraftChanges(listener: Listener): () => void;
}

export function OracleSearchBarManager(): OracleSearchBarManager {
  console.log("called main func");
  let draft: ReportDraft = {};
  let draftListeners: Listener[] = [];
  let uploadedPdfs: UploadedFile[] = [];
  let uploadedDataFiles: UploadedFile[] = [];

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
    draft = {};
  }

  function subscribeToDraftChanges(listener: Listener) {
    console.log("called subscribeToDraftChanges");
    draftListeners.push(listener);

    return function unsubscribe() {
      console.log("called unsub subscribeToDraftChanges");
      draftListeners = draftListeners.filter((l) => l !== listener);
    };
  }

  return {
    getDraft,
    setDraft,
    resetDraft,
    subscribeToDraftChanges,
  };
}
