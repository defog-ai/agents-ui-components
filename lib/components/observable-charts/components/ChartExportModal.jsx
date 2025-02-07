import { useState, useRef, useEffect } from "react";
import { Modal, Input } from "@ui-components";
import { saveAsPNG } from "../utils/saveChart";
import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";
import { Download } from "lucide-react";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
import { renderPlot } from "../utils/renderPlot";
dayjs.extend(minMax);

const PRESETS = [
  { label: "Square (800×800)", width: 800, height: 800 },
  { label: "Rectangle (1280×600)", width: 1280, height: 600 },
];

const MIN_DIMENSION = 100;
const DEFAULT_SIZE = 800;

/**
 * Modal component for exporting charts with custom dimensions
 */
export function ChartExportModal({ isOpen, onClose, className = "" }) {
  const [dimensions, setDimensions] = useState({
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
  });
  const containerRef = useRef(null);
  const widthInputRef = useRef(null);
  const chartManager = useContext(ChartManagerContext);

  useEffect(() => {
    if (isOpen && widthInputRef.current) {
      widthInputRef.current.focus();
    }
  }, [isOpen]);

  // Combined effect for rendering
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    renderPlot(containerRef.current, dimensions, chartManager);
  }, [isOpen, dimensions]);

  const handleDimensionChange = (dimension, value) => {
    const numValue = parseInt(value) || MIN_DIMENSION;
    setDimensions((prev) => ({
      ...prev,
      [dimension]: Math.max(numValue, MIN_DIMENSION),
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    handleDimensionChange("width", dimensions.width);
    handleDimensionChange("height", dimensions.height);
  }, [isOpen]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      className={className}
      contentClassNames="max-w-5xl w-fit"
      footer={false}
      rootClassNames="z-[10000] flex flex-col gap-4 justify-center"
      title="Export Chart"
    >
      <div className="flex flex-col gap-6">
        {/* Dimension Controls */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <span className="flex items-center gap-2">Chart Dimensions</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  ref={widthInputRef}
                  type="number"
                  placeholder="Width"
                  value={dimensions.width}
                  onChange={(e) =>
                    handleDimensionChange("width", e.target.value)
                  }
                  min={MIN_DIMENSION}
                  inputClassNames="w-24 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-400"
                />
                <span className="text-sm font-medium text-gray-400">×</span>
                <Input
                  type="number"
                  placeholder="Height"
                  value={dimensions.height}
                  onChange={(e) =>
                    handleDimensionChange("height", e.target.value)
                  }
                  min={MIN_DIMENSION}
                  inputClassNames="w-24 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() =>
                      setDimensions({
                        width: preset.width,
                        height: preset.height,
                      })
                    }
                    className="px-3 py-1.5 rounded-md text-sm transition-all duration-200 
                    bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300
                    shadow-sm hover:shadow backdrop-blur-sm
                    hover:-translate-y-0.5"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Preview */}
        <div className="relative w-full bg-white border rounded-lg shadow-sm">
          <div className="max-h-[600px] overflow-auto rounded-lg">
            <div className="p-[40px] bg-white">
              <div
                ref={containerRef}
                className="relative bg-white"
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                  minWidth: MIN_DIMENSION,
                  minHeight: MIN_DIMENSION,
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              saveAsPNG(containerRef.current);
            }}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 
            rounded-md hover:bg-blue-700 transition-all duration-200 
            shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Download size={16} className="mr-2" />
            Download PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}
