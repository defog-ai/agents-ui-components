import React, { forwardRef, Ref } from "react";
import { twMerge } from "tailwind-merge";

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  placement?: "top" | "right" | "bottom" | "left";
  width?: string | number;
  height?: string | number;
  title?: React.ReactNode;
  children?: React.ReactNode;
  rootClassNames?: string;
}

const Drawer = forwardRef(
  (
    {
      visible,
      onClose,
      placement = "right",
      rootClassNames = "",
      width = 256,
      height = 256,
      title,
      children,
    }: DrawerProps,
    ref: Ref<HTMLDivElement> = null
  ) => {
    return (
      <>
        {visible && (
          <div
            className={twMerge(
              "fixed inset-0 bg-black/40 dark:bg-black/60 z-40",
              rootClassNames
            )}
            onClick={onClose}
          />
        )}
        <div
          className={
            `fixed bg-white dark:bg-gray-800 z-50 transition-transform duration-300 ` +
            (placement === "right"
              ? `top-0 right-0 h-full ${visible ? "translate-x-0" : "translate-x-full"}`
              : placement === "left"
                ? `top-0 left-0 h-full ${visible ? "translate-x-0" : "-translate-x-full"}`
                : placement === "top"
                  ? `top-0 left-0 w-full ${visible ? "translate-y-0" : "-translate-y-full"}`
                  : /* bottom */ `bottom-0 left-0 w-full ${visible ? "translate-y-0" : "translate-y-full"}`)
          }
          style={{
            width:
              placement === "left" || placement === "right" ? width : "100%",
            height:
              placement === "top" || placement === "bottom" ? height : "100%",
          }}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {title && (
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {title}
              </div>
            )}
            <button
              className="bg-transparent border-none text-2xl cursor-pointer leading-none text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div
            className="p-4 h-[calc(100%-65px)] overflow-y-auto text-gray-900 dark:text-gray-100"
            ref={ref}
          >
            {children}
          </div>
        </div>
      </>
    );
  }
);

export { Drawer };
