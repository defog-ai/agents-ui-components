// sidebar that can be toggled open and closed
import { LogOut } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface SidebarProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  rootClassNames?: string;
  contentClassNames?: string;
  openClassNames?: string;
  closedClassNames?: string;
  iconClassNames?: string;
  iconSize?: number;
  location?: string;
  open?: boolean;
  beforeTitle?: React.ReactNode;
  disableClose?: boolean;
  onChange?: (isOpen: boolean) => void;
}

/**
 * Sidebar component that can be toggled open and closed.
 */

export function Sidebar({
  title = "Menu",
  children = null,
  rootClassNames = "",
  contentClassNames = "",
  openClassNames = "",
  closedClassNames = "",
  iconClassNames = "",
  iconSize = 4,
  location = "left",
  open = null,
  disableClose = false,
  beforeTitle = null,
  onChange = (...args) => {},
}: SidebarProps) {
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

  const defaultIconClasses = `toggle-button absolute top-1 rounded-tr-md rounded-br-md bg-inherit p-2 pl-1 self-start z-10 transition-all cursor-pointer text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 ${sidebarOpen ? "right-1" : "-right-7 border border-gray-200 dark:border-gray-700 border-l-0"}`;

  return (
    <div
      className={twMerge(
        "sidebar relative flex flex-row border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
        rootClassNames,
        sidebarOpen ? openClassNames : closedClassNames
      )}
    >
      <div
        ref={contentContainerRef}
        className="transition-all grow overflow-y-hidden"
      >
        <div
          className={twMerge(
            "w-80 block text-gray-900 dark:text-gray-100",
            contentClassNames
          )}
          ref={contentRef}
        >
          {beforeTitle || <></>}
          {title ? (
            <div className="mb-3 font-sans text-gray-900 dark:text-gray-100">
              {title}
            </div>
          ) : (
            <></>
          )}
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
              <LogOut className={`h-${iconSize} w-${iconSize} rotate-180`} />
            ) : (
              <LogOut className={`h-${iconSize} w-${iconSize}`} />
            )
          ) : sidebarOpen ? (
            <LogOut className={`h-${iconSize} w-${iconSize}`} />
          ) : (
            <LogOut className={`h-${iconSize} w-${iconSize} rotate-180`} />
          )}
        </button>
      )}
    </div>
  );
}
