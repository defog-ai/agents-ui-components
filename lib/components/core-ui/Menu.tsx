import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@ui-components";

/**
 * Props for the MenuItem component
 */
interface MenuItemProps {
  /**
   * The content of the menu item
   */
  children?: React.ReactNode;
  /**
   * Function to be called when the menu item is clicked
   */
  onClick?: () => void;
  /**
   * If true, the menu item will be disabled
   */
  disabled?: boolean;
  /**
   * Icon to be displayed on the left side of the menu item
   */
  icon?: React.ReactNode;
  /**
   * Additional classes to be added to the menu item
   */
  className?: string;
  /**
   * If true, the menu item will be highlighted
   */
  active?: boolean;
  /**
   * If true, the menu item will have a divider below it
   */
  divider?: boolean;
  /**
   * Function to close the parent dropdown when menu item is clicked
   * @internal This is used internally by the Dropdown component
   */
  closeDropdown?: () => void;
}

/**
 * Props for the SubMenu component
 */
interface SubMenuProps {
  /**
   * The title of the submenu
   */
  title: React.ReactNode;
  /**
   * The content of the submenu
   */
  children?: React.ReactNode;
  /**
   * Icon to be displayed on the left side of the submenu title
   */
  icon?: React.ReactNode;
  /**
   * Additional classes to be added to the submenu
   */
  className?: string;
  /**
   * If true, the submenu will be disabled
   */
  disabled?: boolean;
}

/**
 * Props for the Menu component
 */
interface MenuProps {
  /**
   * The content of the menu
   */
  children?: React.ReactNode;
  /**
   * Additional classes to be added to the menu
   */
  className?: string;
  /**
   * If true, the menu will be displayed horizontally
   */
  horizontal?: boolean;
  /**
   * If true, the menu will be collapsed
   */
  collapsed?: boolean;
}

/**
 * A menu item component
 */
export function MenuItem({
  children = null,
  onClick = () => {},
  disabled = false,
  icon = null,
  className = "",
  active = false,
  divider = false,
  closeDropdown,
}: MenuItemProps) {
  return (
    <>
      <div
        className={twMerge(
          "agui-item agui-menu-item flex items-center px-4 py-2 text-sm cursor-pointer",
          "text-gray-700 dark:text-gray-300",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          active && "bg-gray-100 dark:bg-gray-700 font-medium",
          disabled &&
            "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent",
          className
        )}
        onClick={() => {
          if (!disabled) {
            onClick();
            // Close dropdown if function is provided
            if (closeDropdown) {
              closeDropdown();
            }
          }
        }}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </div>
      {divider && (
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
      )}
    </>
  );
}

/**
 * A submenu component
 */
export function SubMenu({
  title,
  children = null,
  icon = null,
  className = "",
  disabled = false,
}: SubMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close submenu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={menuRef} className={twMerge("agui-submenu relative", className)}>
      <div
        className={twMerge(
          "agui-submenu-title flex items-center justify-between px-4 py-2 text-sm cursor-pointer",
          "text-gray-700 dark:text-gray-300",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          disabled &&
            "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 ml-2" />
        ) : (
          <ChevronRight className="w-4 h-4 ml-2" />
        )}
      </div>
      {isOpen && (
        <div className="agui-submenu-content pl-4 border-l border-gray-200 dark:border-gray-700 ml-4 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A dropdown menu component
 */
interface DropdownProps {
  /**
   * The trigger element for the dropdown
   */
  trigger: React.ReactNode;
  /**
   * The content of the dropdown
   */
  children?: React.ReactNode;
  /**
   * Additional classes to be added to the dropdown
   */
  className?: string;
  /**
   * The placement of the dropdown
   */
  placement?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /**
   * The label of the dropdown
   */
  label?: React.ReactNode;
  /**
   * The class names of the label
   */
  labelClassNames?: string;
}

/**
 * A dropdown component
 */
export function Dropdown({
  trigger,
  children = null,
  className = "",
  placement = "bottom-left",
  label = null,
  labelClassNames = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const placementClasses = {
    "bottom-left": "top-full left-0",
    "bottom-right": "top-full right-0",
    "top-left": "bottom-full left-0",
    "top-right": "bottom-full right-0",
  };

  // Function to close the dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };

  // Add closeDropdown prop to all MenuItem children
  const childrenWithProps = React.Children.map(children, (child) => {
    // Check if the child is a valid element
    if (React.isValidElement(child)) {
      // Check if the child is a MenuItem
      if (child.type === MenuItem) {
        // Clone the element with the closeDropdown prop
        return React.cloneElement(child, { closeDropdown });
      }
    }
    return child;
  });

  return (
    <div
      ref={dropdownRef}
      className={twMerge("agui-dropdown relative", className)}
    >
      <div
        className="agui-dropdown-trigger cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label && (
          <label
            className={twMerge(
              "block text-xs mb-2 font-light text-gray-600 dark:text-gray-300",
              labelClassNames
            )}
          >
            {label}
          </label>
        )}

        <Button className="flex items-center gap-2 rounded-xl bg-transparent dark:bg-transparent">
          {trigger}
        </Button>
      </div>
      {isOpen && (
        <div
          className={twMerge(
            "agui-dropdown-content absolute z-10 mt-1 min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg",
            placementClasses[placement]
          )}
        >
          {childrenWithProps}
        </div>
      )}
    </div>
  );
}

/**
 * A menu component
 */
export function Menu({
  children = null,
  className = "",
  horizontal = false,
  collapsed = false,
}: MenuProps) {
  return (
    <div
      className={twMerge(
        "agui-menu bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm",
        horizontal ? "flex flex-row" : "flex flex-col",
        collapsed && "w-16",
        className
      )}
    >
      {children}
    </div>
  );
}
