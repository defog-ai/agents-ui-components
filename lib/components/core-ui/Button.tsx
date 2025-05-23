import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

const baseStyles = {
  normal:
    "border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
  primary: "bg-blue-500 text-white dark:bg-blue-600",
  danger: "bg-red-500 text-white dark:bg-red-600",
};

const interactionStyles = "hover:opacity-80 active:opacity-90";

const variantStyles = {
  normal: `${baseStyles.normal} ${interactionStyles}`,
  primary: `${baseStyles.primary} ${interactionStyles}`,
  danger: `${baseStyles.danger} ${interactionStyles}`,
};

const disabledStyles =
  "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 dark:ring-gray-700 cursor-not-allowed hover:cursor-not-allowed";

interface ButtonProps {
  id?: string;
  onClick?: (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "normal" | "primary" | "secondary" | "danger";
  title?: string;
}

export function Button({
  id = null,
  onClick = () => {},
  className = "",
  children = null,
  icon = null,
  disabled = false,
  variant = "normal",
  title = "",
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
      title={title}
      className={twMerge(
        variantStyle,
        "agui-item agui-btn py-1 px-2 rounded-md text-sm flex flex-row items-center gap-1 active:brightness-[90%] justify-center",
        className,
        disabled ? disabledStyles : ""
      )}
    >
      {icon && <span className="ant-btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
