import { CircleAlert, TriangleAlert } from "lucide-react";
import React, {
  forwardRef,
  Ref,
  TextareaHTMLAttributes,
  useEffect,
  useRef,
} from "react";
import { twMerge } from "tailwind-merge";

function setHeight(el) {
  // Store original transition to restore it later
  const originalTransition = el.style.transition;
  
  // Temporarily remove transition to avoid jumpy behavior
  el.style.transition = "none";
  
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
  
  // Force a reflow to ensure the transition removal takes effect
  el.offsetHeight;
  
  // Restore original transition
  el.style.transition = originalTransition;
}

const textAreaSizeClasses = {
  default: "min-h-[36px]",
  small: "min-h-[32px] max-h-[32px]",
  medium: "min-h-[60px]",
};

const statusClasses = {
  error:
    "focus:ring-rose-400 ring-rose-400 dark:focus:ring-rose-500 dark:ring-rose-500 pr-7",
  warning:
    "focus:ring-yellow-400 ring-yellow-400 dark:focus:ring-yellow-500 dark:ring-yellow-500 pr-7",
  default: "focus:ring-blue-400 dark:focus:ring-blue-500",
};

const statusIcons = {
  error: (
    <CircleAlert
      className="w-5 h-5 text-transparent stroke-rose-400"
      aria-hidden="true"
    />
  ),
  warning: (
    <TriangleAlert
      className="w-5 h-5 text-transparent stroke-yellow-400"
      aria-hidden="true"
    />
  ),
  default: <></>,
};

interface TextAreaProps {
  value?: string;
  defaultValue?: string;
  status?: string;
  label?: string | React.ReactNode;
  disabled?: boolean;
  defaultRows?: number;
  rootClassNames?: string;
  textAreaClassNames?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textAreaHtmlProps?: object;
  autoResize?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
  size?: string;
  prefix?: string | React.ReactNode;
  suffix?: string | React.ReactNode;
}

/**
 * TextArea component
 * */
let TextArea = forwardRef(function TextArea(
  {
    value = undefined,
    defaultValue = undefined,
    status = null,
    label = null,
    disabled = false,
    defaultRows = 4,
    rootClassNames = "",
    textAreaClassNames = "",
    placeholder = "Enter text here",
    id = "",
    name = "text-input",
    onChange = (...args) => {},
    onKeyDown = (...args) => {},
    textAreaHtmlProps = {},
    autoResize = true,
    size = "default",
    suffix = "",
    prefix = "",
  }: TextAreaProps,
  ref: Ref<HTMLTextAreaElement>
) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (autoResize && rootRef?.current) {
      const textArea = rootRef.current.querySelector("textarea");
      if (!textArea) return;

      // For smoother transitions on initial render and mode changes
      if (textArea.style.transition && textArea.style.transition !== "none") {
        // If the textarea already has an explicit height, respect it during transitions
        if (textArea.style.height) {
          // Let the explicit height from the mode toggle handle the transition
          return;
        }
        
        // Handle initial mode-specific height adjustment
        // Adjust this timeout to allow CSS transitions to complete first
        setTimeout(() => {
          // Apply careful height adjustment without disrupting ongoing transitions
          const originalTransition = textArea.style.transition;
          const scrollHeight = textArea.scrollHeight;
          
          // Only adjust if needed to prevent unnecessary reflows
          if (Math.abs(parseInt(textArea.style.height || "0") - scrollHeight) > 10) {
            // Make height adjustment with gentle transition
            textArea.style.height = scrollHeight + "px";
          }
          
          // Schedule another check after transition completes
          setTimeout(() => {
            setHeight(textArea);
          }, 400); 
        }, 50);
      } else {
        setHeight(textArea);
      }
    }
  });
  return (
    <div
      className={twMerge(
        "agui-item agui-input text-gray-600 dark:text-gray-300",
        rootClassNames
      )}
      ref={rootRef}
    >
      {label && (
        <label
          htmlFor={name}
          className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="text-gray-400 text-[0.65rem] dark:text-gray-100 pb-3">
            {prefix}
          </div>
        )}
        <textarea
          data-testid={id}
          ref={ref}
          disabled={disabled}
          rows={defaultRows}
          name={name}
          id={id}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          className={twMerge(
            "focus:outline-none pl-2 block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600",
            "text-[16px] lg:text-sm leading-6",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            textAreaSizeClasses[size] || textAreaSizeClasses["default"],
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 dark:ring-gray-700 cursor-not-allowed"
              : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-inset",
            textAreaClassNames,
            // suffix ? "pb-6" : "",
            statusClasses[status] || statusClasses["default"]
          )}
          onFocus={(ev) => {
            if (autoResize) {
              setHeight(ev.target);
            }
          }}
          onChange={(ev) => {
            if (autoResize) {
              setHeight(ev.target);
            }
            onChange(ev);
          }}
          {...textAreaHtmlProps}
          {...{ defaultValue, value }}
        />
        {suffix && (
          <div className="text-gray-400 text-[0.65rem] dark:text-gray-100 pt-3">
            {suffix}
          </div>
        )}
      </div>
      {statusIcons[status] && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
          {statusIcons[status]}
        </div>
      )}
    </div>
  );
});

export { TextArea };
