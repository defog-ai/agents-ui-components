import { CitationItem } from "@oracle";
import { File } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/fonts/KaTeX_Size2-Regular.woff2";
import "katex/dist/fonts/KaTeX_Main-Regular.woff2";
import "katex/dist/fonts/KaTeX_Math-Italic.woff2";
import { marked } from "marked";

interface ReportCitationsContentProps {
  citations: CitationItem[];
}

function mathsExpression(expr: string) {
  // there might be multiple $..$ or $$...$$ in a single expression

  // https://github.com/KaTeX/KaTeX/discussions/3509#discussioncomment-1992394
  // There isn't currently an API for rendering a bunch of text with multiple math expressions like that (see #604). The intent is to call renderToString for each part within $ delimiters, e.g., renderToString(`\{y \in \mathbb{R}, y \leq 0\}`), and concatenate them yourself.
  // There is code for doing roughly this in auto-render, but it's currently just intended to run on the DOM.

  // find all matches of the two regexes
  // Latex is always wrapped in <latex>$...$</latex> or <latex>$$...$$</latex>. (Otherwise it gets hard to differentiate it against dollar signs appearing in currency or text)

  const regexes = [
    /<latex>\$\$([\s\S]*?)\$\$<\/latex>/g,
    /<latex-inline>\$([\s\S]*?)\$<\/latex-inline>/g,
  ];

  let matches: RegExpExecArray[] = [];

  if (!expr) return null;

  for (let i = 0; i < regexes.length; i++) {
    const regex = regexes[i];

    let match: RegExpExecArray | null;
    do {
      match = regex.exec(expr);
      if (!match) continue;
      matches.push(match);
    } while (match);
  }

  if (matches && matches.length > 0) {
    console.groupCollapsed("matches");
    console.log(expr);
    console.log(matches.map((d) => d.index));

    const parsed: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      // first insert the text after the match till the next match
      parsed.push(
        marked.parse(
          expr.slice(
            match.index + match[0].length,
            matches[i + 1] ? matches[i + 1].index : expr.length
          )
        )
      );

      // now parse the text within the match
      parsed.push(
        katex.renderToString(match[1], {
          displayMode: i === 0,
          output: "mathml",
        })
      );
    }

    // in the end, insert the remaining beginning text if any from 0 to the first match index
    if (matches[0].index > 0) {
      parsed.push(marked.parse(expr.slice(0, matches[0].index)));
    }

    console.log(parsed);
    console.groupEnd();

    return parsed.join("").replace("\n+", "\n\n").trim();
  }

  return expr;
}

export function ReportCitationsContent({
  citations,
}: ReportCitationsContentProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  const citationsParsed = citations
    .map((item) => {
      if (!item.text) return null;
      if (item.text.indexOf("<latex>") === -1) {
        // parse and return
        return {
          ...item,
          parsed: marked.parse(item.text),
        };
      } else {
        // parse the math to katex and send
        const text = item.text;
        const math = mathsExpression(text);

        return {
          ...item,
          parsed: math,
        };
      }
    })
    .filter((d) => d.parsed);

  return (
    <div className="flex flex-col space-y-4">
      {/* Citations Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 p-3 sm:p-4">
        {citationsParsed.map((item, index) => (
          <div key={index} className="mb-4 relative group">
            <div
              className="prose dark:prose-invert prose-sm max-w-none py-1"
              dangerouslySetInnerHTML={{
                __html: item.parsed,
              }}
            />

            {item.citations &&
              Array.isArray(item.citations) &&
              item.citations.length > 0 && (
                <>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center">
                    <File className="mr-1 w-3 stroke-blue-500" />
                    <span className="italic mr-1">Source:</span>
                    <span className="break-all">
                      {item.citations[0].document_title}
                    </span>
                    {item.citations[0].start_page_number && (
                      <span className="ml-1">
                        (Pages {item.citations[0].start_page_number}-
                        {item.citations[0].end_page_number})
                      </span>
                    )}
                  </div>

                  {/* Citation hover/touch panel - adaptive for mobile */}
                  <div className="absolute left-0 right-0 -bottom-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible md:transition-all md:duration-200 transform translate-y-full z-10">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 mt-2 shadow-lg">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Cited Text:
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        "{item.citations[0].cited_text}"
                      </p>
                    </div>
                  </div>

                  {/* Mobile-friendly citation toggle button */}
                  <button
                    className="text-xs text-blue-600 dark:text-blue-400 mt-1 block md:hidden"
                    onClick={(e) => {
                      // Find the next sibling (the citation panel) and toggle its visibility
                      const panel =
                        e.currentTarget.parentElement?.querySelector(
                          ".mobile-citation-panel"
                        );
                      if (panel) {
                        panel.classList.toggle("hidden");
                      }
                    }}
                  >
                    View citation
                  </button>

                  {/* Mobile citation panel (initially hidden) */}
                  <div className="mobile-citation-panel hidden mt-2 md:hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border dark:border-gray-600 shadow-sm">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Cited Text:
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        "{item.citations[0].cited_text}"
                      </p>
                    </div>
                  </div>
                </>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
