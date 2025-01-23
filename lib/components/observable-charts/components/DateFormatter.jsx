import { useState, useRef, useEffect, useContext } from "react";
import { twMerge } from "tailwind-merge";
import { LucideChevronsUpDown, CircleHelp } from "lucide-react";
import { Popover } from "antd";
import { ChartManagerContext } from "../ChartManagerContext";

const formatMappings = {
  // Years
  YYYY: "%Y",
  YY: "%y",
  yyyy: "%Y",
  yy: "%y",

  // Months
  MMMM: "%B", // Full month name
  MMM: "%b", // Abbreviated month name
  MM: "%m", // 01-12
  M: "%-m", // 1-12

  // Days - ensure DD is handled before D
  DD: "%d", // 01-31
  D: "%-d", // 1-31

  // Hours
  HH: "%H", // 00-23
  H: "%-H", // 0-23
  hh: "%I", // 01-12
  h: "%-I", // 1-12

  // Minutes and Seconds
  mm: "%M",
  m: "%-M",
  ss: "%S",
  s: "%-S",

  // Time Period
  A: "%p", // AM/PM
  a: "%P", // am/pm
};

const convertToD3Format = (format) => {
  // Create a pattern that matches any of our format strings
  const pattern = new RegExp(
    Object.keys(formatMappings)
      .sort((a, b) => b.length - a.length) // Sort by length to handle longer patterns first
      .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) // Escape regex special chars
      .join("|"),
    "g"
  );

  return format.replace(pattern, (match) => formatMappings[match] || match);
};

const formatOptions = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "MMM DD, YYYY", label: "Month DD, YYYY" },
  { value: "MMMM DD, YYYY", label: "Full Month DD, YYYY" },
];
const FormatHelpContent = () => (
  <div className="">
    <div className="grid grid-cols-2 gap-4">
      {/* Year formats */}
      <div>
        <span className="block pl-1 text-xs font-medium text-gray-700">
          Years
        </span>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">YYYY</code> → 2024
        </div>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">YY</code> → 24
        </div>
      </div>

      {/* Month formats */}
      <div>
        <span className="block pl-1 text-xs font-medium text-gray-700">
          Months
        </span>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">MMMM</code> → March
        </div>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">MMM</code> → Mar
        </div>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">MM</code> → 03
        </div>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">M</code> → 3
        </div>
      </div>

      {/* Day formats */}
      <div>
        <span className="block pl-1 text-xs font-medium text-gray-700">
          Days
        </span>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">DD</code> → 05
        </div>
        <div className="text-xs">
          <code className="px-1 rounded bg-gray-50">D</code> → 5
        </div>
      </div>

      {/* Common Examples */}
      <div>
        <span className="block pl-1 text-xs font-medium text-gray-700">
          Examples
        </span>
        <div className="space-y-1">
          {formatOptions.slice(0, 2).map((opt, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <code className="px-1 rounded bg-gray-50">{opt.value}</code>
              <span className="text-gray-500">{opt.example}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="pt-2 mt-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Combine patterns with any separators (-, /, space)
      </p>
    </div>
  </div>
);

const D3DateFormatBuilder = () => {
  const chartManager = useContext(ChartManagerContext);
  const { chartStyle } = chartManager.config;
  const [isOpen, setIsOpen] = useState(false);
  const [userFormat, setUserFormat] = useState(
    formatOptions.find(
      (opt) => convertToD3Format(opt.value) === chartStyle.dateFormat
    )?.value || "YYYY-MM-DD"
  );
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleFormatChange = (e) => {
    const newFormat = e.target.value;
    setUserFormat(newFormat);
    chartManager
      .updateChartStyle({ dateFormat: convertToD3Format(newFormat) })
      .render();
  };

  const handleOptionClick = (format) => {
    setUserFormat(format);
    chartManager
      .updateChartStyle({ dateFormat: convertToD3Format(format) })
      .render();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="font-sans w-full max-w-[300px] relative">
      <label className="block mb-1 input-label">Date Format</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={userFormat}
          onChange={handleFormatChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Enter format (e.g., YYYY-MM-DD)"
          className={twMerge(
            "focus:outline-none block w-full shadow-sm rounded-md border-0 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-1 focus:ring-inset",
            "text-[16px] lg:text-sm sm:leading-6"
          )}
        />
        <div className="flex gap-8 right-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="-ml-10 cursor-pointer"
          >
            <LucideChevronsUpDown size={18} />
          </button>
        </div>
        <Popover
          content={<FormatHelpContent />}
          title="Writing Date Formats"
          trigger="click"
          placement="bottomRight"
        >
          <button className="cursor-pointer">
            <CircleHelp size={18} />
          </button>
        </Popover>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md z-10 max-w-[90%]"
        >
          {formatOptions.map((option) => (
            <div
              key={option.value}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default D3DateFormatBuilder;
