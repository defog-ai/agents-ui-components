export const KEYMAP = {
  // DraggableInput shortcuts
  FOCUS_SEARCH: "/", // Focus the search textarea
  NEW_CONVERSATION: "n", // Start a new conversation

  // StepResultsTable shortcuts
  VIEW_CHART: "c", // Switch to chart view
  VIEW_TABLE: "t", // Switch to table view

  // Table shortcuts
  TABLE_PREV_PAGE: "ArrowLeft", // Go to previous page in table
  TABLE_NEXT_PAGE: "ArrowRight", // Go to next page in table
  TABLE_FOCUS_SEARCH: "s", // Focus the table search input
  TABLE_BLUR_SEARCH: "Escape", // Blur/unfocus the table search input

  // New shortcuts
  TOGGLE_ANALYSIS: "]", // simple left bracket for left panel
  TOGGLE_CHART_OPTIONS: "[", // simple right bracket for right panel

  // Chart shortcuts
  SAVE_CHART: "p", // Save chart as PNG,
  SET_X_AXIS: "x", // Set x axis
  SET_Y_AXIS: "y", // Set y axis

  // Oracle shortcuts
  FOCUS_ORACLE_SEARCH: "/", // Focus the main search bar
  NEW_QUESTION: "K", // Start a new question (used with Command and shift (cmd + n and cmd+shift+n are bound to new window stuff in browers. cmd+q is quit. hence we go with cmd+k))
  TOGGLE_MODE: "M", // Toggle between Fast and Deep Research modes (used with Command/Control)
} as const;

// Type for all possible keymap values
export type KeymapKey = (typeof KEYMAP)[keyof typeof KEYMAP];

// Helper function to check if a key matches (case insensitive)
export const matchesKey = (
  pressedKey: string,
  targetKey: KeymapKey
): boolean => {
  return pressedKey.toLowerCase() === targetKey.toLowerCase();
};
