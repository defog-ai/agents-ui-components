import { useState, useRef, useEffect } from "react";
import { Modal, Input } from "@ui-components";
import { saveAsPNG } from "../utils/saveChart";
import { useContext } from "react";
import { ChartManagerContext } from "../ChartManagerContext";
import { Download, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
import { renderPlot } from "../utils/renderPlot";
dayjs.extend(minMax);

const PRESETS = [
  {
    label: (
      <span>
        <span className="hidden md:inline">Square(</span> 800×800
        <span className="hidden md:inline">)</span>
      </span>
    ),
    width: 800,
    height: 800,
  },
  {
    label: (
      <span>
        <span className="hidden md:inline">Rectangle(</span> 1280×600
        <span className="hidden md:inline">)</span>
      </span>
    ),
    width: 1280,
    height: 600,
  },
];

const DEFAULT_SIZE = 800;

const buttonContent = {
  idle: (
    <div className="flex items-center animate-fade-up">
      <Download size={16} className="md:mr-2" />
      <span className="hidden md:block">Download PNG</span>
    </div>
  ),
  downloading: (
    <div className="flex items-center animate-fade-up">
      <Loader2 size={16} className="mr-2 animate-spin" />
      Downloading...
    </div>
  ),
  saved: (
    <div className="flex items-center animate-fade-up">
      <Download size={16} className="mr-2" />
      Saved
    </div>
  ),
};

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
  const [downloadState, setDownloadState] = useState("idle"); // "idle" | "downloading" | "saved"

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
    const numValue = parseInt(value) || 0;
    setDimensions((prev) => ({
      ...prev,
      [dimension]: numValue,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    handleDimensionChange("width", dimensions.width);
    handleDimensionChange("height", dimensions.height);
  }, [isOpen]);

  // Add reset timer function
  const resetDownloadState = () => {
    setTimeout(() => {
      setDownloadState("idle");
    }, 2000);
  };

  const handleDownload = async () => {
    try {
      await saveAsPNG(containerRef.current, dimensions);
      setDownloadState("saved");
      resetDownloadState();
    } catch (error) {
      setDownloadState("idle");
      console.error("Failed to download:", error);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      className={className}
      contentClassNames="[&_figure]:!p-0 max-w-fit"
      footer={false}
      rootClassNames="z-[10000] max-h-full"
      title="Export Chart"
    >
      {/* Dimension Controls */}
      <div className="pb-4 z-10">
        <div className="flex items-start md:items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Input
                ref={widthInputRef}
                type="number"
                placeholder="Width"
                value={dimensions.width}
                onChange={(e) => handleDimensionChange("width", e.target.value)}
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
          <button
            key={downloadState}
            onClick={() => {
              setDownloadState("downloading");
              handleDownload();
            }}
            disabled={downloadState !== "idle"}
            className="flex text-center justify-center items-center px-4 py-1.5 text-sm font-medium text-white bg-blue-600 
                rounded-md hover:bg-blue-700 transition-all duration-200 
                shadow-sm hover:shadow-md hover:-translate-y-0.5
                disabled:bg-blue-400 disabled:cursor-not-allowed disabled:hover:translate-y-0
                overflow-hidden"
          >
            {buttonContent[downloadState]}
          </button>
        </div>
      </div>

      {/* Chart Preview */}
      <div className="relative bg-white overflow-auto">
        <div
          ref={containerRef}
          className=""
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        />
      </div>
    </Modal>
  );
}
