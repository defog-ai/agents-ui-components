import { useRef, useEffect } from "react";
import {
  ArrowsPointingOutIcon,
  ArrowRightEndOnRectangleIcon,
} from "@heroicons/react/20/solid";
import { TextArea, Toggle } from "@ui-components";
import { twMerge } from "tailwind-merge";

export function DraggableInput({
  searchBarClasses = "",
  searchBarDraggable = true,
  loading = false,
  handleSubmit,
  activeRootAnalysisId,
  activeAnalysisId,
  showToggle = true,
  forceSqlOnly = false,
  setSqlOnly,
  sqlOnly,
  question,
  onNewConversationTextClick = () => {},
}) {
  const searchCtr = useRef(null);
  const searchRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (question) {
      searchRef.current.value = question;
    }
  }, [question]);

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
            <ArrowsPointingOutIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-primary-text dark:group-hover:text-gray-300" />
          </div>
        )}
        <div className="flex flex-col-reverse rounded-md grow lg:items-center lg:flex-row">
          <div className="flex flex-row grow">
            <div className="flex flex-col lg:flex-row-reverse lg:items-center grow">
              <TextArea
                rootClassNames="grow border-none bg-transparent py-1.5 text-gray-900 dark:text-gray-100 px-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 sm:leading-6 text-sm break-all focus:ring-0 focus:outline-none"
                textAreaClassNames="resize-none"
                ref={searchRef}
                id="main-searchbar"
                disabled={loading}
                defaultRows={1}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    ev.stopPropagation();
                    handleSubmit(
                      searchRef.current.value,
                      activeRootAnalysisId,
                      !activeRootAnalysisId,
                      activeAnalysisId
                    );
                    searchRef.current.value = "";
                  }
                }}
                placeholder={
                  activeRootAnalysisId
                    ? "Type your next question here"
                    : "Type your question here"
                }
              />
              {showToggle && (
                <Toggle
                  disabled={forceSqlOnly || loading}
                  titleClassNames="font-bold text-gray-400 dark:text-gray-500"
                  onToggle={(v) => {
                    if (forceSqlOnly) return;
                    setSqlOnly(!v);
                  }}
                  defaultOn={!sqlOnly}
                  offLabel="Advanced"
                  onLabel={"Advanced"}
                  rootClassNames="items-start lg:border-r dark:border-gray-600 py-2 lg:py-0 px-2 w-32"
                />
              )}
            </div>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 p-0 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-blue-500 hover:bg-blue-500 hover:text-white dark:hover:text-white"
              onClick={() => {
                handleSubmit(
                  searchRef.current.value,
                  activeRootAnalysisId,
                  !activeRootAnalysisId,
                  activeAnalysisId
                );

                searchRef.current.value = "";
              }}
            >
              <ArrowRightEndOnRectangleIcon
                className="-ml-0.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              Ask
            </button>
          </div>
        </div>
      </div>
      <div
        className="w-full text-xs p-1 px-2 pt-0 text-gray-400 dark:text-gray-500 hover:underline underline-offset-2 group hover:decoration-blue-500 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400"
        onClick={onNewConversationTextClick}
      >
        Or click here to start a new conversation instead
      </div>
    </div>
  );
}
