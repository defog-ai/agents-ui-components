// Utility function to save chart as PNG
import { toPng } from "html-to-image";

/**
 * Saves a DOM element as a PNG image with specified dimensions
 * @param {HTMLElement} container - The DOM element to save
 * @param {Object} options - Configuration options
 * @param {string} [options.bg='white'] - Background color
 * @param {number} [options.width=1000] - Export width
 * @param {number} [options.height=1000] - Export height
 * @param {string} [options.filename='chart.png'] - Output filename
 */
export function saveAsPNG(container, options = {}) {
  if (!container) return;

  const {
    bg = "white",
    width: exportWidth = 1000,
    height: exportHeight = 1000,
    filename = "chart.png",
  } = options;

  const PADDING = 0;

  // Store original styles including text colors and backgrounds
  const originalStyles = {
    width: container.style.width,
    height: container.style.height,
    position: container.style.position,
    overflow: container.style.overflow,
    transform: container.style.transform,
    transformOrigin: container.style.transformOrigin,
    padding: container.style.padding,
    scrollTop: container.scrollTop,
    scrollLeft: container.scrollLeft,
    backgroundColor: container.style.backgroundColor,
  };

  // Store original text colors of all text elements
  const textElements = container.querySelectorAll(
    "text, .tick text, .axis-label, .title",
  );
  const originalTextColors = new Map();
  textElements.forEach((el) => {
    originalTextColors.set(el, {
      fill: el.style.fill || window.getComputedStyle(el).fill,
      stroke: el.style.stroke || window.getComputedStyle(el).stroke,
      color: el.style.color || window.getComputedStyle(el).color,
    });
  });

  // Prepare container for capture
  const prepareContainer = () => {
    Object.assign(container.style, {
      width: `${container.scrollWidth}px`,
      height: `${container.scrollHeight}px`,
      position: "relative",
      overflow: "visible",
      transform: "none",
      transformOrigin: "top left",
      padding: `${PADDING}px`,
      backgroundColor: bg,
    });
    container.scrollTop = 0;
    container.scrollLeft = 0;

    // Set all text elements to dark color for light background
    textElements.forEach((el) => {
      el.style.fill = "#000000";
      el.style.stroke = "none";
      el.style.color = "#000000";
    });
  };

  // Restore container to original state
  const restoreContainer = () => {
    Object.assign(container.style, {
      width: originalStyles.width,
      height: originalStyles.height,
      position: originalStyles.position,
      overflow: originalStyles.overflow,
      transform: originalStyles.transform,
      transformOrigin: originalStyles.transformOrigin,
      padding: originalStyles.padding,
      backgroundColor: originalStyles.backgroundColor,
    });
    container.scrollTop = originalStyles.scrollTop;
    container.scrollLeft = originalStyles.scrollLeft;

    // Restore original text colors
    textElements.forEach((el) => {
      const originalColors = originalTextColors.get(el);
      if (originalColors) {
        el.style.fill = originalColors.fill;
        el.style.stroke = originalColors.stroke;
        el.style.color = originalColors.color;
      }
    });
  };

  try {
    prepareContainer();

    const originalWidth = container.offsetWidth;
    const originalHeight = container.offsetHeight;
    const scaleX = exportWidth / originalWidth;
    const scaleY = exportHeight / originalHeight;

    // Create scaled clone
    const clonedNode = container.cloneNode(true);
    Object.assign(clonedNode.style, {
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: "top left",
      width: `${originalWidth}px`,
      height: `${originalHeight}px`,
    });

    // Create offscreen container
    const offscreenContainer = document.createElement("div");
    Object.assign(offscreenContainer.style, {
      position: "absolute",
      top: "-10000px",
      left: "-10000px",
    });
    offscreenContainer.appendChild(clonedNode);
    document.body.appendChild(offscreenContainer);

    // Generate and download PNG
    return toPng(clonedNode, {
      backgroundColor: bg,
      pixelRatio: 2,
      width: container.scrollWidth,
      height: container.scrollHeight,
      style: {
        transform: "none",
        transformOrigin: "top left",
      },
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      })
      .finally(() => {
        restoreContainer();
        document.body.removeChild(offscreenContainer);
      });
  } catch (error) {
    restoreContainer();
    console.error("Failed to export chart:", error);
    throw error;
  }
}
