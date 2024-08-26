export function TabPaneWrapper({ children, className, ...props }) {
  return (
    <div
      className={`h-[500px] px-2 overflow-y-auto scrollbar ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default TabPaneWrapper;
