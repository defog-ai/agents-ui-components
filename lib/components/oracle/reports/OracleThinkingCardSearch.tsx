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
  let { function_name, result, inputs } = step;

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

      {/* Show the question from the inputs */}
      {inputs?.question && (
        <div className="mb-3 text-gray-700 dark:text-dark-text-secondary">
          <p className="mb-1 font-medium text-gray-800 dark:text-dark-text-primary">
            Question
          </p>
          <p className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md border-l-2 border-blue-500 dark:border-blue-600 italic text-gray-700 dark:text-dark-text-secondary">
            {inputs.question}
          </p>
        </div>
      )}

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
