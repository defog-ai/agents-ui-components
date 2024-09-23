import React, { useMemo } from "react";
import { twMerge } from "tailwind-merge";

const variantStyles = {
  normal:
    "border bg-gray-50 text-gray-800 hover:bg-gray-100 hover:text-gray-800 active:text-gray-800",
  primary:
    "bg-blue-500 text-white hover:bg-blue-600 hover:text-white active:text-white",
  danger:
    "bg-red-500 text-white hover:bg-red-600 hover:text-white active:text-white",
};

const disabledStyles =
  "bg-gray-50 text-gray-300 hover:bg-gray-50 hover:text-gray-300 cursor-not-allowed active:bg-gray-50 active:text-gray-300 active:brightness-[100%] hover:active:brightness-[100%] active:[&:not(:hover)]:brightness-[100%]";

/**
 * @typedef {Object} ButtonProps
 * @property {string} id - Id of the button.
 * @property {function} onClick - Function to be called when the button is clicked.
 * @property {string} className - Additional classes to be added to the button.
 * @property {React.ReactNode} children - The content of the button.
 * @property {boolean} disabled - If true, the button will be disabled.
 * @property {"normal" | "primary" | "secondary" | "danger"} variant - The variant of the button.
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
  variant = "normal",
}) {
  const variantStyle = useMemo(
    () => variantStyles[variant] || variantStyles.normal,
    [variant]
  );

  return (
    <button
      id={id}
      disabled={disabled}
      onClick={(ev) => {
        if (disabled) return;
        onClick(ev);
      }}
      className={twMerge(
        variantStyle,
        "py-1 px-2 rounded-md text-sm flex flex-row items-center gap-1 active:brightness-[90%]",
        disabled ? disabledStyles : className
      )}
    >
      {children}
    </button>
  );
}
