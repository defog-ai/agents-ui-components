import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";
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
  closeIcon = (
    <XCircleIcon className="w-6 h-6 text-gray-300 hover:text-gray-600" />
  ),
  onOk = () => {},
  okLoading = false,
  okText = "Ok",
  maskClosable = true,
  rootClassNames = "",
  className = "",
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
      className={twMerge("relative z-50", rootClassNames, className)}
    >
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 animate-fade-in transition duration-300 ease-out data-[closed]:opacity-0">
        <div className="absolute w-full h-full bg-gray-800 opacity-50 left-0 top-0 z-[1]"></div>
        <DialogPanel className="h-[95%] w-10/12 space-y-4 z-[2] relative flex flex-row items-center pointer-events-none">
          <div
            className={twMerge(
              "relative max-h-full overflow-auto p-4 bg-white rounded-md grow pointer-events-auto ",
              contentClassNames
            )}
          >
            <div className="absolute top-2 right-2 z-[3]">
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

            {title && <DialogTitle>{title}</DialogTitle>}

            {children}

            {footer === true ? (
              <Button
                disabled={okLoading}
                onClick={() => {
                  onOk();
                }}
              >
                {okText}
              </Button>
            ) : (
              footer
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
