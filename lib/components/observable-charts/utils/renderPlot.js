import * as Plot from "@observablehq/plot";
import {
  getColorScheme,
  getObservableOptions,
  defaultOptions,
} from "../plotUtils";
import { convertWideToLong } from "@utils/utils";
import dayjs from "dayjs";
// Use ISO parsing to ignore timezone
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

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
    // Parse dates without timezone by using UTC mode to avoid local timezone adjustments
    const minDate = dayjs.min(data.map((d) => dayjs.utc(d[xColumn.key])));
    const maxDate = dayjs.max(data.map((d) => dayjs.utc(d[xColumn.key])));
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

    // For bar charts, convert to long format here
    if (selectedChart === "bar") {
      try {
        // Ensure filter is a function or null before processing
        if (chartSpecificOptions[selectedChart]?.filter && 
            typeof chartSpecificOptions[selectedChart].filter !== 'function') {
          console.warn('Invalid filter option detected, removing:', chartSpecificOptions[selectedChart].filter);
          chartSpecificOptions[selectedChart].filter = null;
        }
        
        processedData = convertWideToLong(
          processedData,
          selectedColumns.x,
          selectedColumns.y,
          chartSpecificOptions[selectedChart].colorBy,
          chartSpecificOptions[selectedChart].colorByIsDate,
          selectedColumns.facet,
        );
      } catch (e) {
        console.error("Error converting wide to long format for bar chart", e);
      }
    }

    // Check for invalid filter option across all chart types
    if (chartSpecificOptions[selectedChart]?.filter && 
        typeof chartSpecificOptions[selectedChart].filter !== 'function') {
      console.warn('Invalid filter option detected, removing:', chartSpecificOptions[selectedChart].filter);
      chartSpecificOptions[selectedChart].filter = null;
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
      // For line charts, convert to long format here (not before)
      const processedDataForLine = convertWideToLong(
        data, // Use original data, not processedData which might have been converted already
        selectedColumns.x,
        selectedColumns.y,
        chartSpecificOptions[selectedChart].colorBy,
        colorByColumn?.isDate,
        selectedColumns.facet,
      );

      // Check for invalid filter option for line charts
      if (chartSpecificOptions[selectedChart]?.filter && 
          typeof chartSpecificOptions[selectedChart].filter !== 'function') {
        console.warn('Invalid filter option detected for line chart, removing:', chartSpecificOptions[selectedChart].filter);
        chartSpecificOptions[selectedChart].filter = null;
      }

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

  // Return early with a helpful message if data is empty or columns aren't selected
  if (!data || data.length === 0) {
    container.innerHTML = `<div class='flex items-center justify-center h-full w-full text-gray-500 dark:text-gray-400 flex-col'>
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">No data to display</span>
      </div>
      <p class="text-xs text-center max-w-sm">
        Please ensure data is available for visualization
      </p>
    </div>`;
    return null;
  }

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
            let formattedLabel;
            
            if (xColumn?.isDate) {
              // Use UTC mode to ensure consistent date formatting without timezone consideration
              const date = dayjs.utc(d);
              if (xColumn.rangeToShow === "year") {
                formattedLabel = date.format("YYYY");
              } else if (xColumn.rangeToShow === "month") {
                formattedLabel = date.format("MMM YYYY");
              } else {
                formattedLabel = date.format("MMM DD");
              }
            } else {
              formattedLabel = String(d);
            }
            
            // Truncate long labels with ellipsis to prevent overflow
            if (formattedLabel && formattedLabel.length > 18) {
              return formattedLabel.substring(0, 15) + '...';
            }
            
            return formattedLabel;
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
    container.innerHTML = `<div class='flex items-center justify-center h-full w-full text-gray-500 dark:text-gray-400 flex-col'>
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <span class="text-sm font-medium">Select axes to display chart</span>
      </div>
      <p class="text-xs text-center max-w-sm">
        Please select both X and Y axes from the options panel to generate a visualization.
      </p>
    </div>`;
  }

  if (generatedOptions) generatedOptions.wasSampled = wasSampled;
  return generatedOptions;
}
