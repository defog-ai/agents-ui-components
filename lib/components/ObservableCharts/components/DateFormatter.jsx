import { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { LucideChevronsUpDown, CircleHelp } from "lucide-react";
import { Popover } from "antd";
import { useChartContainer } from "../dashboardState";

const formatOptions = [
  { value: "%Y-%m-%d", label: "YYYY-MM-DD" },
  { value: "%d/%m/%Y", label: "DD/MM/YYYY" },
  { value: "%m/%d/%Y", label: "MM/DD/YYYY" },
  { value: "%B %d, %Y", label: "Month DD, YYYY" },
  { value: "%Y-%m-%dT%H:%M:%S", label: "ISO 8601" },
];

const formatHelp = {
  "%Y": "4-digit year",
  "%m": "2-digit month (01-12)",
  "%d": "2-digit day of the month (01-31)",
  "%B": "Full month name",
  "%H": "2-digit hour (24h)",
  "%I": "2-digit hour (12h)",
  "%M": "2-digit minutes",
  "%S": "2-digit seconds",
  "%p": "AM/PM",
};

const FormatHelpContent = () => (
  <div className="text-sm w-44">
    <ul className="space-y-1">
      {Object.entries(formatHelp).map(([key, value]) => (
        <li key={key} className="mb-1 text-xs">
          <code className="px-1 bg-gray-100 rounded">{key}</code>: {value}
        </li>
      ))}
    </ul>
    <p className="mt-2 text-xs text-gray-500 whitespace-normal ">
      Uppercase specifiers (e.g., %Y, %B) typically provide full values, while
      lowercase (e.g., %y, %b) often give abbreviated versions.
    </p>
  </div>
);

const D3DateFormatBuilder = () => {
  const { chartStyle, updateChartStyle } = useChartContainer();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleFormatChange = (e) => {
    updateChartStyle({ dateFormat: e.target.value });
  };

  const handleOptionClick = (value) => {
    updateChartStyle({ dateFormat: value });
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
          value={chartStyle.dateFormat}
          onChange={handleFormatChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or enter format"
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
          title="Format Help"
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
