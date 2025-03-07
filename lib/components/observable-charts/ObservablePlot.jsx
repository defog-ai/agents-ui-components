import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";

import { Button } from "@ui-components";
import { Download } from "lucide-react";
import { ChartManagerContext } from "./ChartManagerContext";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
dayjs.extend(minMax);

import { KeyboardShortcutIndicator } from "../core-ui/KeyboardShortcutIndicator";
import { KEYMAP, matchesKey } from "../../constants/keymap";
import { ChartExportModal } from "./components/ChartExportModal";
import { renderPlot } from "./utils/renderPlot";

export default function ObservablePlot() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    if (!containerRef.current) return;
    return renderPlot(containerRef.current, dimensions, chartManager);
  }, [chartManager.config, dimensions]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (document.activeElement === document.body) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
          return;
        }
        if (matchesKey(e.key, KEYMAP.SAVE_CHART)) {
          setIsExportModalOpen(true);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="mr-4 grow">
      <div className="flex justify-end gap-2 mb-2">
        {observableOptions && observableOptions?.wasSampled && (
          <div className="text-sm text-gray-500">
            * Data has been sampled for better visualization
          </div>
        )}
        <Button
          onClick={() => setIsExportModalOpen(true)}
          variant="ghost"
          className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-gray-200/50 
                bg-white/95 hover:bg-gray-50/95 dark:bg-gray-800/95 dark:hover:bg-gray-700/95 
                shadow-sm backdrop-blur-sm transition-all duration-200 
                dark:border-gray-700/50 dark:hover:border-gray-600/50
                hover:shadow-md hover:-translate-y-0.5
                group"
          title={`Download chart as PNG (${KEYMAP.SAVE_CHART})`}
        >
          <Download size={16} className="mr-1" />
          <span className="mr-1 whitespace-nowrap">Save as PNG</span>
          <KeyboardShortcutIndicator
            keyValue={KEYMAP.SAVE_CHART}
            className="opacity-50 group-hover:opacity-100 transition-opacity ml-1 !py-0.5 !px-1.5"
          />
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full mx-6 border-gray-200 observable-plot h-[500px] overflow-visible observable-plot"
      >
        {/* Chart will be rendered here */}
      </div>

      <ChartExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sourceChartRef={containerRef}
      />
    </div>
  );
}
