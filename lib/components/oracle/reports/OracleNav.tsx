import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Download, FileText, Info, MessageSquare, Mic } from "lucide-react";
import { Button, MessageManagerContext, Modal, TextArea } from "@ui-components";
import { OracleReportContext } from "../utils/OracleReportContext";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import {
  revisionExtensions,
  submitForRevision,
  exportAsMarkdown,
  exportAsPdf,
  exportAsPodcast,
} from "../utils";
import { OracleCommentsSidebar } from "./tiptap-extensions/comments/OracleCommentsSidebar";

export const OracleNav = ({
  onDelete = () => {},
}: {
  onDelete: (reportId: string, projectName: string) => void;
}) => {
  const [reviseModalOpen, setReviseModalOpen] = useState<boolean>(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState<boolean>(false);

  const message = useContext(MessageManagerContext);
  const { apiEndpoint, reportId, projectName, token, commentManager, isLoading, setIsLoading } =
    useContext(OracleReportContext);

  const generalCommentsRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const comments = useSyncExternalStore(
    commentManager?.subscribeToCommentUpdates || (() => () => {}),
    commentManager?.getComments || (() => [])
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

  useEffect(() => {
    if (comments && comments.length > 0) {
      const newCommentDetails: any = {};
      comments.forEach((comment) => {
        newCommentDetails[comment.id] = {
          id: comment.id,
          commentContent: comment.content,
          user: comment.user,
          // Add other necessary fields with default values
          htmlSnippet: "",
          commentRelevantText: comment.content,
        };
      });
      commentDetails.current = newCommentDetails;
    }
  }, [comments]);

  const isBeingRevised = status?.startsWith("Revision in progress");

  const processComments = () => {
    commentDetails.current = {};

    const doc = editor?.state.doc;
    if (!doc) return;

    // Find all nodes with comment marks and process them
    doc.nodesBetween(0, doc.content.size, (node, pos, parent) => {
      // @ts-ignore
      for (const mark of node.marks) {
        if (mark.type.name === "comment") {
          const endPos = pos + node.textContent.length;

          const commentId = mark.attrs.commentId;
          const comment = comments.find((comment) => comment.id === commentId);

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
            commentDetails.current[commentId].topParentPos = topParentPos;

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

    // Extract the relevant text and comment text
    Object.values(commentDetails.current).forEach((commentDetail) => {
      let parentMarkdown = "";

      // if the top parent is a simple text node, it is most likely the recommendation title
      if (commentDetail.topParent.type.name === "text") {
        parentMarkdown =
          "<span class='oracle-report-comment' data-comment-id='temp'>" +
          commentDetail.topParent.textContent +
          "</span>";
      } else if (commentDetail.topParent.type.name === "recommendationTitle") {
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
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (!editor) return null;

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Function to handle exporting as Markdown
  const handleExportMarkdown = () => {
    if (editor) {
      const mdxContent = editor.storage.markdown.getMarkdown();
      const fileName = `report-${reportId}.md`;
      exportAsMarkdown(mdxContent, fileName);
      setExportDropdownOpen(false);
    }
  };

  // Function to handle exporting as PDF
  const handleExportPdf = () => {
    if (editor) {
      const mdxContent = editor.storage.markdown.getMarkdown();
      const fileName = `report-${reportId}.pdf`;
      exportAsPdf(mdxContent, fileName);
      setExportDropdownOpen(false);
    }
  };

  // Function to handle exporting as Podcast
  const handleExportPodcast = () => {
    if (editor) {
      try {
        const mdxContent = editor.storage.markdown.getMarkdown();
        setExportDropdownOpen(false);
        exportAsPodcast(
          mdxContent, 
          reportId, 
          apiEndpoint, 
          projectName, 
          token,
          setIsLoading
        ).catch(error => {
          message.error("Failed to export podcast. Please try again.");
          console.error(error);
        });
      } catch (error) {
        message.error("Failed to export podcast. Please try again.");
        console.error(error);
      }
    }
  };

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 flex flex-col items-center shadow-lg">
            <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
            <p className="text-gray-800 dark:text-gray-200 font-medium">
              Generating podcast transcript...
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              This may take a minute, please wait.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700">
        <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
          Delete
        </Button>

        <div className="relative flex gap-2">
          {/* Comments button */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => {
                processComments();
                setShowCommentsSidebar(!showCommentsSidebar);
              }}
              className={
                showCommentsSidebar ? "bg-gray-100 dark:bg-gray-700" : ""
              }
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
            {comments.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {comments.length}
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <Button
              variant="secondary"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className={
                exportDropdownOpen ? "bg-gray-100 dark:bg-gray-700" : ""
              }
            >
              <Download className="w-5 h-5" />
            </Button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border dark:border-gray-700">
                <div className="py-1">
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Markdown
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </button>
                  <button
                    onClick={handleExportPodcast}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Export as Podcast
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Modal
          open={deleteModalOpen}
          onOk={() => {
            onDelete(reportId, projectName);
            setDeleteModalOpen(false);
          }}
          onCancel={() => setDeleteModalOpen(false)}
          okText="Yes"
          okVariant="danger"
        >
          Are you sure?
        </Modal>
      </div>

      {isBeingRevised && (
        <div className="w-96 my-4 rounded-full border dark:border-none mx-auto bg-gray-50 dark:bg-gray-600 text-sm text-gray-600 dark:text-gray-300 p-4 flex flex-row shadow-md items-center">
          <Info className="min-w-6 mr-2 text-blue-500 dark:text-blue-400" />
          <p>
            This report is currently being revised. This page will refresh when
            the revision completes.
          </p>
        </div>
      )}

      {showCommentsSidebar && (
        <div className="fixed right-0 top-0 bottom-0 z-[100]">
          <OracleCommentsSidebar
            onClose={() => setShowCommentsSidebar(false)}
          />
        </div>
      )}

      {status && (
        <div
          className={`fixed bottom-6 ${showCommentsSidebar ? "right-72" : "right-6"} z-[110] transition-all duration-200`}
        >
          <Button
            variant="primary"
            onClick={() => {
              processComments();
              setReviseModalOpen(true);
            }}
            disabled={!status || isBeingRevised}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            Submit for revision
          </Button>
        </div>
      )}

      <Modal
        rootClassNames="w-full z-10"
        open={reviseModalOpen}
        onCancel={() => setReviseModalOpen(false)}
        onOk={() => {
          try {
            // Clear existing polling before submission
            // stopPolling();

            submitForRevision(
              apiEndpoint,
              reportId,
              projectName,
              token,
              generalCommentsRef.current?.value,
              comments.map((comment) => ({
                relevant_text: comment.content,
                comment_text: comment.content,
              }))
            )
              .then((res) => {
                // set status to being revised
                // updateStatus("Revision in progress");
                setReviseModalOpen(false);
                // Start polling again after getting server response
                // startPolling();
              })
              .catch((e) => {
                console.error(e);
                message.error(e.message);
              });
          } catch (e: any) {
            message.error(e.message);
          }
        }}
        title="Revise report"
        okText="Submit"
        className="dark:bg-gray-800 dark:text-gray-200"
        contentClassNames="overflow-auto"
      >
        <div className="flex flex-row flex-wrap gap-4">
          {Object.values(commentDetails.current).map((comment, i) => (
            <div
              key={comment.id}
              className="revise-modal-comment-container w-full"
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
          <div className="w-full revise-modal-comment-container overflow-hidden">
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
  );
};
