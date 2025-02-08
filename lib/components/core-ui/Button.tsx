import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

const variantStyles = {
  normal:
    "border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-100 active:text-gray-800 dark:active:text-gray-100",
  primary:
    "bg-blue-500 text-white hover:bg-blue-600 hover:text-white active:text-white dark:bg-blue-600 dark:hover:bg-blue-700",
  danger:
    "bg-red-500 text-white hover:bg-red-600 hover:text-white active:text-white dark:bg-red-600 dark:hover:bg-red-700",
};

const disabledStyles =
  "bg-gray-50 dark:bg-gray-700 text-gray-300 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-300 dark:hover:text-gray-500 cursor-not-allowed active:bg-gray-50 dark:active:bg-gray-700 active:text-gray-300 dark:active:text-gray-500 active:brightness-[100%] hover:active:brightness-[100%] active:[&:not(:hover)]:brightness-[100%]";

interface ButtonProps {
  id?: string;
  onClick?: (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "normal" | "primary" | "secondary" | "danger";
}

export function Button({
  id = null,
  onClick = () => {},
  className = "",
  children = null,
  icon = null,
  disabled = false,
  variant = "normal",
}: ButtonProps) {
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
        "agui-item agui-btn py-1 px-2 rounded-md text-sm flex flex-row items-center gap-1 active:brightness-[90%]",
        disabled ? disabledStyles : className
      )}
    >
      {icon && <span className="ant-btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
