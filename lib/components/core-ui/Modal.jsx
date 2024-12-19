import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { CircleX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";

/**
 * A modal component.
 * @typedef {Object} ModalProps
 * @property {React.ReactNode} [children] - The content of the modal.
 * @property {boolean} [open] - If true, the modal will be open.
 * @property {function} [onCancel] - Function to be called when the modal is closed.
 * @property {boolean} [footer] - If true, the modal will have a footer.
 * @property {React.ReactNode} [title] - The title of the modal.
 * @property {React.ReactNode} [closeIcon] - The close icon of the modal.
 * @property {function} [onOk] - Function to be called when the ok button is clicked.
 * @property {boolean} [okLoading] - If true, the ok button will be loading.
 * @property {string} [okText] - The text of the ok button.
 * @property {boolean} [maskClosable] - NOT IMPLEMENTED YET. If true, the modal will be closed when the mask is clicked.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [className] - Additional classes to be added to the modal.
 * @property {string} [contentClassNames] - Additional classes to be added to the content div.
 */

/**
 * Modal component
 * @param {ModalProps} props
 */
export function Modal({
  children = null,
  open = false,
  onCancel = () => {},
  footer = true,
  title = null,
  description = null,
  closeIcon = <CircleX className="w-6 h-6 text-gray-300 hover:text-gray-600" />,
  onOk = () => {},
  okLoading = false,
  okText = "Ok",
  rootClassNames = "",
  contentClassNames = "",
}) {
  let [isOpen, setIsOpen] = useState(open ? true : false);

  useEffect(() => {
    setIsOpen(open ? true : false);
  }, [open]);

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        onCancel();
      }}
      className={twMerge("relative z-[2]", rootClassNames)}
    >
      <div className="fixed inset-0 overflow-y-auto w-full h-full p-4 bg-black bg-opacity-30">
        <DialogPanel
          className={twMerge(
            "agui-item agui-modal bg-white dark:bg-gray-800 w-full max-h-full rounded-md relative p-4 m-auto gap-2 flex flex-col",
            contentClassNames
          )}
        >
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => {
                setIsOpen(false);
                onCancel();
              }}
              className="p-1"
            >
              {closeIcon}
            </button>
          </div>

          {title && (
            <DialogTitle
              className={"text-xl font-bold text-gray-900 dark:text-gray-100"}
            >
              {title}
            </DialogTitle>
          )}
          {description && (
            <Description className="text-gray-600 dark:text-gray-300">
              {description}
            </Description>
          )}

          <div className="overflow-auto">{children}</div>

          {footer === true ? (
            <div>
              <Button
                disabled={okLoading}
                onClick={() => {
                  onOk();
                }}
              >
                {okText}
              </Button>
            </div>
          ) : (
            footer
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
