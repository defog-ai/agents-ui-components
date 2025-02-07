import { useState, useRef, useEffect } from "react";
import { Modal, Input } from "@ui-components";
import { saveAsPNG } from "../utils/saveChart";

import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";

import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
import { renderPlot } from "../utils/renderPlot";
dayjs.extend(minMax);

const PRESETS = [
  { label: "Square (800×800)", width: 800, height: 800 },
  { label: "Rectangle (1280×600)", width: 1280, height: 600 },
];

const MIN_DIMENSION = 400;

/**
 * Modal component for exporting charts with custom dimensions
 */
export function ChartExportModal({ isOpen, onClose, className = "" }) {
  const [dimensions, setDimensions] = useState({
    width: PRESETS[0].width,
    height: PRESETS[0].height,
  });
  const containerRef = useRef(null);
  const chartManager = useContext(ChartManagerContext);

  // Render plot whenever dimensions change or modal opens
  useEffect(() => {
    if (!containerRef.current || !isOpen) return;
    renderPlot(containerRef.current, dimensions, chartManager);
  }, [dimensions, chartManager.config, isOpen]);

  const handleDimensionChange = (dimension, value) => {
    const numValue = parseInt(value) || MIN_DIMENSION;
    setDimensions((prev) => ({
      ...prev,
      [dimension]: Math.max(numValue, MIN_DIMENSION),
    }));
  };

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
      <div className="flex flex-col gap-4">
        {/* Dimension Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              label="Width"
              value={dimensions.width}
              onChange={(e) => handleDimensionChange("width", e.target.value)}
              min={MIN_DIMENSION}
              inputClassNames="w-24"
            />
            <span className="text-gray-400">×</span>
            <Input
              type="number"
              label="Height"
              value={dimensions.height}
              onChange={(e) => handleDimensionChange("height", e.target.value)}
              min={MIN_DIMENSION}
              inputClassNames="w-24"
            />
          </div>
          <div className="flex gap-2 ml-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  setDimensions({ width: preset.width, height: preset.height })
                }
                className="px-3 py-1.5 rounded-md text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Preview */}
        <div className="relative w-full bg-white border rounded-lg">
          <div className="max-h-[600px] overflow-auto">
            <div
              ref={containerRef}
              className="p-4"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                minWidth: MIN_DIMENSION,
                minHeight: MIN_DIMENSION,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              saveAsPNG(containerRef.current);
            }}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Download PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}
