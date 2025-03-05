// utils.ts
/**
 * Returns a string representation of the timestamp passed. (defaults to Date.now())
 * in the same format that the backend creates for reports
 * Sample format: "2025-02-11T08:13:28.761375",
 * Note: This returns the timestamp in UTC
 */
export const oracleReportTimestamp = (dateObj: Date = new Date()) =>
  dateObj.toISOString().replace("Z", "");
