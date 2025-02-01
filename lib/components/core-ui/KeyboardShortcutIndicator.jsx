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
        text-xs font-mono
        text-gray-600 bg-gray-100/80
        border border-gray-200 rounded
        dark:text-gray-400 dark:bg-gray-800/80 dark:border-gray-700
        ${className}
      `}
    >
      {formattedShortcut}
    </kbd>
  );
}
