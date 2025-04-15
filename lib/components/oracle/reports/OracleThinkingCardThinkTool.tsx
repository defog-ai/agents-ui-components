import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface ThinkingStepThinkTool {
  id: string;
  function_name: string;
  inputs: {
    thought: string;
  };
  result: string;
}

export default function OracleThinkingCard({
  step,
}: {
  step: ThinkingStepThinkTool;
}) {
  const { function_name, inputs } = step;

  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-dark-text-primary">
        Function: <span className="font-normal">{function_name}</span>
      </h2>

      <div
        className="prose dark:prose-invert prose-sm max-w-none py-1"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(marked.parse(inputs.thought)),
        }}
      ></div>
    </div>
  );
}
