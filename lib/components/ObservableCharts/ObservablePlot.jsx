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
import { defaultOptions, getMarks, saveAsPNG } from "./plotUtils";
import { utcFormat } from "d3";

export const ObservablePlot = forwardRef(({ data = [], options = {} }, ref) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const processedData = useMemo(() => {
    if (options.type === "bar" && options.useCount) {
      const counts = data.reduce((acc, item) => {
        const key = item[options.x];
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).map(([key, count]) => ({
        [options.x]: key,
        count: count,
      }));
    }
    return data;
  }, [data, options]);

  const mergedOptions = useMemo(() => {
    return { ...defaultOptions, ...options };
  }, [options]);

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
      setDimensions((prevDimensions) => {
        if (
          width !== prevDimensions.width ||
          height !== prevDimensions.height
        ) {
          return { width, height };
        }
        return prevDimensions;
      });
    }
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateDimensions);
    const currentRef = containerRef.current;

    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    updateDimensions();

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  const plotOptions = useMemo(() => {
    if (
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      !mergedOptions.x ||
      !mergedOptions.y
    ) {
      return null;
    }

    const baseOptions = {
      width: dimensions.width,
      height: dimensions.height,
      marginTop: 50,
      marginRight: 30,
      marginBottom: 50,
      marginLeft: 30,
      style: {
        backgroundColor: mergedOptions.backgroundColor,
        fontSize: `${mergedOptions.fontSize}px`,
        overflow: "visible",
      },
      y: {
        grid: mergedOptions.yGrid,
        nice: true,
        label: mergedOptions.useCount ? "Count" : mergedOptions.yLabel,
        labelOffset: 22,
        ticks: mergedOptions.yTicks,
      },
      x: {
        grid: mergedOptions.xGrid,
        nice: true,
        label: mergedOptions.xLabel,
        // type: mergedOptions.xIsDate ? "utc" : undefined,
        ticks: mergedOptions.xTicks,
        ...(mergedOptions.xIsDate && {
          tickFormat: utcFormat(mergedOptions.xDateFormat || "%b %d, %Y"),
        }),
      },
      color: {
        legend: true,
      },
      marks: getMarks(processedData, {
        ...mergedOptions,
        y: mergedOptions.useCount ? "count" : mergedOptions.y,
      }),
    };

    if (mergedOptions.facet) {
      baseOptions.facet = {
        data: processedData,
        x: mergedOptions.facet,
        marginRight: 30,
        label: null,
      };
    }
    return baseOptions;
  }, [mergedOptions, dimensions, processedData]);

  useEffect(() => {
    if (
      !containerRef.current ||
      !plotOptions ||
      !plotOptions.x ||
      !plotOptions.y
    ) {
      return;
    }

    containerRef.current.innerHTML = "";

    const plot = Plot.plot(plotOptions);
    containerRef.current.appendChild(plot);
  }, [plotOptions]);

  return (
    <div className="w-full h-full bg-white" ref={containerRef}>
      {(!mergedOptions.x || !mergedOptions.y) && (
        <div className="flex items-center justify-center h-full text-gray-500">
          Please select X and Y axes to display the chart.
        </div>
      )}
    </div>
  );
});

ObservablePlot.displayName = "ObservablePlot";

export default React.memo(ObservablePlot);
