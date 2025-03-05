import React from "react";
import { twMerge } from "tailwind-merge";

/**
 * @typedef {Object} SkeletalLoaderProps
 * @property {string} [classNames=""] - Additional classes to be added to the skeleton div.
 * @property {string} [height="h-80"] - Height of the skeleton loader.
 * @property {string} [width="w-full"] - Width of the skeleton loader.
 * @property {boolean} [rounded=true] - Whether to apply rounded corners.
 * @property {boolean} [chart=false] - Whether to show a chart-like skeleton pattern.
 */

/**
 * Skeletal loader component that shows a shimmering animation for content placeholders.
 * @param {SkeletalLoaderProps} props
 */
export function SkeletalLoader({
  classNames = "",
  height = "h-96",
  width = "w-full",
  rounded = true,
  chart = false,
}) {
  if (chart) {
    return (
      <div
        className={twMerge(
          "flex items-end gap-2 p-4",
          height,
          width,
          classNames,
        )}
      >
        {[80, 45, 65, 30, 70, 50, 40].map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={twMerge(
              "flex-1 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-500",
              "animate-[pulse_1.0s_ease-in-out_infinite]",
              rounded && "rounded-t-md",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className={twMerge(
          "bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 dark:from-gray-600 dark:via-gray-400 dark:to-gray-600",
          "animate-[pulse_1.0s_ease-in-out_infinite]",
          rounded && "rounded-md",
          height,
          width,
          classNames,
        )}
      />
    </div>
  );
}
