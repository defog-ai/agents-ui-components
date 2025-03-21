import { OracleHistory, OracleHistoryItem, groups } from "../types";

/**
 * Finds which group in history an item belongs to
 */
export const findItemGroupInHistory = (
  projectName: string,
  itemId: string,
  history: OracleHistory
): groups => {
  // default to Today
  if (!projectName || !itemId || !history || !history[projectName])
    return "Today";

  const groups = Object.keys(history[projectName]) as groups[];

  for (const group of groups) {
    if (
      history[projectName][group] &&
      Array.isArray(history[projectName][group]) &&
      history[projectName][group].some(
        (item) => String(item?.itemId) === String(itemId)
      )
    ) {
      return group;
    }
  }

  // default to Today
  return "Today";
};

/**
 * Creates time-based groups for sorting history items
 */
export const createHistoryTimeGroups = () => ({
  Today: [],
  Yesterday: [],
  "Past week": [],
  "Past month": [],
  Earlier: [],
});

/**
 * Determines which date group an item belongs to
 */
export const getDateGroup = (date: Date): groups => {
  const localToday = new Date();
  const localYesterday = new Date(localToday);
  localYesterday.setDate(localYesterday.getDate() - 1);
  const localWeek = new Date(localToday);
  localWeek.setDate(localWeek.getDate() - 7);
  const localMonth = new Date(localToday);
  localMonth.setMonth(localMonth.getMonth() - 1);

  if (date.toDateString() === localToday.toDateString()) {
    return "Today";
  } else if (date.toDateString() === localYesterday.toDateString()) {
    return "Yesterday";
  } else if (date >= localWeek) {
    return "Past week";
  } else if (date >= localMonth) {
    return "Past month";
  } else {
    return "Earlier";
  }
};

/**
 * Sort history items by date
 */
export const sortHistoryItems = (projectHistory: Record<groups, OracleHistoryItem[]>) => {
  Object.entries(projectHistory).forEach(([group, items]) => {
    if (!items || !Array.isArray(items)) return;

    items.sort((a, b) => {
      // Handle both reports and analyses
      const dateA =
        "report_id" in a
          ? new Date(a.date_created + "Z").getTime()
          : new Date(a.date_created).getTime();

      const dateB =
        "report_id" in b
          ? new Date(b.date_created + "Z").getTime()
          : new Date(b.date_created).getTime();

      return dateB - dateA;
    });
  });
};