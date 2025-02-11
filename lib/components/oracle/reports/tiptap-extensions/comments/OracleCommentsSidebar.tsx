import { useContext } from "react";
import { OracleReportContext } from "../../../OracleReportContext";
import { useSyncExternalStore } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@ui-components";
import { twMerge } from "tailwind-merge";

interface OracleCommentsSidebarProps {
  onClose: () => void;
}

export function OracleCommentsSidebar({ onClose }: OracleCommentsSidebarProps) {
  const { commentManager } = useContext(OracleReportContext);

  const comments = useSyncExternalStore(
    commentManager?.subscribeToCommentUpdates || (() => () => {}),
    commentManager?.getComments || (() => [])
  );

  return (
    <div className="w-64 h-full flex flex-col">
      <div className="h-[3.5rem] invisible" />
      <div className="flex-1 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Comments</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({comments.length})
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No comments yet
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  {comment.user && (
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {comment.user}
                    </div>
                  )}
                  <div
                    className={twMerge(
                      "text-sm text-gray-600 dark:text-gray-300",
                      !comment.content && "text-gray-300"
                    )}
                  >
                    {comment.content || "Blank comment"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
