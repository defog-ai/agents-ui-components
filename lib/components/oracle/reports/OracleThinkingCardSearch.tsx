import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface ThinkingStep {
  id: string;
  function_name: string;
  inputs: {
    question: string;
    [key: string]: any;
  };
  result: {
    error?: string;
    answer: string;
    reference_sources: {
      source: string;
      url: string;
    }[];
  };
}

export default function OracleThinkingCard({ step }: { step: ThinkingStep }) {
  let { function_name, result } = step;

  // Convert markdown to HTML and sanitize it
  const sanitizedHtml = sanitizeHtml(marked.parse(result.answer), {
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
      {/* show sources */}
      {result.reference_sources && (
        <div>
          <h3>Reference Sources</h3>
          <ul>
            {result.reference_sources.map((source, i) => (
              <li key={i}>
                <a href={source.url} target="_blank">
                  {source.source}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
