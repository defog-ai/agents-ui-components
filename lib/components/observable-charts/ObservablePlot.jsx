import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import * as Plot from "@observablehq/plot";
import {
  defaultOptions,
  getColorScheme,
  getObservableOptions,
} from "./plotUtils.ts";
import { saveAsPNG } from "./utils/saveChart";
import { Button } from "@ui-components";
import { Download } from "lucide-react";
import { ChartManagerContext } from "./ChartManagerContext";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
dayjs.extend(minMax);
import { convertWideToLong } from "../utils/utils";

export default function ObservablePlot() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const chartManager = useContext(ChartManagerContext);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions((prev) =>
        width !== prev.width || height !== prev.height
          ? { width, height }
          : prev
      );
    }
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updateDimensions();
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  const observableOptions = useMemo(() => {
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

    const xColumn = availableColumns.find(
      (col) => col.key === selectedColumns.x
    );

    // if x column is date, then get the range of x column
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

    // if selected.x or selected.y is null, return null here
    // or if selectedColumns.y.length is 0, also return null
    if (
      // if x is null
      !selectedColumns.x ||
      // if y is null
      !selectedColumns.y ||
      // if y is array but has length 0
      (Array.isArray(selectedColumns.y) && !selectedColumns?.y?.length)
    ) {
      generatedOptions = null;
    } else {
      let processedData = data;

      // also do this for colorBy column
      const colorByColumn = availableColumns.find(
        (col) => col.key === chartSpecificOptions[selectedChart].colorBy
      );

      if (selectedChart === "bar" || selectedChart === "line") {
        try {
          processedData = convertWideToLong(
            processedData,
            selectedColumns.x,
            selectedColumns.y,
            chartSpecificOptions[selectedChart].colorBy
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
          availableColumns
        );
      } else if (selectedChart === "bar") {
        generatedOptions = getObservableOptions(
          dimensions,
          {
            ...defaultOptions,
            type: selectedChart,
            // we do this only if an x column and some y columns are selected
            x: selectedColumns.x && selectedColumns?.y?.length && "label",
            // check to ensure we don't render a blank chart if no axis is selected
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
          availableColumns
        );
      } else if (selectedChart == "line") {
        const processedDataForLine = convertWideToLong(
          processedData,
          selectedColumns.x,
          selectedColumns.y,
          chartSpecificOptions[selectedChart].colorBy,
          colorByColumn?.isDate,
          selectedColumns.facet
        );

        generatedOptions = getObservableOptions(
          dimensions,
          {
            ...defaultOptions,
            type: selectedChart,
            x: selectedColumns.x || null,
            // check to ensure we don't render a blank chart if no axis is selected
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
          availableColumns
        );
      }
    }

    if (!containerRef.current) return;

    if (generatedOptions) {
      containerRef.current.innerHTML = "";
      // always reset the padding or it messes with boundclient calculation below
      containerRef.current.style.padding = "0 0 0 0";

      if (chartManager.config.selectedChart === "bar") {
        // we will create a custom scale
        // and use (if specified) options.lineOptions
        const { colorScheme } = getColorScheme(
          chartManager.config.chartStyle.selectedScheme
        );

        const colorDomain = chartManager.config.selectedColumns.y;
        const barOptions =
          chartManager.config?.chartSpecificOptions?.["bar"]?.barOptions || {};

        let schemeIdx = -1;

        const colorRange = colorDomain.map((col) => {
          // if options.barOptions[d["label"]] exists, use that
          if (barOptions[col] && barOptions[col].fill) {
            return barOptions[col].fill;
          } else {
            // else use the scheme
            // or the interpolator, depending on whether it's a function or array
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
                tickFormat: (d) => {
                  return d;
                },
              }
            : {
                ...generatedOptions.color,
                // override the scheme
                scheme: undefined,
                domain: colorDomain,
                range: colorRange,
              },
          fx: {
            grid: false,
            tickRotate: -45,
            tickFormat: (d) => {
              if (xColumn?.isDate) {
                // if date, format it
                // convert from unix to date
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

        containerRef.current.appendChild(Plot.plot(finalOptions));
      } else if (chartManager.config.selectedChart === "line") {
        // we will create a custom scale
        // and use (if specified) options.lineOptions
        const { colorScheme } = getColorScheme(
          chartManager.config.chartStyle.selectedScheme
        );

        const colorDomain = chartManager.config.selectedColumns.y;
        const lineOptions =
          chartManager.config?.chartSpecificOptions?.["line"]?.lineOptions ||
          {};

        let schemeIdx = -1;

        const colorRange = colorDomain.map((col) => {
          // if options.lineOptions[d["label"]] exists, use that
          if (lineOptions[col] && lineOptions[col].stroke) {
            return lineOptions[col].stroke;
          } else {
            // else use the scheme
            // or the interpolator, depending on whether it's a function or array
            return Array.isArray(colorScheme)
              ? colorScheme[++schemeIdx % colorScheme.length]
              : colorScheme(schemeIdx / colorDomain.length);
          }
        });

        containerRef.current.appendChild(
          Plot.plot({
            ...generatedOptions,
            color: chartSpecificOptions[selectedChart].colorBy
              ? {
                  legend: true,
                  tickFormat: (d) => {
                    return d;
                  },
                }
              : {
                  ...generatedOptions.color,
                  // override the scheme
                  scheme: undefined,
                  domain: colorDomain,
                  range: colorRange,
                },
          })
        );
      } else {
        // if chart is not a bar chart
        containerRef.current.appendChild(
          Plot.plot({
            ...generatedOptions,
          })
        );
      }

      /**
       * Now that we have added rotation to the ticks, some of them might overflow the bottom of the svg and get cut off if they are too long.
       * Observable will not handle this on it's own so
       * The below code handles those ticks, and adds the required amount of padding to the container to make the ticks visible
       * We don't directly increase the height of the svg because Observable will react to it and goes into an infinite loop.
       */

      // get the x axis
      // if bar chart, it will be fx-axis
      const xAxisCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis tick label'], [aria-label^='fx-axis tick label']"
      );

      // get the y axis
      const yAxisCtr = containerRef.current.querySelector(
        "[aria-label^='y-axis tick label']"
      );

      // the svg <g> element that stores the x axis labels
      // we will later move this down
      const xAxisLabelCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis label'], [aria-label^='fx-axis label']"
      );

      // the svg <g> element that stores the y axis labels
      // we will later move this left
      const yAxisLabelCtr = containerRef.current.querySelector(
        "[aria-label^='y-axis label']"
      );

      let paddingBottom = 0;
      let paddingLeft = 0;

      if (xAxisCtr) {
        try {
          // get the bottom of the container
          const ctrBottom = containerRef.current.getBoundingClientRect().bottom;
          // get the bottom of the x axis (this is the bottom of the ticks + label)
          const xAxisBottom = xAxisCtr.getBoundingClientRect().bottom;
          // if the xAxisBottom is more than ctrBottom, means the ticks are overflowing
          // add the difference in height to the container as padding-bottom

          // the +20 here is because we will also forcefully move the x axis *label* to below the ticks
          let padding = xAxisBottom - ctrBottom + 20;
          padding = padding > 0 ? padding : 0;

          paddingBottom = padding;

          if (xAxisLabelCtr) {
            // parse the transform of this g tag
            const transform = xAxisLabelCtr.getAttribute("transform");
            const [x, y] = transform
              .split("(")[1]
              .slice(0, -1)
              .split(",")
              .map((val) => parseFloat(val));

            // add the padding to the y position. this will move it down in the svg
            const newY = y + padding;
            xAxisLabelCtr.setAttribute("transform", `translate(${x}, ${newY})`);
          }
        } catch (e) {
          // silently fail
        }
      }
      if (yAxisCtr) {
        try {
          // get the left edge of the container
          const ctrLeft = containerRef.current.getBoundingClientRect().left;
          // get the left edge of the y axis (this is the left of the ticks + label)
          const yAxisLeft = yAxisCtr.getBoundingClientRect().left;

          // if the yAxisLeft is more than ctrLeft, means the ticks are overflowing
          // add the difference in x position to the container as padding-left
          // 20 here because we will move the y axis *label* to the left of the ticks
          let padding = yAxisLeft - ctrLeft - 20;

          // negative padding = y axis is to the left of the ctr
          // keep if negative padding
          paddingLeft = padding < 0 ? Math.abs(padding) : 0;

          if (yAxisLabelCtr) {
            // this is really only relevant in a horizontal box plot. in all other charts the y axis label is at the top of the axis
            // parse the transform of this g tag
            const transform = yAxisLabelCtr.getAttribute("transform");
            const [x, y] = transform
              .split("(")[1]
              .slice(0, -1)
              .split(",")
              .map((val) => parseFloat(val));

            // get the left of this relative to the y axis and move to the left if it's overlapping
            const labelLeft = yAxisLabelCtr.getBoundingClientRect().left;
            // if the labelLeft is more than yAxisLeft, means the label is overflowing and is "overlapping" the y ticks
            let newX = x;
            if (labelLeft > yAxisLeft) {
              newX = x - (labelLeft - yAxisLeft) - 20;
            }

            // // add the padding to the x position. this will move it in the svg
            // const newX = x + (yAxisLeft - ctrLeft - 20);

            yAxisLabelCtr.setAttribute("transform", `translate(${newX}, ${y})`);
          }
        } catch (e) {
          // silently fail
        }
      }

      // get the first child of the container, and set the padding to the actual chart
      const chart = containerRef.current.children[0];
      if (chart) {
        chart.style.padding = `0 0 ${paddingBottom}px ${paddingLeft}px`;
      }
    } else {
      const errorMessage = "Please select X and Y axes to display the chart.";
      containerRef.current.innerHTML = `<div class='flex items-center justify-center h-full w-full'>${errorMessage}</div>`;
    }

    if (generatedOptions) generatedOptions.wasSampled = wasSampled;
    return generatedOptions;
  }, [chartManager.config, dimensions]);

  return (
    <div className="grow">
      <div className="flex justify-end mb-2 ">
        {observableOptions && observableOptions?.wasSampled && (
          <div className="text-sm text-gray-500">
            * Data has been sampled for better visualization
          </div>
        )}
        <Button
          onClick={() => saveAsPNG(containerRef.current)}
          variant="ghost"
          className="ml-2"
          title="Download as PNG"
        >
          <Download size={16} className="mr-1" /> Save as PNG
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full mx-6  border-gray-200 observable-plot h-[500px] overflow-visible observable-plot"
      >
        {/* Chart will be rendered here */}
      </div>
    </div>
  );
}
