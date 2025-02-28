export function TabPaneWrapper({ children, className, ...props }) {
  return (
    <div
      className={`h-[500px] px-2 overflow-y-auto scrollbar dark:bg-gray-800 dark:text-gray-200 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default TabPaneWrapper;
