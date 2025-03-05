// exportUtils.ts
import { convertMdxToMarkdown, prepareHtmlForPdf } from "./mdxParser";
import { marked } from "marked";

/**
 * Downloads content as a file
 *
 * @param content - The content to download
 * @param fileName - The name of the file
 * @param contentType - The content type of the file
 */
export const downloadFile = (
  content: string,
  fileName: string,
  contentType: string
): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports the report content as a Markdown file
 *
 * @param mdx - The MDX content to export
 * @param fileName - The name of the file (defaults to 'report.md')
 */
export const exportAsMarkdown = (
  mdx: string,
  fileName: string = "report.md"
): void => {
  const markdown = convertMdxToMarkdown(mdx);
  downloadFile(markdown, fileName, "text/markdown");
};

/**
 * Uses html2canvas and jsPDF to export MDX content as PDF
 *
 * This function needs to be called in a browser environment where
 * both html2canvas and jsPDF are available. You'll need to import
 * and load these libraries before using this function.
 *
 * @param mdx - The MDX content to export as PDF
 * @param fileName - The name of the PDF file (defaults to 'report.pdf')
 */
export const exportAsPdf = async (
  mdx: string,
  fileName: string = "report.pdf"
): Promise<void> => {
  // Convert MDX to HTML
  const markdown = convertMdxToMarkdown(mdx);
  const html = await marked.parse(markdown);

  // Create a temporary container to render the HTML
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "800px";
  container.classList.add("prose", "prose-base");

  // Add the container to the document
  document.body.appendChild(container);

  try {
    // Use the print function to generate a PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Could not open print window");
    }

    const printDocument = printWindow.document;
    printDocument.write(`
      <html>
        <head>
          <title>${fileName}</title>
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
            /* Print-specific styles */
            @media print {
              /* General print settings */
              body {
                padding: 0;
                margin: 0;
              }
              
              /* Hide URL, date, and page numbers */
              @page {
                margin: 1cm;
                size: auto;
              }
              
              /* Chrome, Safari, Edge */
              @page {
                size: auto;
                margin: 5mm 10mm;
                margin-header: 0;
                margin-footer: 0;
              }
              
              /* Hide header and footer completely */
              html {
                -webkit-print-color-adjust: exact !important;
              }
              
              /* Hide any browser-specific headers and footers */
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          ${html}
          
          <script>
            // This script runs in the print window to assist with print settings
            document.addEventListener('DOMContentLoaded', function() {
              // Add a small delay for browsers to process the content
              setTimeout(function() {
                // Some additional print settings via script
                const style = document.createElement('style');
                style.textContent = 
                  "@media print {" +
                    "/* More specific fixes for different browsers */" +
                    "body::before, body::after { display: none !important; }" +
                    "header, footer { display: none !important; }" +
                    
                    "/* Ensure our content is visible */" +
                    "body { -webkit-print-color-adjust: exact !important; }" +
                  "}";
                document.head.appendChild(style);
              }, 100);
            });
          </script>
        </body>
      </html>
    `);

    printDocument.close();

    // Allow some time for resources to load
    setTimeout(() => {
      // Add a listener to close the window after printing is done
      if (printWindow.matchMedia) {
        const mediaQueryList = printWindow.matchMedia("print");
        mediaQueryList.addEventListener("change", function (mql) {
          if (!mql.matches) {
            // Print dialog closed, now close the window
            setTimeout(() => printWindow.close(), 100);
          }
        });
      }

      printWindow.print();
      // Don't close immediately - allow the print dialog to appear and let the user finish
    }, 500);
  } finally {
    // Clean up the temporary container
    document.body.removeChild(container);
  }
};
