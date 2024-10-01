// sidebar that can be toggled open and closed
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

/**
 * @typedef {Object} props
 * @property {React.ReactNode} [title="Menu"] - The title of the sidebar.
 * @property {React.ReactNode} children - The content of the sidebar.
 * @property {string} [rootClassNames=""] - Additional classes to be added to the root div.
 * @property {string} [contentClassNames=""] - Additional classes to be added to the content div.
 * @property {string} [openClassNames=""] - Additional classes to be added to the root div when the sidebar is open.
 * @property {string} [closedClassNames=""] - Additional classes to be added to the root div when the sidebar is closed.
 * @property {string} [iconClassNames=""] - Additional classes to be added to the icon button.
 * @property {number} [iconSize=4] - The size of the icon button. Only works for tailwind's sizing classes.
 * @property {string} [location="left"] - The location of the sidebar.
 * @property {boolean} [open=null] - If true, the sidebar will be open.
 * @property {boolean} [disableClose=false] - If true, the sidebar will not be able to be closed.
 * @property {function} [onChange=() => {}] - Function to be called when the sidebar is toggled.
 */

/**
 * Sidebar component that can be toggled open and closed.
 * @param {props} props
 */

export function Sidebar({
  title = "Menu",
  children,
  rootClassNames = "",
  contentClassNames = "",
  openClassNames = "",
  closedClassNames = "",
  iconClassNames = "",
  iconSize = 4,
  location = "left",
  open = null,
  disableClose = false,
  onChange = (...args) => {},
}) {
  const [sidebarOpen, setSidebarOpen] = useState(disableClose ? true : open);
  const contentRef = useRef(null);
  const contentContainerRef = useRef(null);

  const handleClick = () => {
    if (disableClose) {
      if (!sidebarOpen) setSidebarOpen(true);
      return;
    }

    if (!contentContainerRef.current || !contentRef.current) return;
    // if opening, set container width to children width
    setSidebarOpen((prev) => !prev);
    onChange(!sidebarOpen);
  };

  useEffect(() => {
    setSidebarOpen(open);
  }, [open]);

  useEffect(() => {
    if (!contentContainerRef.current || !contentRef.current) return;

    if (sidebarOpen) {
      contentContainerRef.current.style.width = `${contentRef.current.clientWidth}px`;
    } else {
      contentContainerRef.current.style.width = `0px`;
    }
  }, [sidebarOpen]);

  const defaultIconClasses = `toggle-button absolute top-1 rounded-tr-md rounded-br-md bg-inherit p-2 pl-1  self-start z-10 transition-all cursor-pointer ${sidebarOpen ? "right-1" : "-right-7 border border-inherit border-l-0"}`;

  return (
    <div
      className={twMerge(
        "sidebar relative flex flex-row border-r",
        rootClassNames,
        sidebarOpen ? openClassNames : closedClassNames
      )}
    >
      <div
        ref={contentContainerRef}
        className="transition-all overflow-hidden grow"
      >
        <div
          className={twMerge("w-80 block", contentClassNames)}
          ref={contentRef}
        >
          {title ? <h2 className="mb-3 font-sans">{title}</h2> : <></>}
          {children}
        </div>
      </div>
      {!disableClose && (
        <button
          className={twMerge(defaultIconClasses, iconClassNames)}
          onClick={() => handleClick()}
        >
          {location === "left" ? (
            sidebarOpen ? (
              <ArrowLeftStartOnRectangleIcon
                className={`h-${iconSize} w-${iconSize}`}
              />
            ) : (
              <ArrowRightStartOnRectangleIcon
                className={`h-${iconSize} w-${iconSize}`}
              />
            )
          ) : sidebarOpen ? (
            <ArrowRightStartOnRectangleIcon
              className={`h-${iconSize} w-${iconSize}`}
            />
          ) : (
            <ArrowLeftStartOnRectangleIcon
              className={`h-${iconSize} w-${iconSize}`}
            />
          )}
        </button>
      )}
    </div>
  );
}
