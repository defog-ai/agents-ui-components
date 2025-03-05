import { OracleAnalysis } from "@oracle";
import { marked } from "marked";

interface WebSearchContentProps {
  analysis: OracleAnalysis;
}

export function WebSearchContent({ analysis }: WebSearchContentProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Question header with icon */}
      {analysis.inputs?.question && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Question
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {analysis.inputs.question}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Answer with markdown */}
      {analysis.result?.answer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-500 dark:text-green-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Answer from Web Search
            </h4>
          </div>
          <div
            className="prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: marked.parse(
                analysis.result.answer
              ),
            }}
          />
        </div>
      )}

      {/* Reference sources card */}
      {analysis.result?.reference_sources &&
        Array.isArray(
          analysis.result.reference_sources
        ) &&
        analysis.result.reference_sources.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b dark:border-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Reference Sources
              </h4>
            </div>
            <ul className="space-y-2">
              {analysis.result.reference_sources.map(
                (source, i) => (
                  <li key={i} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 mr-2 flex-shrink-0">
                      {i + 1}
                    </span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 break-all"
                    >
                      {source.source}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
    </div>
  );
}