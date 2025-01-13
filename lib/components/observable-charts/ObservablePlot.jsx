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
} from "./plotUtils";
import { saveAsPNG } from "./utils/saveChart";
import { Button } from "@ui-components";
import { Download } from "lucide-react";
import { ChartManagerContext } from "./ChartManagerContext";
import { unix } from "dayjs";
import dayjs from "dayjs";
import { convertWideToLong } from "../utils/utils";
import { timeFormat } from "d3";

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
    let uniqueLabels = new Set();
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
      const xColumnDateToUnix = xColumn?.isDate ? xColumn.dateToUnix : null;

      let processedData = data;

      // also do this for colorBy column
      const colorByColumn = availableColumns.find(
        (col) => col.key === chartSpecificOptions[selectedChart].colorBy
      );

      const colorByDateToUnix = colorByColumn
        ? colorByColumn?.isDate
          ? colorByColumn.dateToUnix
          : null
        : null;

      // Process dates if necessary
      if (xColumnDateToUnix || colorByDateToUnix) {
        processedData = [];

        for (let i = 0; i < data.length; i++) {
          // we already have unix dates pre-calculated and stored for every row. (look inside agentUitls.js in the reFormatData function)
          const item = data[i];
          processedData.push({
            ...item,
            ...(xColumnDateToUnix
              ? {
                  [selectedColumns.x]: xColumnDateToUnix
                    ? item.unixDateValues[selectedColumns.x]
                    : null,
                }
              : {}),
            ...(colorByDateToUnix
              ? {
                  [colorByColumn.dataIndex]: colorByDateToUnix
                    ? item.unixDateValues[colorByColumn.dataIndex]
                    : null,
                }
              : {}),
          });
        }
      }

      if (selectedChart === "bar" || selectedChart === "line") {
        try {
          processedData = convertWideToLong(
            processedData,
            selectedColumns.x,
            selectedColumns.y,
            chartSpecificOptions[selectedChart].colorBy
          );
          // if this has more than 50 unique values in the x axis, then will will not render the chart and ask to use line chart instead
          uniqueLabels = new Set(
            processedData.map((d) => d[selectedColumns.x])
          );
        } catch (e) {
          console.error("Error converting wide to long format", e);
        }
      }

      if (selectedChart !== "bar" && selectedChart !== "line") {
        // if we have more than 10k categories in the x axis, and this is a boxplot, sample 100 unique values
        let uniqueX = new Set(processedData.map((d) => d[selectedColumns.x]));

        if (selectedChart === "boxplot" && uniqueX.size > 10000) {
          wasSampled = true;
          const sampledLabels = new Set();
          const step = Math.floor(uniqueX.size / 200);
          let i = 0;
          for (const label of uniqueX) {
            if (i % step === 0) {
              sampledLabels.add(label);
            }
            i++;

            if (sampledLabels.size >= 200) {
              break;
            }
          }

          // filter processedData to only include the unique labels
          processedData = processedData.filter((d) =>
            sampledLabels.has(d[selectedColumns.x])
          );
        }

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
            xColumnDateToUnix,
            colorByDateToUnix,
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
            xColumnDateToUnix,
            colorByIsDate: colorByColumn?.isDate,
            colorByDateToUnix,
            ...chartStyle,
            ...chartSpecificOptions[selectedChart],
          },
          processedData,
          selectedColumns,
          availableColumns
        );
      } else if (selectedChart == "line") {
        generatedOptions = getObservableOptions(
          dimensions,
          {
            ...defaultOptions,
            type: selectedChart,
            x: selectedColumns.x || null,
            // check to ensure we don't render a blank chart if no axis is selected
            y: selectedColumns.x && selectedColumns.y.length ? "value" : null,
            stroke: "label",
            // disable facetting for line charts for now
            // facet: selectedColumns.facet || null,
            filter: chartSpecificOptions[selectedChart]?.filter,
            xIsDate: xColumn?.isDate,
            colorByIsDate: colorByColumn?.isDate,
            xColumnDateToUnix,
            colorByDateToUnix,
            ...chartStyle,
            ...chartSpecificOptions[selectedChart],
          },
          processedData,
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
                  if (
                    chartManager.config.chartSpecificOptions[selectedChart]
                      .colorByIsDate
                  ) {
                    // this is already coming in as a unix timestamp

                    return timeFormat(chartStyle.dateFormat)(unix(d));
                  } else {
                    return d;
                  }
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
                return date.format('MMM D, YYYY');
              } else {
                return d;
              }
            },
            axis: "bottom",
          },
          x: {
            axis: null,
            label: "",
          },
        };

        containerRef.current.appendChild(
          Plot.plot(finalOptions)
        );
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
                    if (
                      chartManager.config.chartSpecificOptions[selectedChart]
                        .colorByIsDate
                    ) {
                      return timeFormat(chartStyle.dateFormat)(unix(d));
                    } else {
                      return d;
                    }
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
    <div className="grow bg-white">
      <div className="flex justify-end mb-2">
        {observableOptions && observableOptions?.wasSampled && (
          <div className="text-sm self-start mr-auto text-rose-500">
            Chart was sampled to show 200 unique values
          </div>
        )}
        <Button
          className="flex flex-row items-center text-sm text-gray-800 border bg-gray-50 hover:bg-gray-200 z-[10]"
          onClick={() => {
            if (containerRef.current && observableOptions) {
              // get the first child inside container because container has overflow scroll
              const chart = containerRef.current.children[0];
              if (chart) {
                saveAsPNG(chart, observableOptions.backgroundColor);
              }
            }
          }}
        >
          <Download size={16} className="mr-2" /> Save as PNG
        </Button>
      </div>
      <div
        className="w-full h-[560px] text-gray-500 bg-white observable-plot overflow-auto"
        ref={containerRef}
      ></div>
    </div>
  );
}
