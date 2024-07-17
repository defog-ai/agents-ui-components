import { useEffect, useRef, useState } from "react";
import { TextArea, Toggle } from "../../ui-components/lib/main";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";
import { useGhostImage } from "../utils/utils";

export function AgentSearchBar({
  disabled = false,
  handleSubmit = (...args) => {},
  placeholder = null,
  searchBarClasses = "",
  searchBarDraggable = false,
  onSqlOnlyToggle = (...args) => {},
  clearOnEnter = true,
}) {
  const searchRef = useRef(null);
  const searchCtr = useRef(null);
  const [sqlOnly, setSqlOnly] = useState(false);
  const ghostImage = useGhostImage();

  useEffect(() => {
    if (!searchBarDraggable) return;
    function setSearchBar() {
      if (!searchCtr.current) return;

      searchCtr.current.style.left = "0";
      searchCtr.current.style.right = "0";
      searchCtr.current.style.bottom =
        window.innerHeight > 800 ? "30%" : "20px";
    }

    setSearchBar();

    window.addEventListener("resize", setSearchBar);

    return () => {
      window.removeEventListener("resize", setSearchBar);
    };
  }, [searchBarDraggable]);

  return (
    <div
      className={twMerge(
        "w-full lg:w-8/12 m-auto fixed z-10 bg-white rounded-lg shadow-custom border border-gray-400 hover:border-blue-500 focus:border-blue-500 flex flex-row",
        searchBarClasses
      )}
      style={{
        left: "0",
        right: "0",
        bottom: searchBarDraggable
          ? window.innerHeight > 800
            ? "30%"
            : "20px"
          : null,
      }}
      ref={searchCtr}
    >
      {searchBarDraggable && (
        <div
          className="cursor-move min-h-full w-3 flex items-center ml-1 group"
          draggable={searchBarDraggable}
          onDragStart={(e) => {
            if (!searchBarDraggable) return;
            e.dataTransfer.setDragImage(ghostImage, 0, 0);
          }}
          onDrag={(e) => {
            if (!searchBarDraggable) return;
            if (!e.clientX || !e.clientY || !searchCtr.current) return;

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

            const maxLeft =
              window.innerWidth - searchCtr.current.clientWidth - 20;

            const minLeft = 20;

            searchCtr.current.style.right = "auto";

            if (eLeft < minLeft) {
              searchCtr.current.style.left = minLeft + "px";
            } else if (eLeft > maxLeft) {
              searchCtr.current.style.left = maxLeft + "px";
            } else {
              searchCtr.current.style.left = eLeft + "px";
            }
          }}
        >
          <ArrowsPointingOutIcon className="h-3 w-3 text-gray-400 group-hover:text-primary-text" />
        </div>
      )}
      <div className="grow rounded-md lg:items-center flex flex-col-reverse lg:flex-row">
        <div className="flex flex-row grow">
          <div className="flex lg:flex-row-reverse lg:items-center flex-col grow">
            <TextArea
              rootClassNames="grow border-none bg-transparent py-1.5 text-gray-900 px-2 placeholder:text-gray-400 sm:leading-6 text-sm break-all focus:ring-0 focus:outline-none"
              textAreaClassNames="resize-none"
              ref={searchRef}
              disabled={disabled}
              defaultRows={1}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  ev.stopPropagation();
                  handleSubmit(searchRef.current.value, sqlOnly);
                  if (clearOnEnter) {
                    searchRef.current.value = "";
                  }
                }
              }}
              placeholder={placeholder}
            />
            <Toggle
              disabled={disabled}
              titleClassNames="font-bold text-gray-400"
              // if true, means advanced, means sql only off
              onToggle={(v) => {
                setSqlOnly(!v);
                onSqlOnlyToggle(!v);
              }}
              defaultOn={sqlOnly}
              offLabel="Advanced"
              onLabel={"Advanced"}
              rootClassNames="items-start lg:border-r py-2 lg:py-0 px-2 w-32"
            />
          </div>
          <button
            type="button"
            className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 p-0 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-blue-500 hover:bg-blue-500 hover:text-white"
            onClick={() => {
              handleSubmit(searchRef.current.value, sqlOnly);
            }}
          >
            <ArrowRightEndOnRectangleIcon
              className="-ml-0.5 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
