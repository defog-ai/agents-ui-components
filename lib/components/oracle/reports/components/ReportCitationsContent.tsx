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

function parseTextWithMath(expr: string) {
  // Latex is wrapped in <latex-block>...</latex-block> for block equations or <latex-inline>...</latex-inline> for inline expressions

  const regexes = [
    /<latex-block>([\s\S]*?)<\/latex-block>/g, // Block LaTeX
    /<latex-inline>([\s\S]*?)<\/latex-inline>/g, // Inline LaTeX
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

  console.groupCollapsed("LaTeX matches found");
  if (matches && matches.length > 0) {
    console.log(expr);
    console.log(matches.map((d) => d.index));

    // Sort matches by their index to ensure proper order of processing
    matches.sort((a, b) => a.index - b.index);

    console.log("matches", matches);

    const parsed: string[] = [];

    // First, add the content before the first match
    if (matches[0].index > 0) {
      parsed.push(marked.parse(expr.slice(0, matches[0].index)));
    }

    // Process each match in order
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      // Parse the LaTeX content
      // Check if this is a block or inline LaTeX based on the tag
      const isBlockLatex = match[0].includes("<latex-block>");

      // Get the content between this match and the next match (or end of string)
      const nextIndex =
        i < matches.length - 1 ? matches[i + 1].index : expr.length;
      const textBetween = expr.slice(match.index + match[0].length, nextIndex);

      // if this was block latex, add it as a separate entry in the parsed array
      // otherwise, append it to the previous entry in the parsed array to maintain the same sentence when parsing via
      // marked later.
      // if the parsed array is empty, create the first entry
      if (isBlockLatex) {
        parsed.push(
          katex.renderToString(match[1], {
            displayMode: true,
          })
        );

        if (textBetween.length > 0) {
          parsed.push(textBetween);
        }
      } else {
        const rendered = katex.renderToString(match[1], {
          displayMode: false,
        });
        if (parsed.length > 0) {
          parsed[parsed.length - 1] += rendered + textBetween;
        } else {
          parsed.push(rendered + textBetween);
        }
      }
    }

    // run all the entries through marked.parse
    const parsedMarkdown = parsed.map((d) => marked.parse(d));

    console.log("Parsed LaTeX and markdown:", parsedMarkdown);

    // Join all the parsed fragments and replace newline sequences
    return parsedMarkdown.join("").replace(/\n+/g, "\n\n").trim();
  }

  console.groupEnd();

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
      // Check for both <latex-block> and <latex-inline> tags
      if (
        item.text.indexOf("<latex-block>") === -1 &&
        item.text.indexOf("<latex-inline>") === -1
      ) {
        // No LaTeX content, just parse markdown and return
        return {
          ...item,
          parsed: marked.parse(item.text),
        };
      } else {
        const text = item.text;
        return {
          ...item,
          parsed: parseTextWithMath(text),
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
