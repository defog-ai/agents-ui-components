import { Menu } from "lucide-react";

const GridToggleButton = ({ isActive, onClick, axis }) => {
  return (
    <button
      onClick={onClick}
      className={`
        size-5 p-[0.15rem] flex mt-[17px] items-center justify-center rounded-sm 
        transition-all duration-200 ease-in-out
        ${isActive ? "bg-blue-500 shadow-md dark:bg-blue-600" : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"}
      `}
      aria-label={`Toggle ${axis}-axis grid`}
    >
      <Menu
        className={`
          transition-all duration-200 ease-in-out
          ${isActive ? "text-white" : "text-gray-600 dark:text-gray-300"}
        `}
        style={{
          transform: axis === "x" ? "rotate(90deg)" : "rotate(0deg)",
          opacity: isActive ? 1 : 0.7,
        }}
      />
    </button>
  );
};

export default GridToggleButton;
