import * as Plot from "@observablehq/plot";
import {
  getColorScheme,
  getObservableOptions,
  defaultOptions,
} from "../plotUtils";
import { convertWideToLong } from "@utils/utils";
import dayjs from "dayjs";

export function renderPlot(container, dimensions, chartManager) {
  let generatedOptions = null;
  let wasSampled = false;

  const {
    selectedChart,
    selectedColumns,
    chartStyle,
    chartSpecificOptions,
    availableColumns,
    data,
  } = chartManager.config;

  const xColumn = availableColumns.find((col) => col.key === selectedColumns.x);

  if (xColumn?.isDate) {
    const minDate = dayjs.min(data.map((d) => dayjs(d[xColumn.key])));
    const maxDate = dayjs.max(data.map((d) => dayjs(d[xColumn.key])));
    const numDaysRange = (maxDate - minDate) / 1000 / 60 / 60 / 24;

    if (numDaysRange < 14) {
      xColumn.rangeToShow = "day";
    } else if (numDaysRange < 120) {
      xColumn.rangeToShow = "week";
    } else if (numDaysRange < 3 * 365) {
      xColumn.rangeToShow = "month";
    } else {
      xColumn.rangeToShow = "year";
    }
  }

  if (
    !selectedColumns.x ||
    !selectedColumns.y ||
    (Array.isArray(selectedColumns.y) && !selectedColumns?.y?.length)
  ) {
    generatedOptions = null;
  } else {
    let processedData = data;
    const colorByColumn = availableColumns.find(
      (col) => col.key === chartSpecificOptions[selectedChart].colorBy,
    );

    if (selectedChart === "bar" || selectedChart === "line") {
      try {
        processedData = convertWideToLong(
          processedData,
          selectedColumns.x,
          selectedColumns.y,
          chartSpecificOptions[selectedChart].colorBy,
        );
      } catch (e) {
        console.error("Error converting wide to long format", e);
      }
    }

    if (selectedChart !== "bar" && selectedChart !== "line") {
      generatedOptions = getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart || "Bar",
          x: selectedColumns.x || null,
          y: selectedColumns.y || null,
          facet: selectedColumns.facet,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          colorByIsDate: colorByColumn?.isDate,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedData,
        selectedColumns,
        availableColumns,
      );
    } else if (selectedChart === "bar") {
      generatedOptions = getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart,
          x: selectedColumns.x && selectedColumns?.y?.length && "label",
          y: selectedColumns.x && selectedColumns?.y?.length ? "value" : null,
          facet: selectedColumns.x || null,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          colorByIsDate: colorByColumn?.isDate,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedData,
        selectedColumns,
        availableColumns,
      );
    } else if (selectedChart === "line") {
      const processedDataForLine = convertWideToLong(
        processedData,
        selectedColumns.x,
        selectedColumns.y,
        chartSpecificOptions[selectedChart].colorBy,
        colorByColumn?.isDate,
        selectedColumns.facet,
      );

      generatedOptions = getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart,
          x: selectedColumns.x || null,
          y: selectedColumns.x && selectedColumns.y.length ? "value" : null,
          stroke: "label",
          facet: selectedColumns.facet || null,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          colorByIsDate: colorByColumn?.isDate,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedDataForLine,
        selectedColumns,
        availableColumns,
      );
    }
  }

  container.innerHTML = "";
  container.style.padding = "0 0 0 0";

  if (generatedOptions) {
    if (selectedChart === "bar") {
      const { colorScheme } = getColorScheme(chartStyle.selectedScheme);
      const colorDomain = selectedColumns.y;
      const barOptions = chartSpecificOptions?.["bar"]?.barOptions || {};

      let schemeIdx = -1;
      const colorRange = colorDomain.map((col) => {
        if (barOptions[col] && barOptions[col].fill) {
          return barOptions[col].fill;
        } else {
          return Array.isArray(colorScheme)
            ? colorScheme[++schemeIdx % colorScheme.length]
            : colorScheme(schemeIdx / colorDomain.length);
        }
      });

      const finalOptions = {
        ...generatedOptions,
        color: chartSpecificOptions[selectedChart].colorBy
          ? {
              legend: true,
              tickFormat: (d) => d,
            }
          : {
              ...generatedOptions.color,
              scheme: undefined,
              domain: colorDomain,
              range: colorRange,
            },
        fx: {
          grid: false,
          tickRotate: -45,
          tickFormat: (d) => {
            if (xColumn?.isDate) {
              const date = dayjs(d);
              if (xColumn.rangeToShow === "year") {
                return date.format("YYYY");
              } else if (xColumn.rangeToShow === "month") {
                return date.format("MMM YYYY");
              } else {
                return date.format("MMM DD");
              }
            } else {
              return d;
            }
          },
          axis: "bottom",
          interval: xColumn?.isDate ? xColumn.rangeToShow : undefined,
        },
        x: {
          axis: null,
          label: "",
        },
      };

      container.appendChild(Plot.plot(finalOptions));
    } else if (selectedChart === "line") {
      const { colorScheme } = getColorScheme(chartStyle.selectedScheme);
      const colorDomain = selectedColumns.y;
      const lineOptions = chartSpecificOptions?.["line"]?.lineOptions || {};

      let schemeIdx = -1;
      const colorRange = colorDomain.map((col) => {
        if (lineOptions[col] && lineOptions[col].stroke) {
          return lineOptions[col].stroke;
        } else {
          return Array.isArray(colorScheme)
            ? colorScheme[++schemeIdx % colorScheme.length]
            : colorScheme(schemeIdx / colorDomain.length);
        }
      });

      container.appendChild(
        Plot.plot({
          ...generatedOptions,
          color: chartSpecificOptions[selectedChart].colorBy
            ? {
                legend: true,
                tickFormat: (d) => d,
              }
            : {
                ...generatedOptions.color,
                scheme: undefined,
                domain: colorDomain,
                range: colorRange,
              },
        }),
      );
    } else {
      container.appendChild(Plot.plot(generatedOptions));
    }

    const xAxisCtr = container.querySelector(
      "[aria-label^='x-axis tick label'], [aria-label^='fx-axis tick label']",
    );
    const yAxisCtr = container.querySelector(
      "[aria-label^='y-axis tick label']",
    );
    const xAxisLabelCtr = container.querySelector(
      "[aria-label^='x-axis label'], [aria-label^='fx-axis label']",
    );
    const yAxisLabelCtr = container.querySelector(
      "[aria-label^='y-axis label']",
    );

    let paddingBottom = 0;
    let paddingLeft = 0;

    if (xAxisCtr) {
      try {
        const ctrBottom = container.getBoundingClientRect().bottom;
        const xAxisBottom = xAxisCtr.getBoundingClientRect().bottom;
        let padding = xAxisBottom - ctrBottom + 20;
        padding = padding > 0 ? padding : 0;
        paddingBottom = padding;

        if (xAxisLabelCtr) {
          const transform = xAxisLabelCtr.getAttribute("transform");
          const [x, y] = transform
            .split("(")[1]
            .slice(0, -1)
            .split(",")
            .map((val) => parseFloat(val));
          const newY = y + padding;
          xAxisLabelCtr.setAttribute("transform", `translate(${x}, ${newY})`);
        }
      } catch (e) {
        // silently fail
      }
    }

    if (yAxisCtr) {
      try {
        const ctrLeft = container.getBoundingClientRect().left;
        const yAxisLeft = yAxisCtr.getBoundingClientRect().left;
        let padding = yAxisLeft - ctrLeft - 20;
        paddingLeft = padding < 0 ? Math.abs(padding) : 0;

        if (yAxisLabelCtr) {
          const transform = yAxisLabelCtr.getAttribute("transform");
          const [x, y] = transform
            .split("(")[1]
            .slice(0, -1)
            .split(",")
            .map((val) => parseFloat(val));

          const labelLeft = yAxisLabelCtr.getBoundingClientRect().left;
          let newX = x;
          if (labelLeft > yAxisLeft) {
            newX = x - (labelLeft - yAxisLeft) - 20;
          }
          yAxisLabelCtr.setAttribute("transform", `translate(${newX}, ${y})`);
        }
      } catch (e) {
        // silently fail
      }
    }

    const chart = container.children[0];
    if (chart) {
      chart.style.padding = `0 0 ${paddingBottom}px ${paddingLeft}px`;
    }
  } else {
    container.innerHTML = `<div class='flex items-center justify-center h-full w-full'>Please select X and Y axes to display the chart.</div>`;
  }

  if (generatedOptions) generatedOptions.wasSampled = wasSampled;
  return generatedOptions;
}
