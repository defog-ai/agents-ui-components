// Utility function to save chart as PNG
import domtoimage from "dom-to-image";

export function saveAsPNG(container, bg = "#ffffff") {
  if (!container) return;

  const padding = 20;
  const scale = 2; // for better quality

  const style = {
    transform: "scale(" + scale + ")",
    transformOrigin: "top left",
    width: container.offsetWidth + "px",
    height: container.offsetHeight + "px",
    margin: padding + "px " + padding + "px",
  };

  domtoimage
    .toPng(container, {
      bgcolor: bg,
      style: style,
      width: container.offsetWidth * scale + padding * 2,
      height: container.offsetHeight * scale + padding * 2,
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
