// Utility function to save chart as PNG
import { toPng } from "html-to-image";

export function saveAsPNG(container, bg = "#ffffff") {
  if (!container) return;

  const padding = 20;

  toPng(container, {
    backgroundColor: bg,
    pixelRatio: 2,
    width: container.offsetWidth + padding * 2,
    height: container.offsetHeight + padding * 2,
  })
    .then(function (dataUrl) {
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = dataUrl;
      link.click();
    })
    .catch(function (error) {
      console.error("oops, something went wrong!", error);
    });
}
