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
