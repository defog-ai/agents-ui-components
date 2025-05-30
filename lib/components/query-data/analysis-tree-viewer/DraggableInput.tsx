import { useRef, useEffect, forwardRef, Ref } from "react";
import { Move, ArrowRight, SquarePen } from "lucide-react";
import { TextArea } from "@ui-components";
import { twMerge } from "tailwind-merge";
import { KeyboardShortcutIndicator } from "../../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../../constants/keymap";

interface DraggableInputProps {
  searchBarClasses?: string;
  searchBarDraggable?: boolean;
  loading?: boolean;
  handleSubmit: (
    question: string,
    rootAnalysisId?: string,
    newConversation?: boolean,
    analysisId?: string
  ) => void;
  activeRootAnalysisId?: string | null;
  activeAnalysisId?: string | null;
  forceSqlOnly?: boolean;
  setSqlOnly?: (sqlOnly: boolean) => void;
  sqlOnly?: boolean;
  question?: string;
  onNewConversationTextClick?: () => void;
}

let DraggableInput = forwardRef(function DraggableInput(
  {
    searchBarClasses = "",
    searchBarDraggable = true,
    loading = false,
    handleSubmit,
    activeRootAnalysisId,
    activeAnalysisId,
    forceSqlOnly = false,
    setSqlOnly,
    sqlOnly,
    question,
    onNewConversationTextClick = () => {},
  }: DraggableInputProps,
  ref: Ref<HTMLTextAreaElement>
) {
  const searchCtr = useRef(null);
  // const ref = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (question) {
      // @ts-ignore
      ref.current.value = question;
      // @ts-ignore
      ref.current.focus();
    }
  }, [question, ref]);

  useEffect(() => {
    if (!searchBarDraggable) return;
    function setSearchBar() {
      if (!searchCtr.current) return;
      searchCtr.current.style.left = "0";
      searchCtr.current.style.right = "0";
      searchCtr.current.style.bottom =
        window.innerWidth > 1600 ? "30%" : "20px";
    }
    setSearchBar();
    window.addEventListener("resize", setSearchBar);
    return () => {
      window.removeEventListener("resize", setSearchBar);
    };
  }, [searchBarDraggable]);

  useEffect(() => {
    if (!searchBarDraggable) return;

    function handleMouseMove(e) {
      if (!isDragging.current || !searchCtr.current) return;

      const eBottom =
        window.innerHeight - e.clientY - searchCtr.current.clientHeight;
      const eLeft = e.clientX;

      const minBottom = 20;
      const maxBottom =
        window.innerHeight - 20 - searchCtr.current.clientHeight;

      if (eBottom < minBottom) {
        searchCtr.current.style.bottom = minBottom + "px";
      } else if (eBottom > maxBottom) {
        searchCtr.current.style.bottom = maxBottom + "px";
      } else {
        searchCtr.current.style.bottom = eBottom + "px";
      }

      const maxLeft = window.innerWidth - searchCtr.current.clientWidth - 20;
      const minLeft = 20;

      searchCtr.current.style.right = "auto";

      if (eLeft < minLeft) {
        searchCtr.current.style.left = minLeft + "px";
      } else if (eLeft > maxLeft) {
        searchCtr.current.style.left = maxLeft + "px";
      } else {
        searchCtr.current.style.left = eLeft + "px";
      }
    }

    function handleMouseUp() {
      isDragging.current = false;
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [searchBarDraggable]);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Only handle keys if no other element is focused
      if (document.activeElement === document.body) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
          return;
        }
        if (matchesKey(e.key, KEYMAP.FOCUS_SEARCH)) {
          e.preventDefault();
          // Focus the textarea
          if (ref && "current" in ref && ref.current) {
            ref.current.focus();
          }
        } else if (matchesKey(e.key, KEYMAP.NEW_CONVERSATION)) {
          e.preventDefault();
          onNewConversationTextClick();
          if (ref && "current" in ref && ref.current) {
            ref.current.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [ref, onNewConversationTextClick]);

  return (
    <div
      className={twMerge(
        "w-full lg:w-8/12 m-auto [&_textarea]:pl-2 bg-white dark:bg-gray-800 rounded-lg shadow-custom border border-gray-400 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-500",
        searchBarDraggable ? "fixed z-40" : "",
        searchBarClasses
      )}
      style={{
        left: "0",
        right: "0",
        bottom: searchBarDraggable
          ? window.innerWidth > 1600
            ? "30%"
            : "20px"
          : null,
      }}
      ref={searchCtr}
    >
      <div className="flex flex-row">
        {searchBarDraggable && (
          <div
            className="flex items-center w-3 min-h-full ml-1 cursor-move group"
            onMouseDown={(e) => {
              if (!searchBarDraggable) return;
              isDragging.current = true;
              e.preventDefault(); // Prevent text selection
            }}
          >
            <Move className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-primary-text dark:group-hover:text-gray-300" />
          </div>
        )}
        <div className="flex flex-row items-center rounded-md grow">
          <div className="flex flex-row grow">
            <div className="relative flex flex-row-reverse items-center grow">
              <TextArea
                rootClassNames="grow border-none bg-transparent py-1.5 text-gray-900 dark:text-gray-100 px-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 sm:leading-6 text-sm break-words focus:ring-0 focus:outline-none"
                textAreaClassNames="resize-none pr-8"
                ref={ref}
                id="main-searchbar"
                disabled={loading}
                defaultRows={1}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    ev.stopPropagation();
                    handleSubmit(
                      // @ts-ignore
                      ref.current.value,
                      activeRootAnalysisId,
                      !activeRootAnalysisId,
                      activeAnalysisId
                    );
                    // ref.current.value = "";
                  } else if (ev.key === "Escape") {
                    ev.preventDefault();
                    if (ref && "current" in ref && ref.current) {
                      ref.current.blur();
                    }
                  }
                }}
                placeholder={
                  activeRootAnalysisId
                    ? "Type your next question here"
                    : "Type your question here"
                }
              />
              <KeyboardShortcutIndicator
                keyValue={KEYMAP.FOCUS_SEARCH}
                className="absolute -translate-y-1/2 opacity-50 pointer-events-none right-3 top-1/2"
              />
              <span
                className="relative inline-block pl-2 group hover:cursor-pointer hover:bg-gray-100 hover:text-blue-600"
                onClick={() => {
                  onNewConversationTextClick();
                }}
              >
                <div className="flex items-center gap-2">
                  <SquarePen />
                  <KeyboardShortcutIndicator
                    keyValue={KEYMAP.NEW_CONVERSATION}
                    className="opacity-50"
                  />
                </div>
                <span
                  className={
                    "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  }
                >
                  Start New Thread
                </span>
              </span>
            </div>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 p-0 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-blue-500 hover:bg-blue-500 hover:text-white dark:hover:text-white"
              onClick={() => {
                handleSubmit(
                  // @ts-ignore
                  ref.current.value,
                  activeRootAnalysisId,
                  !activeRootAnalysisId,
                  activeAnalysisId
                );

                // ref.current.value = "";
              }}
            >
              <ArrowRight
                className="-ml-0.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export { DraggableInput };
