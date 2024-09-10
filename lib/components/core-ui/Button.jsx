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
        "py-1 px-2 border bg-gray-50 text-sm text-gray-800 rounded-md",
        disabled
          ? "bg-gray-50 text-gray-300 hover:bg-gray-50 cursor-not-allowed"
          : "hover:bg-gray-100 hover:text-gray-800",
        className
      )}
    >
      {children}
    </button>
  );
}
