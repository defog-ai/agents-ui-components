import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowLeft, Info } from "lucide-react";
import {
  Button,
  MessageManagerContext,
  Modal,
  SpinningLoader,
  TextArea,
} from "@ui-components";
import { OracleReportContext } from "../OracleReportContext";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import {
  revisionExtensions,
  getReportStatus,
  submitForRevision,
} from "../oracleUtils";

export const OracleNav = () => {
  const [reviseModalOpen, setReviseModalOpen] = useState<boolean>(false);

  const message = useContext(MessageManagerContext);
  const { apiEndpoint, reportId, keyName, token, commentManager } =
    useContext(OracleReportContext);

  const generalCommentsRef = useRef<HTMLTextAreaElement>(null);

  const comments = useSyncExternalStore(
    commentManager?.subscribeToCommentUpdates,
    commentManager?.getComments
  );

  const { editor } = useCurrentEditor();

  const commentDetails = useRef<{
    [commentId: string]: {
      htmlSnippet: string;
      id: string;
      topParent: any;
      topParentPos: number;
      commentRelevantText: string;
      commentContent: string;
      startPos: number;
      endPos: number;
      user: string | null;
    };
  }>({});

  const [status, setStatus] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    // Clear existing interval if any
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    const fetchStatus = async () => {
      try {
        const currentStatus = await getReportStatus(
          apiEndpoint,
          reportId,
          keyName,
          token
        );

        setPrevStatus((oldStatus) => {
          // Check if status changed from revision to done/error
          if (
            oldStatus &&
            oldStatus.startsWith("Revision in progress") &&
            (currentStatus === "done" || currentStatus === "error")
          ) {
            window.location.reload();
          }
          // Only update prevStatus if current status is different
          if (oldStatus !== currentStatus) {
            return currentStatus;
          }
          return oldStatus;
        });
        setStatus(currentStatus);
        return currentStatus;
      } catch (error) {
        console.error("Error fetching report status:", error);
        return null;
      }
    };

    // Fetch immediately
    fetchStatus();

    // Set up polling every 5 seconds
    intervalIdRef.current = setInterval(async () => {
      const currentStatus = await fetchStatus();
      // stop polling if status is "done" or "error"
      if (currentStatus === "done" || currentStatus === "error") {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
      }
    }, 5000);
  };

  useEffect(() => {
    startPolling();
    // Cleanup on unmount
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [reportId, keyName, token]);

  const canSubmit = status && !status.startsWith("Revision in progress");

  if (!editor) return null;

  return (
    <>
      <div className="flex flex-row min-h-12 bg-transparent w-auto p-2 z-10">
        <div className="flex flex-row gap-2 ml-auto">
          {/* @ts-ignore */}
          <Button
            // disable submission for reports that are "Revision in progress"
            disabled={!canSubmit}
            onClick={() => {
              commentDetails.current = {};

              const doc = editor?.state.doc;
              if (!doc) return;

              // we will find the comments of a document by looking for all nodes with the "comment" mark
              // if a comment spans multiple kinds of text (for ex, normal text, bold text, etc)
              // tiptap will split them into multiple span tags, each individually wrapped in <span class="comment">...</span> tag
              // but what we want is the entire text that is highlighted, instead of individual spans
              // so we will find the nodes which have the mark, and find the topmost parent node of that marked node

              doc.nodesBetween(0, doc.content.size, (node, pos, parent) => {
                // @ts-ignore
                for (const mark of node.marks) {
                  if (mark.type.name === "comment") {
                    const endPos = pos + node.textContent.length;

                    const commentId = mark.attrs.commentId;
                    const comment = comments.find(
                      (comment) => comment.id === commentId
                    );

                    if (!comment) {
                      continue;
                    }

                    let foundRoot = false;

                    // `count` is for safety. Don't go beyond 10 parents
                    let count = 0;
                    let topParent = node;
                    let topParentPos = pos;
                    while (!foundRoot && count < 10 && topParent) {
                      editor.commands.setNodeSelection(topParentPos);
                      const thisParent = editor.state.selection.$from.parent;
                      // keep going through parents till we hit the root
                      if (thisParent.type.name === "doc") {
                        foundRoot = true;
                      } else {
                        topParent = thisParent;
                        topParentPos = editor.state.selection?.from;
                      }
                      editor.commands.selectParentNode();
                      count++;
                    }

                    if (!commentDetails.current[commentId]) {
                      commentDetails.current[commentId] = {
                        id: commentId,
                        topParent: topParent,
                        topParentPos: topParentPos,
                        htmlSnippet: "",
                        commentContent: comment.content,
                        commentRelevantText: "",
                        startPos: pos,
                        endPos: endPos,
                        user: comment.user,
                      };
                    } else {
                      commentDetails.current[commentId].topParent = topParent;
                      commentDetails.current[commentId].topParentPos =
                        topParentPos;

                      if (pos < commentDetails.current[commentId].startPos) {
                        commentDetails.current[commentId].startPos = pos;
                      }
                      if (endPos > commentDetails.current[commentId].endPos) {
                        commentDetails.current[commentId].endPos = endPos;
                      }
                    }
                  }
                }
                return true;
              });

              // extract the relevant text and comment text
              Object.values(commentDetails.current).forEach((commentDetail) => {
                let parentMarkdown = "";

                // if the top parent is a simple text node, it is most likely the recommendation title
                if (commentDetail.topParent.type.name === "text") {
                  parentMarkdown =
                    "<span class='oracle-report-comment' data-comment-id='temp'>" +
                    commentDetail.topParent.textContent +
                    "</span>";
                } else if (
                  commentDetail.topParent.type.name === "recommendationTitle"
                ) {
                  // add a header to the recommendation title
                  parentMarkdown =
                    "## " +
                    "<span class='oracle-report-comment' data-comment-id='temp'>" +
                    commentDetail.topParent.textContent +
                    "</span>";
                } else {
                  // serialize the top parent node
                  parentMarkdown =
                    '<span class="oracle-report-comment" data-comment-id="temp">' +
                    editor.storage.markdown.serializer.serialize(
                      commentDetail.topParent
                    ) +
                    "</span>";
                }

                // remove span tags
                const cleanedParentMarkdown = parentMarkdown
                  .replace(/<span[^>]*>/g, "")
                  .replace(/<\/span>/g, "");

                commentDetail.commentRelevantText = cleanedParentMarkdown;
                commentDetail.htmlSnippet = parentMarkdown;
              });

              setReviseModalOpen(true);
            }}
            className="ml-auto text-gray-700 dark:text-gray-300"
          >
            {!status ? (
              <>
                Getting status
                <SpinningLoader classNames="text-gray-200 ml-2 mr-0" />
              </>
            ) : canSubmit ? (
              "Submit for revision"
            ) : (
              "Revision in progress"
            )}
          </Button>
        </div>

        <Modal
          rootClassNames="w-full z-10"
          open={reviseModalOpen}
          onCancel={() => setReviseModalOpen(false)}
          onOk={() => {
            try {
              // Clear existing polling before submission
              if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
              }

              submitForRevision(
                apiEndpoint,
                reportId,
                keyName,
                token,
                generalCommentsRef.current?.value,
                Object.values(commentDetails.current).map((d) => ({
                  relevant_text: d.commentRelevantText,
                  comment_text: d.commentContent,
                }))
              )
                .then((res) => {
                  // set status to being revised
                  setStatus("Revision in progress");
                  setReviseModalOpen(false);
                  // Start polling again after getting server response
                  startPolling();
                })
                .catch((e) => {
                  console.error(e);
                  message.error(e.message);
                });
            } catch (e: any) {
              message.error(e.message);
            } finally {
            }
          }}
          title="Revise report"
          okText="Submit"
          className="dark:bg-gray-800 dark:text-gray-200"
          contentClassNames="overflow-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(commentDetails.current).map((comment, i) => (
              <div
                key={comment.id}
                className="revise-modal-comment-container col-span-1"
              >
                <div className="revise-modal-header">Highlighted text</div>
                <EditorProvider
                  content={comment.htmlSnippet}
                  extensions={revisionExtensions}
                  immediatelyRender={false}
                  editable={false}
                  editorProps={{
                    attributes: {
                      class:
                        "revise-modal-highlight prose prose-sm dark:prose-invert focus:outline-none *:cursor-default",
                    },
                  }}
                />
                <div className="revise-modal-header">Your comment</div>
                {/* <p
                  className="revise-modal-comment-text"
                  contentEditable
                  suppressContentEditableWarning={true}
                >
                  {comment.commentContent || (
                    <span className="italic text-gray-400">No comment</span>
                  )}
                </p> */}
                <textarea
                  className="text-sm revise-modal-comment-text w-full h-full focus:ring-0 border-none outline-none"
                  defaultValue={comment.commentContent}
                  placeholder="Type your comment here"
                  onChange={(e) => {
                    // first update the commentDetails object
                    commentDetails.current[comment.id].commentContent =
                      e.target.value;

                    // then send update to the backend
                    commentManager?.updateComments(
                      editor,
                      Object.values(commentDetails.current).map((d) => ({
                        id: d.id,
                        content: d.commentContent,
                        user: d.user,
                      }))
                    );
                  }}
                />
              </div>
            ))}
            <div className="col-span-full revise-modal-comment-container overflow-hidden">
              <div className="revise-modal-header">General comments</div>
              <TextArea
                autoResize={true}
                placeholder="Add general comments here"
                rootClassNames="border-none"
                textAreaClassNames="rounded-none ring-0"
                ref={generalCommentsRef}
                textAreaHtmlProps={{
                  resize: "none",
                }}
              ></TextArea>
            </div>
          </div>
        </Modal>
      </div>
      {!canSubmit && (
        <div className="w-96 my-4 rounded-full top-2 border dark:border-none mx-auto bg-gray-50 dark:bg-gray-600 text-sm text-gray-600 dark:text-gray-300 p-4 flex flex-row shadow-md items-center">
          <Info className="min-w-6 mr-2 text-blue-500 dark:text-blue-400" />
          <p>
            This report is currently being revised. This page will refresh when
            the revision completes.
          </p>
        </div>
      )}
    </>
  );
};
