import { MultiSelect, SingleSelect, TextArea } from "@ui-components";
import { X } from "lucide-react";
import { useMemo } from "react";

export interface ClarificationObject {
  clarification: string;
  options: string[];
  input_type: "single_choice" | "multiple_choice" | "text";
  is_answered?: boolean;
  answer?: string | string[];
  onAnswerChange?: (answer: string | string[]) => void;
  onDismiss?: () => void;
}

export const ClarificationItem = ({
  clarification,
  options,
  input_type,
  onAnswerChange,
  onDismiss,
}: ClarificationObject) => {
  const component = useMemo(() => {
    switch (input_type) {
      case "single_choice":
        return (
          <SingleSelect
            label={clarification}
            options={options.map((d) => ({ label: d, value: d }))}
            onChange={onAnswerChange}
          />
        );
      case "multiple_choice":
        return (
          <MultiSelect
            label={clarification}
            options={options.map((d) => ({ label: d, value: d }))}
            // @ts-ignore
            onChange={onAnswerChange}
          />
        );
      default:
        return (
          <TextArea
            label={clarification}
            onChange={(e) => onAnswerChange(e.target.value)}
          />
        );
    }
  }, []);

  return (
    <div className="relative">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute -right-2 -top-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      {component}
    </div>
  );
};
