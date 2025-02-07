// Utility function to save chart as PNG
import { toPng } from "html-to-image";

export function saveAsPNG(container, options = {}) {
  if (!container) return;

  const { bg = "#ffffff", targetWidth, targetHeight } = options;
  const padding = 20;

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
    width: exportWidth + padding * 2,
    height: exportHeight + padding * 2,
  })
    .then(function (dataUrl) {
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = dataUrl;
      link.click();
      // Clean up the offscreen container
      document.body.removeChild(offscreenContainer);
    })
    .catch(function (error) {
      console.error("oops, something went wrong!", error);
      document.body.removeChild(offscreenContainer);
    });
}
