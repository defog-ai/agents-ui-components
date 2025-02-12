import {
  Popover as HeadlessPopover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { twMerge } from "tailwind-merge";

export function Popover({ content, children }) {
  return (
    <HeadlessPopover className="relative" as="div">
      <PopoverButton as="div" className="cursor-pointer">
        {children}
      </PopoverButton>

      <PopoverPanel
        modal
        className={twMerge("absolute z-40 p-2 border rounded-md bg-white")}
      >
        {content}
      </PopoverPanel>
    </HeadlessPopover>
  );
}
