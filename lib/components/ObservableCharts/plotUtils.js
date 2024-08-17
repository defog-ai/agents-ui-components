import * as Plot from "@observablehq/plot";

export const defaultOptions = {
  type: "line",
  x: "x",
  y: "y",
  xLabel: "X Axis",
  yLabel: "Y Axis",
  backgroundColor: "#ffffff",
  fontSize: 12,
  title: "",
  lineColor: "steelblue",
  lineWidth: 2,
  barColor: "steelblue",
  pointColor: "steelblue",
  pointSize: 3,
  yAxisUnitLabel: "",
  yAxisUnitPosition: "suffix",
  showLabels: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  facetX: null,
  xDateFormat: "%Y-%m-%d",
  yDateFormat: "%Y-%m-%d",
};

export const getMarks = (data, mergedOptions) => {
  const baseMarks = [];

  const chartMarks = getChartSpecificMarks(data, mergedOptions);

  return mergedOptions.facet
    ? [
        Plot.frame(),
        ...baseMarks,
        Plot.ruleY([0]),
        Plot.axisY({
          tickSize: 0,
          tickFormat: (d, i, _) => {
            const formattedValue =
              mergedOptions.yAxisUnitPosition === "prefix"
                ? `${mergedOptions.yAxisUnitLabel}${d}`
                : `${d}${mergedOptions.yAxisUnitLabel}`;
            return i === _.length - 1 ? formattedValue : d;
          },
          lineAnchor: "bottom",
        }),
        ...chartMarks,
      ]
    : [...baseMarks, ...chartMarks];
};

const getChartSpecificMarks = (data, mergedOptions) => {
  switch (mergedOptions.type) {
    case "line":
      return getLineMarks(data, mergedOptions);
    case "bar":
      return [
        Plot.barY(data, {
          x: mergedOptions.x,
          y: Array.isArray(mergedOptions.y)
            ? mergedOptions.y[0]
            : mergedOptions.y,
          fill: mergedOptions.barColor,
        }),
      ];
    case "scatter":
      return [
        Plot.dot(data, {
          x: mergedOptions.x,
          y: mergedOptions.y,
          fill: mergedOptions.pointColor,
          r: mergedOptions.pointSize,
        }),
      ];
    default:
      return [];
  }
};

const getLineMarks = (data, mergedOptions) => {
  const marks = [];
  if (Array.isArray(mergedOptions.y)) {
    mergedOptions.y.forEach((y, index) => {
      const lineOptions = mergedOptions.lineOptions?.[index] || {};
      marks.push(
        Plot.line(data, {
          x: mergedOptions.x,
          y: y,
          stroke:
            mergedOptions.colorBy ||
            lineOptions.stroke ||
            mergedOptions.lineColor,
          strokeWidth: lineOptions.strokeWidth || mergedOptions.lineWidth,
          curve: lineOptions.curve || mergedOptions.curve,
        })
      );

      if (mergedOptions.showLabels) {
        marks.push(
          Plot.text(
            data,
            Plot.selectLast({
              x: mergedOptions.x,
              y: y,
              text: y,
              frameAnchor: "right",
              dx: 3,
              dy: 8,
            })
          )
        );
      }
    });
  } else {
    marks.push(
      Plot.line(data, {
        x: mergedOptions.x,
        y: mergedOptions.y,
        stroke: mergedOptions.colorBy || mergedOptions.lineColor,
        strokeWidth: mergedOptions.lineWidth,
        curve: mergedOptions.curve,
      })
    );

    if (mergedOptions.showLabels) {
      marks.push(
        Plot.text(
          data,
          Plot.selectLast({
            x: mergedOptions.x,
            y: mergedOptions.y,
            text: mergedOptions.colorBy || mergedOptions.y,
            frameAnchor: "right",
            dx: 3,
            dy: 8,
          })
        )
      );
    }
  }

  return marks;
};

export const saveAsPNG = (container, bg = "#ffffff") => {
  if (container) {
    const svg = container.querySelector("svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      const padding = 20; // Define padding size
      img.onload = () => {
        canvas.width = svg.width.baseVal.value + 2 * padding;
        canvas.height = svg.height.baseVal.value + 2 * padding;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "chart.png";
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml," + encodeURIComponent(svgData);
    }
  }
};
