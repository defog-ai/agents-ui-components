import { SourceItem } from "@oracle";
import { Check, Plus } from "lucide-react";

type SourceItemWithSelection = SourceItem & { selected: boolean };

export const SourceCard = ({
  source,
  onSelected,
}: {
  source: SourceItemWithSelection;
  onSelected: () => void;
}) => {
  return (
    <div
      className={`relative flex h-[79px] w-full items-center gap-2.5 rounded-lg border border-gray-200 dark:border-gray-700 px-1.5 py-1 hover:border-gray-50 dark:hover:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 ${
        source.selected
          ? "bg-gray-100 dark:bg-gray-700 "
          : "bg-white dark:bg-gray-800 opacity-70"
      }`}
    >
      {/* Icon and Text Wrapped in a Clickable <a> Tag that redirect to the source link*/}
      <a
        href={source.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 z-10"
        aria-label={`Visit ${source.title}`}
      >
        <span className="shrink-0">
          <img
            src={`https://www.google.com/s2/favicons?domain=${source.link}&sz=128`}
            alt={source.link}
            className="rounded-full p-1"
            width={36}
            height={36}
          />
        </span>
        <span className="flex min-w-0 max-w-[192px] flex-col justify-center gap-1">
          <h6 className="line-clamp-2 text-xs font-light">{source.title}</h6>
          <span className="truncate text-xs font-light text-[#1B1B16]/30 dark:text-gray-400">
            {source.link}
          </span>
        </span>
      </a>

      {/* Button for Selection */}
      <div
        className="ml-2 mr-2 cursor-pointer relative z-20"
        onClick={(e) => {
          e.stopPropagation(); // Prevent link click
          onSelected();
        }}
      >
        {source.selected ? (
          <Check className="w-3 text-green-500 dark:text-green-400" />
        ) : (
          <Plus className="w-3 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 stroke-2" />
        )}
      </div>
    </div>
  );
};
