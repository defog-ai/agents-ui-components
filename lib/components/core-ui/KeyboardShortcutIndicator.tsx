import { CommandIcon, MousePointerClick } from "lucide-react";
import React from "react";

interface KeyboardShortcutIndicatorProps {
  className?: string;
  keyValue?: string | null;
  clickIcon?: boolean;
  meta?: boolean;
  text?: string | null;
}

export const KeyboardShortcutIndicator: React.FC<
  KeyboardShortcutIndicatorProps
> = ({
  className = "",
  keyValue = null,
  clickIcon = false,
  meta = false,
  text = null,
}) => {
  return (
    <div className="text-xs flex items-center font-mono gap-1">
      <kbd
        className={`px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600 ${className}`}
      >
        {meta && <CommandIcon width={10} height={10} />}
        {keyValue}
        {clickIcon && <MousePointerClick width={17} />}
      </kbd>
      {text && <span className="font-mono dark:text-gray-300">{text}</span>}
    </div>
  );
};

export default KeyboardShortcutIndicator;
