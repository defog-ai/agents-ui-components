import { CircleX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";

/**
 * A modal component.
 */
interface ModalProps {
  /**
   * The content of the modal.
   */
  children?: React.ReactNode;
  /**
   * If true, the modal will be open.
   */
  open?: boolean;
  /**
   * Function to be called when the modal is closed.
   */
  onCancel?: () => void;
  /**
   * If true, the modal will have a footer.
   */
  footer?: boolean;
  /**
   * The title of the modal.
   */
  title?: React.ReactNode;
  /**
   * The description of the modal.
   */
  description?: React.ReactNode;
  /**
  /**
   * The close icon of the modal.
   */
  closeIcon?: React.ReactNode;
  /**
   * Function to be called when the ok button is clicked.
   */
  onOk?: () => void;
  /**
   * The variant of the ok button. Can be "primary" or "secondary".
   */
  okVariant?: "primary" | "secondary" | "danger";
  /**
   * If true, the ok button will be loading.
   */
  okLoading?: boolean;
  /**
   * The text of the ok button.
   */
  okText?: string;
  /**
   * Show modal backdrop.
   */
  showBackdrop?: boolean;
  /**
   * Additional classes to be added to the root div.
   */
  rootClassNames?: string;
  /**
   * Additional classes to be added to the modal.
   */
  className?: string;
  /**
   * Additional classes to be added to the content div.
   */
  contentClassNames?: string;
}

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
  okVariant = "secondary",
  rootClassNames = "",
  contentClassNames = "",
  showBackdrop = true,
}: ModalProps) {
  let [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  // If modal is not open, return null
  if (!isOpen) return null;

  return (
    <div
      className={twMerge(
        "fixed inset-0 z-[1000] flex items-center justify-center p-4",
        rootClassNames
      )}
      onClick={() => {
        setIsOpen(false);
        onCancel();
      }}
    >
      {showBackdrop && (
        <div className="bg-black opacity-40 absolute inset-0 w-full h-full left-0 top-0 pointer-events-none" />
      )}
      <div
        className={twMerge(
          "agui-item agui-modal bg-gray-100 border border-gray-200 w-full max-w-2xl max-h-full rounded-md relative p-4 m-auto gap-2 flex flex-col shadow-lg",
          contentClassNames
        )}
        onClick={(e) => e.stopPropagation()}
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
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </div>
        )}
        {description && (
          <div className="text-gray-600 dark:text-gray-300">{description}</div>
        )}

        {children}

        {footer === true ? (
          <div>
            <Button
              disabled={okLoading}
              onClick={() => {
                onOk();
              }}
              variant={okVariant || "secondary"}
            >
              {okText}
            </Button>
          </div>
        ) : (
          footer
        )}
      </div>
    </div>
  );
}
