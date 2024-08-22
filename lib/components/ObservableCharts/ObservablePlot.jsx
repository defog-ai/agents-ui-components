import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import * as Plot from "@observablehq/plot";
import { defaultOptions, saveAsPNG, getPlotOptions } from "./plotUtils";

export const ObservablePlot = forwardRef(({ data = [], options = {} }, ref) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const mergedOptions = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [options]
  );

  const processedData = useMemo(() => {
    if (mergedOptions.type === "bar" && mergedOptions.useCount) {
      return Object.entries(
        data.reduce((acc, item) => {
          const key = item[mergedOptions.xKey];
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([key, count]) => ({ [mergedOptions.xKey]: key, count }));
    }

    // Process dates if necessary
    if (mergedOptions.xIsDate && mergedOptions.dateToUnix) {
      return data.map((item) => ({
        ...item,
        [mergedOptions.xKey]: mergedOptions.dateToUnix(
          item[mergedOptions.xKey]
        ),
      }));
    }

    return data;
  }, [data, mergedOptions]);

  useImperativeHandle(
    ref,
    () => ({
      saveAsPNG: () =>
        saveAsPNG(containerRef.current, mergedOptions.backgroundColor),
    }),
    [mergedOptions.backgroundColor]
  );

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

  const plotOptions = useMemo(
    () => getPlotOptions(dimensions, mergedOptions, processedData),
    [dimensions, mergedOptions, processedData]
  );

  useEffect(() => {
    if (!containerRef.current || !plotOptions) return;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(Plot.plot(plotOptions));
  }, [plotOptions]);

  return (
    <div className="w-full h-full bg-white" ref={containerRef}>
      {(!mergedOptions.xKey || !mergedOptions.yKey) && (
        <div className="flex items-center justify-center h-full text-gray-500">
          Please select X and Y axes to display the chart.
        </div>
      )}
    </div>
  );
});

ObservablePlot.displayName = "ObservablePlot";

export default React.memo(ObservablePlot);
