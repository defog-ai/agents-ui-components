import { MultiSelect, SingleSelect, TextArea } from "@ui-components";
import { useMemo } from "react";

export interface ClarificationObject {
  clarification: string;
  options: string[];
  input_type: "single_choice" | "multiple_choice" | "text";
  is_answered?: boolean;
  answer?: string | string[];
  onAnswerChange?: (answer: string | string[]) => void;
}

export const ClarificationItem = ({
  clarification,
  options,
  input_type,
  onAnswerChange,
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

  return component;
};
