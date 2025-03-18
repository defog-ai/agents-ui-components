import {
  Popover as HeadlessPopover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from "react";

export function Popover({ content, children, open }) {
  const [isOpen, setIsOpen] = useState(false);

  // Update internal state when open prop changes
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  return (
    <HeadlessPopover className="relative" as="div">
      <PopoverButton as="div" className="cursor-pointer">
        {children}
      </PopoverButton>

      {(open !== undefined ? open : isOpen) && (
        <PopoverPanel
          static
          className={twMerge(
            "absolute z-40 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          )}
        >
          {content}
        </PopoverPanel>
      )}
    </HeadlessPopover>
  );
}
