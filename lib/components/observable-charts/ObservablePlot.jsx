import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import * as Plot from "@observablehq/plot";
import { defaultOptions, getObservableOptions } from "./plotUtils";
import { saveAsPNG } from "./utils/saveChart";
import { Button } from "@ui-components";
import { Download } from "lucide-react";
import { ChartStateContext } from "./ChartStateContext";

export default function ObservablePlot() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const chartState = useContext(ChartStateContext);

  const observableOptions = useMemo(() => {
    const {
      selectedChart,
      selectedColumns,
      chartStyle,
      chartSpecificOptions,
      availableColumns,
      data,
    } = chartState;

    const xColumn = availableColumns.find(
      (col) => col.key === selectedColumns.x
    );

    const dateToUnix = xColumn?.isDate ? xColumn.dateToUnix : null;

    let processedData = data;

    // Process dates if necessary
    if (xColumn?.isDate && dateToUnix) {
      processedData = data.map((item) => ({
        ...item,
        [selectedColumns.x]: dateToUnix(item[selectedColumns.x]),
      }));
    }

    return getObservableOptions(
      dimensions,
      {
        ...defaultOptions,
        type: selectedChart || "Bar",
        x: selectedColumns.x || null,
        y: selectedColumns.y || null,
        facet: selectedColumns.facet,
        filter: chartSpecificOptions[selectedChart]?.filter,

        xIsDate: xColumn?.isDate,
        dateToUnix,
        ...chartStyle,
        ...chartSpecificOptions[selectedChart],
      },
      processedData
    );
  }, [dimensions, chartState]);

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

  useEffect(() => {
    if (!containerRef.current) return;

    if (observableOptions) {
      containerRef.current.innerHTML = "";
      // always reset the padding bottom or it messes with boundclient calculation below
      containerRef.current.style.paddingBottom = 0;

      // append the chart
      containerRef.current.appendChild(
        Plot.plot({
          ...observableOptions,
        })
      );

      /**
       * Now that we have added rotation to the ticks, some of them might overflow the bottom of the svg and get cut off if they are too long.
       * Observable will not handle this on it's own so
       * The below code handles those ticks, and adds the required amount of padding to the container to make the ticks visible
       * We don't directly increase the height of the svg because Observable will react to it and goes into an infinite loop.
       */

      // get the bottom of the container
      const ctrBottom = containerRef.current.getBoundingClientRect().bottom;

      // get the x axis
      const xAxisCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis tick label']"
      );
      if (!xAxisCtr) return;

      // get the bottom of the x axis (this is the bottom of the ticks + label)
      const xAxisBottom = xAxisCtr.getBoundingClientRect().bottom;

      // the svg <g> element that stores the labels
      // we will later move this down
      const xAxisLabelCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis label']"
      );

      if (!xAxisLabelCtr) return;

      if (ctrBottom && xAxisBottom) {
        try {
          // if the xAxisBottom is more than ctrBottom, means the ticks are overflowing
          // add the difference in height to the container as padding-bottom

          // the +20 here is because we will also forcefully move the x axis *label* to below the ticks
          let padding = xAxisBottom - ctrBottom + 20;
          padding = padding > 0 ? padding : 0;

          containerRef.current.style.paddingBottom = `${padding}px`;

          if (xAxisLabelCtr) {
            // parse the transform of this g tag
            const transform = xAxisLabelCtr.getAttribute("transform");
            const [x, y] = transform
              .split("(")[1]
              .slice(0, -1)
              .split(",")
              .map((val) => parseFloat(val));

            // add the padding to the y. this will move it down in the svg
            const newY = y + padding;
            xAxisLabelCtr.setAttribute("transform", `translate(${x}, ${newY})`);
          }
        } catch (e) {
          // silently fail
        }
      }
    } else {
      containerRef.current.innerHTML =
        "<div class='flex items-center justify-center h-full w-full'>Please select X and Y axes to display the chart.</div>";
    }
  }, [observableOptions]);

  return (
    <div className="grow bg-white">
      <div className="flex justify-end mb-2">
        <Button
          className="flex flex-row items-center text-sm text-gray-800 border bg-gray-50 hover:bg-gray-200 z-[10]"
          onClick={() => {
            if (containerRef.current) {
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
