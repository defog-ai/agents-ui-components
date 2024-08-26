import { Dot } from "lucide-react";

const UnitPositionToggle = ({ position, onChange, value, onValueChange }) => {
  const togglePosition = () => {
    onChange(position === "prefix" ? "suffix" : "prefix");
  };

  return (
    <div className="flex items-center ">
      <button
        onClick={togglePosition}
        className={`p-1 rounded-l-md transition-colors duration-200 ${
          position === "prefix"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
        }`}
        aria-label={
          position === "prefix" ? "Unit as prefix" : "Change to prefix"
        }
      >
        <Dot size={16} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Enter unit"
        className="w-12 h-6 px-2 py-1 text-sm text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Unit label"
      />
      <button
        onClick={togglePosition}
        className={`p-1 rounded-r-md transition-colors duration-200 ${
          position === "suffix"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
        }`}
        aria-label={
          position === "suffix" ? "Unit as suffix" : "Change to suffix"
        }
      >
        <Dot className=" flip" size={16} />
      </button>
    </div>
  );
};

export default UnitPositionToggle;
