import { useContext, useEffect, useState, useSyncExternalStore } from "react";
import { OracleCommentPopover } from "./OracleCommentPopover";
import type { OracleReportComment } from "../../OracleReportContext";
import {
  Editor,
  mergeAttributes,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useCurrentEditor,
} from "@tiptap/react";
import { OracleReportContext } from "../../OracleReportContext";
import { MessageSquarePlus } from "lucide-react";
import type { CommentManager } from "../../oracleUtils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ["oracle-comment-handler"]: {
      /**
       * Adds a comment and emits a commentCreated event
       */
      addComment: (comment: OracleReportComment) => ReturnType;
    };
  }
  interface EditorEvents {
    commentCreated: [comment: OracleReportComment];
  }
}

// Types
interface CommentState {
  hoveredId: string | null;
  hoveredElement: HTMLElement | null;
  editingId: string | null;
  relativeTop: number | null;
  pmPos: { inside: number; pos: number } | null;
  pmNode: any | null;
}

// Custom hook for comment interactions
function useCommentInteractions(editor: Editor) {
  const [interactionState, setInteractionState] = useState<CommentState>({
    hoveredId: null,
    hoveredElement: null,
    editingId: null,
    relativeTop: null,
    pmPos: null,
    pmNode: null,
  });

  useEffect(() => {
    if (!editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const commentId = target.getAttribute("data-comment-id");
      const isEditor = target.classList.contains("oracle-report-tiptap");
      const isCommentHandler = target.closest(".oracle-comment-handler");
      const isInsideEditor = target.closest(".oracle-report-tiptap");
      const isValid = !isEditor && !isCommentHandler && isInsideEditor;

      // if we're not editing a comment, set the interaction state
      // and also check if we're hovering over an element INSIDE the editor only
      // otherwise set it to null
      if (!interactionState.editingId && isValid) {
        // get the top offset of this element relative to the editor
        const editorTop = editor.view.dom.getBoundingClientRect().top;
        // get the top offset of the element relative to the document
        const elementTop = target.getBoundingClientRect().top;
        // calculate the top offset relative to the editor
        const relativeTop = elementTop - editorTop;

        const nodePos = editor.view.posAtCoords({
          left: e.clientX,
          top: e.clientY,
        });

        if (!nodePos) return;

        const node = editor.view.nodeDOM(nodePos.inside);

        setInteractionState((prev) => ({
          ...prev,
          hoveredId: commentId,
          hoveredElement: target,
          relativeTop,
          pmPos: nodePos,
          pmNode: node,
        }));
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const commentId = target.getAttribute("data-comment-id");
      // if this was on the comment icon don't do anything
      // otherwise this interferes with the "show popup as soon as comment is created" logic
      if (
        target.tagName === "svg" ||
        target.tagName === "path" ||
        target.closest(".comment-icon")
      ) {
        return;
      }

      if (commentId) {
        e.stopPropagation();
        setInteractionState((prev) => ({
          ...prev,
          editingId: commentId,
          hoveredId: commentId,
          hoveredElement: target,
        }));
      }
    };

    // editor.view.dom.addEventListener("mousemove", handleMouseMove, true);
    // editor.view.dom.addEventListener("click", handleClick, true);

    return () => {
      // editor.view.dom.removeEventListener("mousemove", handleMouseMove, true);
      // editor.view.dom.removeEventListener("click", handleClick, true);
    };
  }, [editor, interactionState.editingId]);

  return { interactionState, setInteractionState };
}

function OracleCommentHandlerInner({
  editor,
  commentManager,
}: {
  editor: Editor;
  commentManager: CommentManager;
}) {
  const comments = useSyncExternalStore(
    commentManager.subscribeToCommentUpdates,
    commentManager.getComments
  );

  const { interactionState, setInteractionState } =
    useCommentInteractions(editor);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "svg" ||
        target.tagName === "path" ||
        target.closest(".comment-icon")
      ) {
        return;
      }

      if (
        !target.closest(".comment-popover") &&
        !target.getAttribute("data-comment-id")
      ) {
        setInteractionState(() => ({
          hoveredId: null,
          hoveredElement: null,
          editingId: null,
          relativeTop: null,
          pmPos: null,
          pmNode: null,
        }));
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [setInteractionState]);

  useEffect(() => {
    editor.on("commentCreated", (comment: OracleReportComment) => {
      commentManager.updateComments(editor, [...comments, comment]);
      setInteractionState((prev) => ({
        ...prev,
        editingId: comment.id,
        hoveredElement: document.querySelector(
          `[data-comment-id="${comment.id}"]`
        ),
      }));
    });

    return () => {
      editor.off("commentCreated");
    };
  }, [editor, comments, commentManager, setInteractionState]);

  const activeComment = comments.find(
    (c) =>
      c.id === interactionState.hoveredId || c.id === interactionState.editingId
  );

  return (
    <NodeViewWrapper className="h-full w-0 absolute top-0 right-0 oracle-comment-handler">
      {activeComment && (
        <OracleCommentPopover
          onDelete={() => {
            editor.commands.unsetComment(activeComment.id);
            const newComments = comments.filter(
              (c) => c.id !== activeComment.id
            );
            commentManager.updateComments(editor, newComments);
            setInteractionState((prev) => ({ ...prev, editingId: null }));
          }}
          comment={activeComment}
          anchorEl={interactionState.hoveredElement}
          isEditing={interactionState.editingId === activeComment.id}
          onUpdate={(updatedComment) => {
            commentManager.updateComments(
              editor,
              comments.map((c) =>
                c.id === updatedComment.id ? updatedComment : c
              )
            );
          }}
        />
      )}
      <div className="comment-ramp h-full absolute -right-2 top-0">
        {interactionState.hoveredElement &&
          !interactionState.editingId &&
          !interactionState.hoveredId && (
            <MessageSquarePlus
              className="comment-icon absolute w-5 left-2 cursor-pointer text-gray-400 hover:scale-110 hover:text-gray-500 transition-none"
              style={{
                top: `${interactionState.relativeTop}px`,
              }}
              onClick={() => {
                if (interactionState.pmPos && interactionState.pmNode) {
                  editor
                    .chain()
                    .setNodeSelection(interactionState.pmPos.inside)
                    .addComment({
                      id: crypto.randomUUID(),
                      content: "",
                      user: localStorage.getItem("user"),
                    })
                    .run();
                }
              }}
            />
          )}
      </div>
    </NodeViewWrapper>
  );
}

export function OracleCommentHandler() {
  const { editor } = useCurrentEditor();
  const { commentManager } = useContext(OracleReportContext);

  if (!editor || !commentManager) {
    return null;
  }

  return (
    <OracleCommentHandlerInner
      editor={editor}
      commentManager={commentManager}
    />
  );
}

/**
 * Setting this up as an extension helps us
 */
export const OracleCommentHandlerExtension = Node.create({
  name: "oracle-comment-handler",
  group: "block",
  parseHTML() {
    return [
      {
        tag: "oracle-comment-handler",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["oracle-comment-handler", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(OracleCommentHandler);
  },
  addOptions() {
    return {
      HTMLAttributes: {
        class: "oracle-comment-handler",
      },
    };
  },
  addStorage() {
    return {
      comments: [] as OracleReportComment[],
    };
  },
  addCommands() {
    return {
      addComment:
        (comment) =>
        ({ tr, chain }) => {
          const { $from, $to } = tr.selection;

          // here we use tr.mapping.map to map the position between transaction steps
          let from = tr.mapping.map($from.pos);
          let to = tr.mapping.map($to.pos);

          if (from === to) return;

          chain()
            // add the comment normally to the selection
            .setComment(comment.id)
            .run();

          chain()
            // reset the selection
            // NOTE: this seems to be buggy and doesn't clear the selection if multiple different inline nodes are selected (for eg if the selection spans from a bold tag to a normal span)
            .setTextSelection(from)
            .command(({ editor }) => {
              editor.emit("commentCreated", comment);
              return true;
            })
            .run();

          return true;
        },
    };
  },
});
