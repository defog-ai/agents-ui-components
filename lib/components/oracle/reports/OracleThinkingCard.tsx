import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export interface ThinkingStep {
  function_name: string;
  inputs: {
    question: string;
  };
  result: string;
}

export default function OracleThinkingCard({ step }: { step: ThinkingStep }) {
  let { function_name, result } = step;

  // if result is not a string, convert it to a string
  if (typeof result !== "string") {
    result = JSON.stringify(result);
  }

  // Convert markdown to HTML and sanitize it
  const sanitizedHtml = sanitizeHtml(marked.parse(result), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'img': ['src', 'alt', 'title']
    }
  });

  return (
    <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-dark-bg-secondary dark:border-dark-border">
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
