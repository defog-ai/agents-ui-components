import { ChartLine, ChartColumnIncreasing, ChartScatter } from "lucide-react";

// Define available chart types and their labels/icons
const CHART_TYPES = [
  { value: "line", label: "Line", Icon: ChartLine },
  { value: "bar", label: "Bar", Icon: ChartColumnIncreasing },
  { value: "scatter", label: "Scatter", Icon: ChartScatter },
];

export default function ChartTypeSelector({
  selectedChart,
  onChartChange,
  hiddenCharts = [],
}) {
  // Filter out any hidden charts
  const availableChartTypes = CHART_TYPES.filter(
    (ct) => !hiddenCharts.includes(ct.value),
  );
  return (
    <div>
      <h3 className="mb-2 font-bold input-label">Chart Type</h3>
      {/* create clickable icons for each chart type, do not use radio or checkbox. just tailwind and divs */}
      <div className="flex flex-wrap gap-2">
        {availableChartTypes.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => onChartChange(value)}
            className={`
                dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 
                hover:text-gray-800 dark:hover:text-gray-100 active:text-gray-800 dark:active:text-gray-100 
                agui-item agui-btn flex-row gap-1 active:brightness-[90%] p-2 rounded-sm min-w-20 border-[1px] 
                flex items-center justify-center font-semibold transition-colors duration-200 text-[11px] 
                font-sans ease-in-out
                ${
                  selectedChart === value
                    ? "bg-blue-500/95 text-white border-0 shadow-sm hover:bg-blue-600"
                    : " bg-blue-100 text-blue-600/50 border-blue-200 hover:bg-blue-300"
                }
              `}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
