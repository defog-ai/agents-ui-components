// slider with one or two heads
import React, { useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { range, bisectCenter } from "d3-array";
const d3Range = range;

/** # DO NOT USE. CURRENTLY BROKEN. */
export function RangeSlider({
  step = 1,
  range = [0, 10],
  onChange = (...args) => {},
  rootClassNames = "",
  vertical = false,
  trackClassNames = "",
  handleClassNames = "",
  ...props
}) {
  const [sliders, setSliders] = useState([
    // we will always keep the smaller value in this element
    {
      value: range[0],
      left: 0,
      top: 0,
    },
    // we will always keep the bigger value in this element
    {
      value: range[1],
      left: 1,
      top: 1,
    },
  ]);

  const ctr = useRef(null);

  const [ghostImage, setGhostImage] = useState(null);

  useEffect(() => {
    var img = document.createElement("img");
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    setGhostImage(img);
  }, []);

  const scale = useMemo(() => {
    const rangeMin = range[0];
    const rangeMax = range[1];

    const values = d3Range(rangeMin, rangeMax + step * 0.9, step);

    // we want the input to the scale ot be a number between 0 and 1 (left % of the mouse
    // and the output is a value from the above domain array
    const domain = d3Range(
      0,
      1 + 0.9 / (values.length - 1),
      1 / (values.length - 1)
    );

    const findClosest = (x) => {
      const closestIdx = bisectCenter(domain, x);
      return {
        value: values[closestIdx],
        left: domain[closestIdx],
        top: domain[closestIdx],
      };
    };

    // we will first divide the
    return findClosest;
  }, [range, step]);

  const trackStyles = useMemo(() => {
    const [leftSlider, rightSlider] = sliders;

    const minLeft = Math.min(leftSlider.left, rightSlider.left);
    const maxLeft = Math.max(leftSlider.left, rightSlider.left);
    const minTop = Math.min(leftSlider.top, rightSlider.top);
    const maxTop = Math.max(leftSlider.top, rightSlider.top);

    return vertical
      ? {
          height: Math.abs(maxTop - minTop) * 100 + "%",
          top: minTop * 100 + "%",
        }
      : {
          width: Math.abs(maxLeft - minLeft) * 100 + "%",
          left: minLeft * 100 + "%",
        };
  }, [sliders, vertical]);

  return (
    <div className="px-3">
      <div
        className={twMerge(
          "relative bg-white dark:bg-gray-800 flex justify-center items-center overflow-visible",
          vertical ? "w-8" : "h-8",
          rootClassNames
        )}
        ref={ctr}
      >
        <div
          className={twMerge(
            "absolute rounded-full bg-gray-100 dark:bg-gray-700",
            vertical ? "top-0 w-5 h-full" : "left-0 h-5 w-full"
          )}
        ></div>
        <div
          className={twMerge(
            "track bg-indigo-600 dark:bg-indigo-500 border dark:border-gray-600 rounded-full absolute hover:opacity-50 transition-all cursor-pointer",
            vertical ? "w-5" : "h-5"
          )}
          style={trackStyles}
          draggable
          onDrag={(e) => {
            if (!ctr.current || !e.clientX || !e.clientY) return;

            const rect = ctr.current.getBoundingClientRect();

            const [leftSlider, rightSlider] = sliders;

            let newLeftSlider, newRightSlider;

            if (!vertical) {
              const x = e.clientX - rect.left - 12;

              const leftRaw = x / rect.width;

              if (leftRaw < 0 || leftRaw > 1) return;

              newLeftSlider = scale(leftRaw);

              newRightSlider = scale(
                leftRaw + (rightSlider.left - leftSlider.left)
              );

              if (newLeftSlider.value === newRightSlider.value) return;

              setSliders([newLeftSlider, newRightSlider]);
            } else {
              const y = e.clientY - rect.top - 12;

              const topRaw = y / rect.height;

              if (topRaw < 0 || topRaw > 1) return;

              newLeftSlider = scale(topRaw);

              newRightSlider = scale(
                topRaw + (rightSlider.top - leftSlider.top)
              );

              if (newLeftSlider.value === newRightSlider.value) return;

              setSliders([newLeftSlider, newRightSlider]);
            }

            onChange(sliders.map((d) => d.value));
          }}
          // no drag image
          onDragStart={(e) => {
            e.dataTransfer.setDragImage(ghostImage, 0, 0);
          }}
        ></div>
        <div
          className={twMerge(
            "pointer-events-none absolute",
            vertical
              ? "h-full w-3 top-0 left-1/2 transform -translate-x-1/2"
              : "w-full h-3 left-0 top-1/2 transform -translate-y-1/2"
          )}
        >
          <div
            className={twMerge(
              "left-slider absolute rounded-full pointer-events-auto hover:scale-150 transition-all",
              vertical ? "h-0 w-3" : "w-0 h-3"
            )}
            draggable
            data-value={sliders[0].value}
            style={
              vertical
                ? { top: sliders[0].top * 100 + "%" }
                : {
                    left: sliders[0].left * 100 + "%",
                  }
            }
            onDrag={(e) => {
              if (!ctr.current || !e.clientX || !e.clientY) return;

              let newValue, newLeft, newTop;

              const rect = ctr.current.getBoundingClientRect();
              if (!vertical) {
                const x = e.clientX - rect.left - 12;

                const leftRaw = x / rect.width;
                const { value, left } = scale(leftRaw);

                if (left < 0 || left > 1) return;

                newValue = value;
                newLeft = left;
              } else {
                const y = e.clientY - rect.top - 12;

                const topRaw = y / rect.height;
                const { value, top } = scale(topRaw);

                if (top < 0 || top > 1) return;
                newValue = value;
                newTop = top;
              }

              if (!newValue) return;

              setSliders(
                [
                  {
                    value: newValue,
                    left: newLeft,
                    top: newTop,
                  },
                  sliders[1],
                ].sort((a, b) => a.value - b.value)
              );

              onChange(sliders.map((d) => d.value));
            }}
            // no drag image
            onDragStart={(e) => {
              e.dataTransfer.setDragImage(ghostImage, 0, 0);
            }}
          >
            <div
              className={twMerge(
                "w-3 h-3 absolute cursor-pointer border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-gray-200 rounded-full",
                vertical ? "top-0" : "left-0"
              )}
            ></div>
          </div>
        </div>
        <div
          className={twMerge(
            "pointer-events-none absolute",
            vertical
              ? "h-full w-3 top-0 left-1/2 transform -translate-x-1/2"
              : "w-full h-3 left-0 top-1/2 transform -translate-y-1/2"
          )}
        >
          <div
            className={twMerge(
              "right-slider absolute rounded-full pointer-events-auto hover:scale-150 transition-all",
              vertical ? "h-0 w-3" : "w-0 h-3"
            )}
            draggable
            data-value={sliders[1].value}
            style={
              vertical
                ? { top: sliders[1].top * 100 + "%" }
                : {
                    left: sliders[1].left * 100 + "%",
                  }
            }
            onDrag={(e) => {
              if (!ctr.current || !e.clientX || !e.clientY) return;

              let newValue, newLeft, newTop;

              const rect = ctr.current.getBoundingClientRect();
              if (!vertical) {
                const x = e.clientX - rect.left - 12;

                const leftRaw = x / rect.width;
                const { value, left } = scale(leftRaw);

                if (left < 0 || left > 1) return;
                newValue = value;
                newLeft = left;
              } else {
                const y = e.clientY - rect.top - 12;

                const topRaw = y / rect.height;
                const { value, top } = scale(topRaw);

                if (top < 0 || top > 1) return;

                newValue = value;
                newTop = top;
              }

              if (!newValue) return;

              setSliders(
                [
                  sliders[0],
                  {
                    value: newValue,
                    left: newLeft,
                    top: newTop,
                  },
                ].sort((a, b) => a.value - b.value)
              );

              onChange(sliders.map((d) => d.value));
            }}
            onDragStart={(e) => {
              e.dataTransfer.setDragImage(ghostImage, 0, 0);
            }}
          >
            <div
              className={twMerge(
                "w-3 h-3 absolute cursor-pointer border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-gray-200 rounded-full",
                vertical ? "bottom-0" : "right-0"
              )}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
