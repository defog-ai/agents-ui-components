import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface ThinkingStepPDF {
  id: string;
  function_name: string;
  inputs: {
    question: string;
    [key: string]: any;
  };
  result: {
    text: string;
    type: string;
    citations?: {
      cited_text: string;
      document_title: string;
      end_page_number: number;
      start_page_number: number;
      type: string;
    }[];
  }[];
}

export default function OracleThinkingCard({
  step,
}: {
  step: ThinkingStepPDF;
}) {
  const { function_name, result } = step;
  const text = result.map((item) => item.text).join("");

  // Convert markdown to HTML and sanitize it
  const sanitizedHtml = sanitizeHtml(marked.parse(text), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
    },
  });

  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-dark-text-primary">
        Function: <span className="font-normal">{function_name}</span>
      </h2>
      {/* Render the sanitized HTML */}
      <div
        className="text-gray-700 dark:text-dark-text-secondary prose dark:prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
