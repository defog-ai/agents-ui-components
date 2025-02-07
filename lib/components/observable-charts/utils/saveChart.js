// Utility function to save chart as PNG
import { toPng } from "html-to-image";

export function saveAsPNG(container, bg = "#ffffff") {
  if (!container) return;

  const padding = 20;

  // Store original styles and scroll positions
  const originalStyle = {
    width: container.style.width,
    height: container.style.height,
    position: container.style.position,
    overflow: container.style.overflow,
    transform: container.style.transform,
    transformOrigin: container.style.transformOrigin,
  };
  const originalScroll = {
    scrollTop: container.scrollTop,
    scrollLeft: container.scrollLeft,
  };

  // Temporarily modify the container to ensure full content is captured
  const modifyContainer = () => {
    container.style.width = `${container.scrollWidth}px`;
    container.style.height = `${container.scrollHeight}px`;
    container.style.position = "relative";
    container.style.overflow = "visible";
    container.style.transform = "none";
    container.style.transformOrigin = "top left";
    container.scrollTop = 0;
    container.scrollLeft = 0;
  };

  // Restore the container to its original state
  const restoreContainer = () => {
    Object.keys(originalStyle).forEach((key) => {
      container.style[key] = originalStyle[key];
    });
    container.scrollTop = originalScroll.scrollTop;
    container.scrollLeft = originalScroll.scrollLeft;
  };

  // Modify container before capture
  modifyContainer();

  toPng(container, {
    backgroundColor: bg,
    pixelRatio: 2,
    width: container.scrollWidth + padding * 2,
    height: container.scrollHeight + padding * 2,
    style: {
      // Ensure any transform on child elements are preserved
      transform: "none",
      transformOrigin: "top left",
    },
  })
    .then(function (dataUrl) {
      // Restore container immediately after successful capture
      restoreContainer();

      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = dataUrl;
      link.click();
    })
    .catch(function (error) {
      // Restore container even if capture fails
      restoreContainer();
      console.error("Failed to export chart:", error);
    });
}
