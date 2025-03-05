// editorUtils.ts
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Markdown } from "tiptap-markdown";
import CommentExtension from "@sereneinserenade/tiptap-comment-extension";
import debounce from "lodash.debounce";
import { Editor } from "@tiptap/core";

import { OracleReportMultiTableExtension } from "../reports/tiptap-extensions/OracleReportMultiTable";
import { OracleReportImageExtension } from "../reports/tiptap-extensions/OracleReportImage";
import { OracleCommentHandlerExtension } from "../reports/tiptap-extensions/comments/OracleCommentHandler";
import { updateReportComments, updateReportMDX } from "./apiServices.ts";
import { OracleReportComment, CommentManager } from "./types";

// Extensions configurations
export const extensions = [
  StarterKit,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  OracleCommentHandlerExtension,
  CommentExtension.configure({
    HTMLAttributes: {
      class: "oracle-report-comment",
    },
  }),
  Markdown,
];

export const analysisExtensions = [
  StarterKit,
  OracleReportMultiTableExtension,
  OracleReportImageExtension,
];

export const revisionExtensions = [
  StarterKit,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  OracleReportMultiTableExtension,
  OracleReportImageExtension,
  CommentExtension.configure({
    HTMLAttributes: {
      class: "oracle-report-comment",
    },
  }),
  Markdown,
];

// Debounced function for comment updates
const debouncedSendUpdates = debounce(
  async (
    apiEndpoint: string,
    editor: Editor,
    reportId: string,
    dbName: string,
    token: string,
    updatedComments: OracleReportComment[]
  ) => {
    if (!reportId || !dbName) return;

    try {
      await Promise.all([
        updateReportComments(
          apiEndpoint,
          reportId,
          dbName,
          token,
          updatedComments
        ),
        updateReportMDX(
          apiEndpoint,
          reportId,
          dbName,
          token,
          editor?.storage.markdown.getMarkdown()
        ),
      ]);
    } catch (error) {
      console.error("Error updating comments:", error);
    }
  },
  500
);

// Function to send comment updates
export const sendCommentUpdates = (
  apiEndpoint: string,
  editor: Editor,
  reportId: string,
  dbName: string,
  token: string,
  newComments: OracleReportComment[]
) => {
  editor.storage["oracle-comment-handler"].comments = newComments;
  debouncedSendUpdates(
    apiEndpoint,
    editor,
    reportId,
    dbName,
    token,
    newComments
  );
};

// Comment manager factory function
export const commentManager = ({
  apiEndpoint,
  reportId,
  dbName,
  token,
  initialComments,
}: {
  apiEndpoint: string;
  reportId: string;
  dbName: string;
  token: string;
  initialComments: OracleReportComment[];
}): CommentManager => {
  let comments = initialComments;
  let commentListeners: (() => void)[] = [];

  const subscribeToCommentUpdates = (listener: () => void) => {
    commentListeners.push(listener);

    return function unsubscribe() {
      commentListeners = commentListeners.filter((l) => l !== listener);
    };
  };

  const getComments = () => {
    return comments;
  };

  const updateComments = (
    editor: Editor,
    updatedComments: OracleReportComment[]
  ) => {
    comments = updatedComments;
    sendCommentUpdates(apiEndpoint, editor, reportId, dbName, token, comments);
    commentListeners.forEach((listener) => listener());
  };

  return {
    subscribeToCommentUpdates,
    getComments,
    updateComments,
  };
};

export const TABLE_TYPE_TO_NAME = {
  table_csv: "Aggregated data",
  fetched_table_csv: "Fetched data",
  anomalies_csv: "Anomalies data",
};
