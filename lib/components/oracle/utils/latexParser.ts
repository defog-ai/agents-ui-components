// latexParser.ts
/**
 * Helper functions to process LaTeX tags in report content
 */

type ProcessedContent = {
  type: string;
  attrs?: Record<string, any>;
  content?: ProcessedContent[];
  text?: string;
};

/**
 * Processes the mdx content to replace <LATEX_INLINE> and <LATEX_BLOCK> tags
 * with the appropriate TipTap node structures
 */
export const processLatexTags = (content: string): string => {
  if (!content) return content;

  // Process inline LaTeX tags
  let processedContent = content.replace(
    /<LATEX_INLINE>(.*?)<\/LATEX_INLINE>/gs,
    (_, latexContent) => {
      // Create a placeholder that Tiptap will understand
      return `<span class="latex-inline" data-content="${escapeHtml(latexContent)}"></span>`;
    }
  );

  // Process block LaTeX tags
  processedContent = processedContent.replace(
    /<LATEX_BLOCK>(.*?)<\/LATEX_BLOCK>/gs,
    (_, latexContent) => {
      // Create a placeholder that Tiptap will understand
      return `<div class="latex-block" data-content="${escapeHtml(latexContent)}"></div>`;
    }
  );

  return processedContent;
};

/**
 * Escape HTML special characters to prevent XSS
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Process LaTeX tags in a Tiptap content structure
 */
export const processLatexInParsedStructure = (parsedContent: any): any => {
  if (!parsedContent) return parsedContent;

  const processNode = (node: any): any => {
    // If this is a text node with LaTeX tags
    if (node.type === 'text' && node.text) {
      // Process inline LaTeX tags
      const inlineMatches = [...node.text.matchAll(/<LATEX_INLINE>(.*?)<\/LATEX_INLINE>/gs)];
      if (inlineMatches.length > 0) {
        const parts: ProcessedContent[] = [];
        let lastIndex = 0;

        inlineMatches.forEach((match) => {
          const [fullMatch, latexContent] = match;
          const matchIndex = match.index || 0;

          // Add text before the LaTeX tag
          if (matchIndex > lastIndex) {
            parts.push({
              type: 'text',
              text: node.text.substring(lastIndex, matchIndex),
            });
          }

          // Add the LaTeX node
          parts.push({
            type: 'latex-inline',
            attrs: { content: latexContent },
          });

          lastIndex = matchIndex + fullMatch.length;
        });

        // Add any remaining text after the last LaTeX tag
        if (lastIndex < node.text.length) {
          parts.push({
            type: 'text',
            text: node.text.substring(lastIndex),
          });
        }

        return parts;
      }

      // Process block LaTeX tags - these shouldn't appear in text nodes, but handle just in case
      const blockMatches = [...node.text.matchAll(/<LATEX_BLOCK>(.*?)<\/LATEX_BLOCK>/gs)];
      if (blockMatches.length > 0) {
        const parts: ProcessedContent[] = [];
        let lastIndex = 0;

        blockMatches.forEach((match) => {
          const [fullMatch, latexContent] = match;
          const matchIndex = match.index || 0;

          // Add text before the LaTeX tag
          if (matchIndex > lastIndex) {
            parts.push({
              type: 'text',
              text: node.text.substring(lastIndex, matchIndex),
            });
          }

          // Add the LaTeX node
          parts.push({
            type: 'latex-block',
            attrs: { content: latexContent },
          });

          lastIndex = matchIndex + fullMatch.length;
        });

        // Add any remaining text after the last LaTeX tag
        if (lastIndex < node.text.length) {
          parts.push({
            type: 'text',
            text: node.text.substring(lastIndex),
          });
        }

        return parts;
      }
    }

    // Process children recursively
    if (node.content && Array.isArray(node.content)) {
      const processedContent: ProcessedContent[] = [];
      
      for (const child of node.content) {
        const processed = processNode(child);
        if (Array.isArray(processed)) {
          processedContent.push(...processed);
        } else {
          processedContent.push(processed);
        }
      }
      
      return {
        ...node,
        content: processedContent,
      };
    }

    return node;
  };

  // Process the root content
  if (Array.isArray(parsedContent)) {
    return parsedContent.flatMap(processNode);
  } else {
    return processNode(parsedContent);
  }
};