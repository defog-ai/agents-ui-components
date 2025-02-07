// Utility function to save chart as PNG
import { toPng } from "html-to-image";

export function saveAsPNG(container, options = {}) {
  if (!container) return;

  const padding = 40; // Increased padding for better visual spacing

  // Store original styles and scroll positions
  const originalStyle = {
    width: container.style.width,
    height: container.style.height,
    position: container.style.position,
    overflow: container.style.overflow,
    transform: container.style.transform,
    transformOrigin: container.style.transformOrigin,
    padding: container.style.padding,
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
    container.style.padding = `${padding}px`;
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

  // Get original container dimensions
  const originalWidth = container.offsetWidth;
  const originalHeight = container.offsetHeight;

  // Use supplied dimensions or fallback to original
  const exportWidth = 1000;
  const exportHeight = 1000;

  // Compute scale factors
  const scaleX = exportWidth / originalWidth;
  const scaleY = exportHeight / originalHeight;

  // Clone the container
  const clonedNode = container.cloneNode(true);

  // Apply scaling transform to the clone to force desired export dimensions
  clonedNode.style.transform = `scale(${scaleX}, ${scaleY})`;
  clonedNode.style.transformOrigin = "top left";
  // Keep the original size so that the scaling applies correctly
  clonedNode.style.width = originalWidth + "px";
  clonedNode.style.height = originalHeight + "px";

  // Append clone to an offscreen container (rendered but out of viewport)
  const offscreenContainer = document.createElement("div");
  offscreenContainer.style.position = "absolute";
  offscreenContainer.style.top = "-10000px";
  offscreenContainer.style.left = "-10000px";
  offscreenContainer.appendChild(clonedNode);
  document.body.appendChild(offscreenContainer);

  // Render the transformed clone as a PNG with target dimensions
  toPng(clonedNode, {
    backgroundColor: bg,
    pixelRatio: 2,
    width: container.scrollWidth,
    height: container.scrollHeight,
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
      // Clean up the offscreen container
      document.body.removeChild(offscreenContainer);
    })
    .catch(function (error) {
      // Restore container even if capture fails
      restoreContainer();
      console.error("Failed to export chart:", error);
    });
}
