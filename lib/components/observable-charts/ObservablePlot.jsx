import React, {
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
    // figure out both the data for the chart
    // process it if needed
    // and also create options for observable
    const {
      selectedChart,
      selectedColumns,
      chartStyle,
      chartSpecificOptions,
      availableColumns,
      data,
    } = chartState;

    // let processedData = Object.assign({}, data);
    let processedData = Array.isArray(data) ? [...data] : [data];
    const xColumn = availableColumns.find(
      (col) => col.key === selectedColumns.x
    );

    const dateToUnix = xColumn?.isDate ? xColumn.dateToUnix : null;

    if (
      selectedChart === "bar" &&
      chartSpecificOptions[selectedChart].useCount
    ) {
      processedData = Object.entries(
        data.reduce((acc, item) => {
          const key = item[selectedColumns.x];
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([key, count]) => ({ [selectedColumns.x]: key, count }));
    }

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
        xLabel: chartStyle.xLabel || selectedColumns.x || "X Axis",
        yLabel: chartStyle.yLabel || selectedColumns.y || "Y Axis",
        facet: selectedColumns.facet,
        fill: selectedColumns.fill,
        filter: selectedColumns.filter,
        stroke: selectedColumns.stroke,
        xIsDate: xColumn?.isDate,
        xKey: selectedColumns.x,
        yKey: selectedColumns.y,
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
      containerRef.current.appendChild(Plot.plot(observableOptions));
    } else {
      containerRef.current.innerHTML =
        "Please select X and Y axes to display the chart.";
    }
  }, [observableOptions]);

  return (
    <div className="flex-grow p-4 bg-white">
      <div className="flex justify-end mb-2">
        <Button
          className="flex flex-row items-center text-sm text-gray-800 border bg-gray-50 hover:bg-gray-200"
          onClick={() => {
            if (containerRef.current)
              saveAsPNG(
                containerRef.current,
                observableOptions.backgroundColor
              );
          }}
        >
          <Download size={16} className="mr-2" /> Save as PNG
        </Button>
      </div>
      <div style={{ width: "100%", height: "460px" }}>
        <div
          className="w-full h-full bg-white observable-plot flex items-center justify-center text-gray-500"
          ref={containerRef}
        ></div>
      </div>
    </div>
  );
}
