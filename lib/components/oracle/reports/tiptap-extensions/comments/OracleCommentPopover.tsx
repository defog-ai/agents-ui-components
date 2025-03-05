import { useRef, useEffect, useState, useContext } from "react";
import { type OracleReportComment } from "../../../utils";
import { TextArea } from "@ui-components";
import { twMerge } from "tailwind-merge";

interface CommentPopoverProps {
  comment: OracleReportComment;
  onUpdate?: (updatedComment: OracleReportComment) => void;
  onDelete?: () => void;
  anchorEl?: HTMLElement | null;
  isEditing: boolean;
}

export function OracleCommentPopover({
  comment,
  onUpdate,
  onDelete,
  anchorEl,
  isEditing,
}: CommentPopoverProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (popoverRef.current && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const popover = popoverRef.current;

      // Position above the highlight by default
      popover.style.position = "fixed";
      // Center horizontally on the highlight
      popover.style.left = `${
        rect.left + rect.width / 2 - popover.offsetWidth / 2
      }px`;
      popover.style.top = `${rect.top - popover.offsetHeight - 8}px`; // 8px gap

      // If there's not enough space above, show below
      if (rect.top < popover.offsetHeight + 16) {
        // 16px for some padding
        popover.style.top = `${rect.bottom + 8}px`;
      }
    }
  }, [anchorEl]);

  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsTextareaFocused(false);
    const updatedComment = {
      ...comment,
      content: e.target.value,
    };
    onUpdate?.(updatedComment);
  };

  const handleFocus = () => {
    setIsTextareaFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const updatedComment = {
        ...comment,
        content: e.currentTarget.value,
      };
      onUpdate?.(updatedComment);
      // Remove focus from textarea
      e.currentTarget.blur();
    }
  };

  const handleSubmit = () => {
    if (textareaRef.current) {
      const updatedComment = {
        ...comment,
        content: textareaRef.current.value,
      };
      onUpdate?.(updatedComment);
      textareaRef.current.blur();
    }
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (!anchorEl) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 p-2 border rounded-lg bg-white shadow-custom comment-popover not-prose border-gray-300 overflow-hidden dark:bg-gray-700 dark:border-gray-600 w-80"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs flex flex-row mb-1 items-center">
        <p className="text-gray-400">
          {isEditing
            ? isTextareaFocused
              ? "Commenting"
              : "Posted"
            : "Click to edit comment"}
        </p>
        <div className="flex gap-2 ml-auto">
          {isEditing && (
            <>
              <button
                onClick={handleSubmit}
                className={`cursor-pointer ${
                  isTextareaFocused
                    ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    : "text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                }`}
              >
                Submit
              </button>
              <div
                className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-300 cursor-pointer"
                onClick={onDelete}
              >
                Delete
              </div>
            </>
          )}
        </div>
      </div>
      <TextArea
        ref={textareaRef}
        defaultValue={comment.content}
        defaultRows={2}
        textAreaHtmlProps={{
          onBlur: handleBlur,
          onFocus: handleFocus,
          onKeyDown: handleKeyDown,
          onClick: (e) => e.stopPropagation(),
        }}
        textAreaClassNames={twMerge(
          "w-full bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 resize-none overflow-hidden dark:bg-gray-800 dark:text-gray-400 dark:border-none",
          isEditing
            ? "cursor-text dark:text-gray-200"
            : "cursor-default text-gray-500 dark:text-gray-400"
        )}
        disabled={!isEditing}
        autoResize={true}
        placeholder="Type your comment here"
      />
    </div>
  );
}
