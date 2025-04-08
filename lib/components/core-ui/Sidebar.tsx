// sidebar that can be toggled open and closed
import { LogOut } from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { ResizableHandle } from "./ResizableHandle";

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
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
}

/**
 * Sidebar component that can be toggled open and closed.
 */

const LOCAL_STORAGE_WIDTH_KEY = 'oracle-sidebar-width';

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
  resizable = false,
  minWidth = 200,
  maxWidth = 500,
  defaultWidth = 288, // w-72 default width
  onWidthChange = () => {},
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(disableClose ? true : open);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (resizable) {
      // Try to get from localStorage
      const savedWidth = localStorage.getItem(LOCAL_STORAGE_WIDTH_KEY);
      return savedWidth ? parseInt(savedWidth) : defaultWidth;
    }
    return defaultWidth;
  });
  
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

  const handleResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
    onWidthChange(newWidth);
    
    // Save to localStorage
    localStorage.setItem(LOCAL_STORAGE_WIDTH_KEY, newWidth.toString());
  }, [onWidthChange]);

  useEffect(() => {
    setSidebarOpen(open);
  }, [open]);

  useEffect(() => {
    if (!contentContainerRef.current || !contentRef.current) return;

    if (sidebarOpen) {
      contentContainerRef.current.style.width = resizable 
        ? `${sidebarWidth}px` 
        : `${contentRef.current.clientWidth}px`;
    } else {
      contentContainerRef.current.style.width = `0px`;
    }
  }, [sidebarOpen, sidebarWidth, resizable]);

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
        style={resizable && sidebarOpen ? { width: `${sidebarWidth}px` } : {}}
      >
        <div
          className={twMerge(
            "block text-gray-900 dark:text-gray-100",
            resizable ? "" : "w-80",
            contentClassNames
          )}
          ref={contentRef}
          style={resizable ? { width: '100%' } : {}}
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
      
      {/* Resizable handle */}
      {resizable && sidebarOpen && (
        <ResizableHandle 
          onResize={handleResize} 
          minWidth={minWidth}
          maxWidth={maxWidth}
        />
      )}
      
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
