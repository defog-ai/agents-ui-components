/**
 * A component that displays keyboard shortcuts in a subtle way
 * @param shortcut - The keyboard shortcut to display (e.g., "/", "n", "esc")
 * @param className - Additional classes to apply to the container
 */
export function KeyboardShortcutIndicator({ shortcut, className = "" }) {
  // Format the shortcut text
  const formattedShortcut = shortcut.toLowerCase();

  return (
    <kbd
      className={`
        hidden sm:inline-flex items-center justify-center
        px-2 py-1 text-xs font-mono
        text-gray-800 bg-gray-200
        border border-gray-300 rounded
        ${className}
      `}
    >
      {formattedShortcut}
    </kbd>
  );
}
