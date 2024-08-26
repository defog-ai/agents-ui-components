import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import * as Plot from "@observablehq/plot";
import { defaultOptions, getPlotOptions } from "./plotUtils";
import { saveAsPNG } from "./utils/saveChart";
import { Button } from "@ui-components";
import { Download } from "lucide-react";

export const ObservablePlot = forwardRef(({ data = [], options = {} }) => {
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

  const handleSaveAsPNG = useCallback(() => {
    if (containerRef.current) {
      saveAsPNG(containerRef.current, mergedOptions.backgroundColor);
    }
  }, []);

  return (
    <div className="flex-grow p-4 bg-white">
      <div className="flex justify-end mb-2">
        <Button
          className="border bg-gray-50 hover:bg-gray-200 text-gray-800 text-sm flex flex-row items-center"
          onClick={handleSaveAsPNG}
        >
          <Download size={16} className="mr-2" /> Save as PNG
        </Button>
      </div>
      <div style={{ width: "100%", height: "460px" }}>
        <div
          className="w-full h-full bg-white observable-plot"
          ref={containerRef}
        >
          {(!mergedOptions.xKey || !mergedOptions.yKey) && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Please select X and Y axes to display the chart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ObservablePlot.displayName = "ObservablePlot";

export default React.memo(ObservablePlot);
