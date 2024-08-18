import {
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

export const ObservablePlot = forwardRef(({ data = [], options = {} }, ref) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const prevDimensionsRef = useRef({ width: 0, height: 0 });

  // Merge default options with user-provided options
  const mergedOptions = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [options]
  );

  // Expose saveAsPNG method to parent component
  useImperativeHandle(ref, () => ({
    saveAsPNG: () =>
      saveAsPNG(containerRef.current, mergedOptions.backgroundColor),
  }));

  // Update dimensions when container size changes
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const prevDimensions = prevDimensionsRef.current;

      if (width !== prevDimensions.width || height !== prevDimensions.height) {
        setDimensions({ width, height });
        prevDimensionsRef.current = { width, height };
      }
    }
  }, []);

  // Set up resize observer
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

  // Compute plot options based on current dimensions and merged options
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
        grid: true,
        nice: true,
        label: mergedOptions.yLabel,
        labelOffset: 22,
      },
      x: {
        nice: true,
        label: mergedOptions.xLabel,
      },
      color: {
        legend: true,
      },
      marks: getMarks(data, mergedOptions),
    };

    if (mergedOptions.facet) {
      baseOptions.facet = {
        data: data,
        x: mergedOptions.facet,
        marginRight: 50,
        label: null,
      };
    }

    return baseOptions;
  }, [data, mergedOptions, dimensions]);

  // Render the plot
  useEffect(() => {
    if (!containerRef.current || !plotOptions) {
      return;
    }

    containerRef.current.innerHTML = "";
    const plot = Plot.plot(plotOptions);
    containerRef.current.appendChild(plot);
  }, [plotOptions]);

  // Render component
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

export default ObservablePlot;
