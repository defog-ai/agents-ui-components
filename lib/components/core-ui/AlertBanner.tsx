import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

interface AlertBannerProps {
  type?: "success" | "warning" | "error" | "info";
  message: string;
  className?: string;
  dismissable?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  autoDismissDelay?: number; // in milliseconds, if provided will auto-dismiss after this time
}

export function AlertBanner({
  type = "info",
  message,
  className = "",
  dismissable = true,
  onDismiss,
  icon,
  autoDismissDelay,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  // Set up auto-dismiss if delay is provided
  useEffect(() => {
    if (autoDismissDelay && autoDismissDelay > 0) {
      const timer = setTimeout(() => {
        setDismissed(true);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismissDelay, onDismiss]);

  if (dismissed) {
    return null;
  }

  const typeStyles = {
    success: "bg-green-100 border-green-500 text-green-800 dark:bg-green-800/30 dark:border-green-500 dark:text-green-200",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-800/30 dark:border-yellow-500 dark:text-yellow-200",
    error: "bg-red-100 border-red-500 text-red-800 dark:bg-red-800/30 dark:border-red-500 dark:text-red-200",
    info: "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-800/30 dark:border-blue-500 dark:text-blue-200",
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={twMerge(
        "agui-alert-banner flex items-center justify-between p-3 border-l-4 rounded-md",
        typeStyles[type],
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {icon && <span className="alert-icon">{icon}</span>}
        <span>{message}</span>
      </div>
      {dismissable && (
        <button
          onClick={handleDismiss}
          className="ml-auto text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}