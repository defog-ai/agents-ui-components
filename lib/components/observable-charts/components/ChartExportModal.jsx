import { useState, useRef, useEffect } from "react";
import { Modal } from "@ui-components";
import { saveAsPNG } from "../utils/saveChart";

const ASPECT_RATIOS = [
  { label: "1:1 (Square)", width: 1, height: 1 },
  { label: "16:9 (Widescreen)", width: 16, height: 9 },
  { label: "4:3 (Standard)", width: 4, height: 3 },
  { label: "3:2 (Photo)", width: 3, height: 2 },
  { label: "2:1 (Panorama)", width: 2, height: 1 },
];

/**
 * Modal component for exporting charts with different aspect ratios
 */
export function ChartExportModal({
  isOpen,
  onClose,
  className = "",
  sourceChartRef, // Reference to the original chart container
}) {
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions when container size or aspect ratio changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate dimensions maintaining aspect ratio and fitting within container
      const maxWidth = containerWidth - 40; // Account for padding
      const maxHeight = containerHeight - 40;

      const ratioWidth = selectedRatio.width;
      const ratioHeight = selectedRatio.height;

      let width = maxWidth;
      let height = width * (ratioHeight / ratioWidth);

      // If height exceeds container, scale down
      if (height > maxHeight) {
        height = maxHeight;
        width = height * (ratioWidth / ratioHeight);
      }

      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, [selectedRatio]);

  // Clone and resize plot container when dimensions change
  useEffect(() => {
    if (
      !containerRef.current ||
      !dimensions.width ||
      !dimensions.height ||
      !sourceChartRef?.current
    )
      return;

    const container = containerRef.current;
    container.innerHTML = "";

    // Clone the original container with its plot
    const originalContainer = sourceChartRef.current;
    const clonedContainer = originalContainer.cloneNode(true);

    // Update the dimensions
    clonedContainer.style.width = `${dimensions.width}px`;
    clonedContainer.style.height = `${dimensions.height}px`;
    clonedContainer.style.margin = "0";
    clonedContainer.style.overflow = "hidden";

    // Append the cloned container
    container.appendChild(clonedContainer);
  }, [dimensions, sourceChartRef]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      className={className}
      contentClassNames="max-w-4xl"
      footer={false}
      rootClassNames="z-[10000]"
      title="Export Chart"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => setSelectedRatio(ratio)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedRatio === ratio
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
              } border`}
            >
              {ratio.label}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="flex items-center justify-center w-full h-[500px] border rounded-lg bg-white overflow-auto p-4"
        />

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
