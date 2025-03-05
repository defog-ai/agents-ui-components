// mdxParser.ts
import { parseData } from "@agent";
import { marked } from "marked";
import { ParsedMDX, TagParseResult } from "./types";

/**
 * Parses HTML-like tags from a string and extracts their attributes and content.
 * @param text - The input text to search for tags
 * @param tag - The tag name to search for
 * @returns Array of objects containing the full text, attributes, and inner content of each tag
 */
export function findTag(text: string, tag: string): TagParseResult[] {
  const results: TagParseResult[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const tags = doc.querySelectorAll(tag);

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const fullText = tag.outerHTML;
    const attributes = {};
    for (let j = 0; j < tag.attributes.length; j++) {
      const attr = tag.attributes[j];
      attributes[attr.name] = attr.value;
    }
    const innerContent = tag.innerHTML;
    results.push({ fullText, attributes, innerContent });
  }

  return results;
}

/**
 * Parse tables from an MDX string and replace them with oracle-table tags.
 */
export function parseTables(
  mdx: string,
  table_csv?: string,
  sql?: string,
  generated_qn?: string
) {
  const parsed = {
    tables: {},
    multiTables: {},
  };

  const tables = findTag(mdx, "table");

  // replace tables with oracle-tables
  for (const table of tables) {
    const id = crypto.randomUUID();
    mdx = mdx.replace(
      table.fullText,
      `<oracle-table id="${id}"></oracle-table>`
    );
    const { columns, data } = parseData(table.attributes.csv);
    parsed.tables[id] = { columns, data, ...table };
    parsed.tables[id].attributes = {
      ...parsed.tables[id].attributes,
      generated_qn: generated_qn,
    };
  }

  // find multi tables
  const multiTables = findTag(mdx, "multitable");

  // replace multiTables with oracle-multi-tables
  for (const multiTable of multiTables) {
    const id = crypto.randomUUID();
    //   find table ids
    const tables = findTag(multiTable.fullText, "oracle-table");

    mdx = mdx.replace(
      multiTable.fullText,
      `<oracle-multi-table id="${id}"></oracle-multi-table>`
    );

    parsed.multiTables[id] = {
      tableIds: tables.map((t) => t.attributes.id),
      ...multiTable,
    };
  }

  // if no multitables, add one with all tables
  if (Object.keys(parsed.multiTables).length === 0 && table_csv && sql) {
    const { columns, data } = parseData(table_csv);
    parsed.tables["default-table"] = {
      columns,
      data,
      attributes: {
        sql: sql,
        csv: table_csv,
        generated_qn: generated_qn,
        type: "fetched_table_csv",
      },
    };

    parsed.multiTables["default-multi-table"] = {
      tableIds: ["default-table"],
      attributes: {},
      fullText:
        '<multitable><oracle-table id="default-table"></oracle-table></multitable>',
      innerText: '<oracle-table id="default-table"></oracle-table>',
    };
    mdx += `<oracle-multi-table id="default-multi-table"><oracle-table id="default-table"></oracle-table></oracle-multi-table>`;
  }

  return { mdx: mdx, ...parsed };
}

/**
 * Parse images from an MDX string and replace them with oracle-image tags.
 */
export function parseImages(mdx: string) {
  const parsed = {
    images: {},
  };
  const images = findTag(mdx, "image");

  // replace images with oracle-images
  for (const image of images) {
    const id = crypto.randomUUID();
    mdx = mdx.replace(
      image.fullText,
      `<oracle-image id="${id}"></oracle-image>`
    );
    parsed.images[id] = image;
  }

  return { mdx: mdx, ...parsed };
}

/**
 * Main class for MDX parsing functionality
 */
class MDX {
  mdx: string;
  tables: {
    [key: string]: {
      columns: any[];
      data: any[];
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
  multiTables: {
    [key: string]: {
      tableIds: string[];
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
  images: {
    [key: string]: {
      src: string;
      alt: string;
      attributes?: { [key: string]: string };
      fullText?: string;
    };
  };
  table_csv: string;
  sql: string;
  generated_qn: string;

  constructor(
    mdx: string,
    table_csv?: string,
    sql?: string,
    generated_qn?: string
  ) {
    this.mdx = mdx;
    this.tables = {};
    this.multiTables = {};
    this.images = {};
    this.table_csv = table_csv || "";
    this.sql = sql || "";
    this.generated_qn = generated_qn || "";
  }

  parseTables = () => {
    let parsed = parseTables(
      this.mdx,
      this.table_csv,
      this.sql,
      this.generated_qn
    );
    this.tables = parsed.tables;
    this.multiTables = parsed.multiTables;
    this.mdx = parsed.mdx;

    return this;
  };

  parseImages = () => {
    let parsed = parseImages(this.mdx);
    this.images = parsed.images;
    this.mdx = parsed.mdx;

    return this;
  };

  cleanup = () => {
    // if there is any oracle-comment-handler tags, remove all of them
    // we will add one manually at the end
    const commentHandlers = findTag(this.mdx, "oracle-comment-handler");
    if (commentHandlers.length > 0) {
      for (const commentHandler of commentHandlers) {
        this.mdx = this.mdx.replace(commentHandler.fullText, "");
      }
    }

    this.mdx = this.mdx + "\n\n<oracle-comment-handler/>";

    return this;
  };

  getParsed = (): ParsedMDX => {
    return Object.assign(
      {},
      {
        mdx: this.mdx,
        tables: Object.assign({}, this.tables),
        multiTables: Object.assign({}, this.multiTables),
        images: Object.assign({}, this.images),
      }
    );
  };
}

/**
 * Parse an MDX string and return structured data
 */
export const parseMDX = (
  mdx: string,
  table_csv?: string,
  sql?: string,
  generated_qn?: string
): ParsedMDX => {
  let parsed = new MDX(mdx, table_csv, sql, generated_qn);

  parsed.parseTables().parseImages().cleanup();

  return parsed.getParsed();
};

/**
 * Converts the MDX content to Markdown format
 *
 * @param mdx - The MDX content to convert
 * @returns Clean Markdown content
 */
export const convertMdxToMarkdown = (mdx: string): string => {
  // Replace oracle-specific components with their markdown equivalents
  let markdown = mdx;

  // Remove oracle-table tags
  markdown = markdown.replace(/<oracle-table[^>]*><\/oracle-table>/g, "");

  // Remove oracle-multi-table tags
  markdown = markdown.replace(
    /<oracle-multi-table[^>]*><\/oracle-multi-table>/g,
    ""
  );

  // Remove oracle-image tags
  markdown = markdown.replace(/<oracle-image[^>]*><\/oracle-image>/g, "");

  // Remove oracle-comment-handler tag
  markdown = markdown.replace(/<oracle-comment-handler\/>/g, "");

  // Clean up any other oracle-specific tags or formatting
  markdown = markdown.replace(/<oracle-[^>]*>/g, "");
  markdown = markdown.replace(/<\/oracle-[^>]*>/g, "");

  return markdown;
};

/**
 * Prepares the report content for PDF export
 *
 * @param mdx - The MDX content to export
 * @returns HTML content ready for PDF generation
 */
export const prepareHtmlForPdf = (mdx: string): string => {
  const markdown = convertMdxToMarkdown(mdx);

  // Use the marked library to convert markdown to HTML
  const html = marked.parse(markdown);

  // Add styling for proper PDF rendering
  return `
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.25em; }
          p { margin: 1em 0; }
          ul, ol { padding-left: 2em; }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 1em;
            color: #666;
            margin: 1em 0;
          }
          code {
            font-family: Menlo, Monaco, 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
          }
          pre {
            background-color: #f5f5f5;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
          }
          pre code {
            background-color: transparent;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }
          th, td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f5f5f5;
            font-weight: 600;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
};
