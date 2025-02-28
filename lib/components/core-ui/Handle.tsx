import React, { useState } from "react";
import { twMerge } from "tailwind-merge";

type Location = "left" | "right" | "top" | "bottom";

interface HandleProps {
  location?: Location;
  handleText?: string;
  children?: React.ReactNode;
}

export const Handle: React.FC<HandleProps> = ({
  location = "left",
  handleText = "Click to open",
  children = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const containerClasses = twMerge(
    "absolute flex z-[1000]",
    location === "left" && "left-0 top-1/2 -translate-y-1/2 flex-row",
    location === "right" && "right-0 top-1/2 -translate-y-1/2 flex-row-reverse",
    location === "top" && "top-0 left-1/2 -translate-x-1/2 flex-col",
    location === "bottom" &&
      "bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse"
  );

  const handleClasses = twMerge(
    "p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300",
    "transition-all duration-200 ease-in-out shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md hover:text-gray-700 dark:hover:text-gray-200",
    "active:scale-98",
    location === "left" && "rounded-l-lg [writing-mode:vertical-rl] rotate-180",
    location === "right" && "rounded-l-lg [writing-mode:vertical-rl]",
    location === "top" && "rounded-b-lg [writing-mode:horizontal-tb]",
    location === "bottom" && "rounded-t-lg [writing-mode:horizontal-tb]"
  );

  const contentClasses = twMerge(
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 max-w-[300px] max-h-[500px] overflow-auto shadow-md",
    "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
    isOpen
      ? "opacity-100 pointer-events-auto"
      : "opacity-0 pointer-events-none",
    location === "left" && "rounded-r-lg -translate-x-2",
    location === "right" && "rounded-l-lg translate-x-2",
    location === "top" && "rounded-t-lg -translate-y-2",
    location === "bottom" && "rounded-b-lg translate-y-2",
    isOpen && (location === "left" || location === "right") && "translate-x-0",
    isOpen && (location === "top" || location === "bottom") && "translate-y-0"
  );

  const emptyStateClasses =
    "p-6 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 text-sm text-center min-w-[200px] flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600";

  return (
    <div className={containerClasses}>
      <button
        className={handleClasses}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {handleText}
      </button>
      <div className={contentClasses}>
        {children || (
          <div className={emptyStateClasses}>No content available</div>
        )}
      </div>
    </div>
  );
};

export default Handle;
