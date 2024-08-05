import React from "react";
import { twMerge } from "tailwind-merge";

/**
 * @typedef {Object} ButtonProps
 * @property {string} id - Id of the button.
 * @property {function} onClick - Function to be called when the button is clicked.
 * @property {string} className - Additional classes to be added to the button.
 * @property {React.ReactNode} children - The content of the button.
 * @property {boolean} disabled - If true, the button will be disabled.
 */

/**
 * Button component
 * @param {ButtonProps} props
 */
export function Button({
  id = null,
  onClick = (...args) => {},
  className = "",
  children = null,
  disabled = false,
}) {
  return (
    <button
      id={id}
      disabled={disabled}
      onClick={(ev) => {
        if (disabled) return;
        onClick(ev);
      }}
      className={twMerge(
        "px-2 py-1 rounded-md text-white bg-blue-500 text-xs hover:bg-blue-600",
        disabled
          ? "bg-gray-50 text-gray-300 hover:bg-gray-50 cursor-not-allowed"
          : "",
        className
      )}
    >
      {children}
    </button>
  );
}
