import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Sidebar,
  SpinningLoader,
  SingleSelect,
} from "@ui-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteReport,
  fetchReports,
  ORACLE_REPORT_STATUS,
  OracleReport,
  oracleReportTimestamp,
  ReportData,
  ListReportResponseItem,
} from "@oracle";
import { Info, SquarePen } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { OracleDraftReport } from "../reports/report-creation/OracleDraftReport";
import { OracleNewDb } from "./OracleNewDb";
import { OracleThinking } from "../reports/OracleThinking";

interface OracleReportType extends ListReportResponseItem {
  reportData?: ReportData;
}

type groups = "Today" | "Yesterday" | "Past week" | "Past month" | "Earlier";

interface ReportHistory {
  [dbName: string]: Record<groups, OracleReportType[]>;
}

const findReportGroupInHistory = (
  dbName: string,
  reportId: string,
  history: ReportHistory
) => {
  // default to Today
  if (!dbName || !reportId || !history || !history[dbName]) return "Today";

  const groups = Object.keys(history[dbName]) as groups[];

  for (const group of groups) {
    if (
      history[dbName][group] &&
      Array.isArray(history[dbName][group]) &&
      history[dbName][group].some(
        (r) => String(r.report_id) === String(reportId)
      )
    ) {
      return group;
    }
  }

  // default to Today
  return "Today";
};

/**
 * Renders an Oracle report in an embedded mode.
 * This has a sidebar to select db names, and a report selector which shows a list of already generated reports.
 * Has a button to start a new report.
 */
export function OracleEmbed({
  apiEndpoint,
  token,
  initialDbNames = [],
}: {
  apiEndpoint: string;
  token: string;
  initialDbNames: string[];
}) {
  const [dbNames, setDbNames] = useState<string[]>(initialDbNames);
  const [selectedDbName, setSelectedDbName] = useState("Default DB");
  const [reportHistory, setReportHistory] = useState<ReportHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selectedReport = useMemo(() => {
    if (!selectedReportId || !reportHistory[selectedDbName]) return null;

    const group = findReportGroupInHistory(
      selectedDbName,
      selectedReportId,
      reportHistory
    );
    if (!reportHistory[selectedDbName][group]) return null;

    // Use string comparison for safety
    return reportHistory[selectedDbName][group].find(
      (r) => String(r.report_id) === String(selectedReportId)
    );
  }, [selectedReportId, reportHistory, selectedDbName]);

  const messageManager = useRef(MessageManager());
  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: uploadNewDbOption } = useRef<string>(
    crypto.randomUUID().toString()
  );

  const [hasUploadedDataFiles, setHasUploadedDataFiles] = useState(false);

  // Function to update URL with report_id
  const updateUrlWithReportId = useCallback(
    (reportId: string | number | null) => {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (reportId !== null) {
          // Ensure reportId is string
          const reportIdStr = String(reportId);
          url.searchParams.set("report_id", reportIdStr);
        } else {
          url.searchParams.delete("report_id");
        }
        window.history.pushState({}, "", url.toString());
      }
    },
    []
  );

  // Function to get report_id from URL - not as a callback to ensure it's actually checked
  function getReportIdFromUrl() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const reportIdParam = urlParams.get("report_id");

      if (reportIdParam) {
        // Try to convert to number if it's numeric
        const numericId = Number(reportIdParam);
        const reportId = !isNaN(numericId)
          ? numericId.toString()
          : reportIdParam;
        return reportId;
      }
      return null;
    }
    return null;
  }

  // Commenting out this effect to avoid circular updates
  // We'll handle URL updates directly when setting the selectedReportId
  // useEffect(() => {
  //   if (selectedReportId) {
  //     updateUrlWithReportId(selectedReportId);
  //   } else {
  //     updateUrlWithReportId(null);
  //   }
  // }, [selectedReportId, updateUrlWithReportId]);

  // Add a ref to track if initial setup is complete
  const initialSetupComplete = useRef(false);

  // Create a ref to store the URL report ID
  const urlReportIdRef = useRef(getReportIdFromUrl());

  useEffect(() => {
    async function setup() {
      try {
        // Get the URL report ID directly
        const urlReportId = urlReportIdRef.current;

        // Setup history structure
        const histories: ReportHistory = {};

        // Track if we've found the report from URL
        let foundUrlReport = false;
        let foundUrlReportDbName = null;

        // Set default DB (only if not found in URL)
        if (dbNames.length && selectedDbName === "Default DB" && !urlReportId) {
          setSelectedDbName(dbNames.length ? dbNames[0] : uploadNewDbOption);
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        const month = new Date(today);
        month.setMonth(month.getMonth() - 1);

        for (const dbName of dbNames) {
          histories[dbName] = {
            Today: [],
            Yesterday: [],
            "Past week": [],
            "Past month": [],
            Earlier: [],
          };

          try {
            const reports = await fetchReports(apiEndpoint, token, dbName);
            if (!reports) throw new Error("Failed to get reports");

            // Check for URL report ID in this database
            if (urlReportId && !foundUrlReport) {
              // Log the report IDs we find
              const reportIds = reports.map((r) => r.report_id);

              // Look for a match
              const reportMatch = reports.find(
                (r) => String(r.report_id) === String(urlReportId)
              );
              if (reportMatch) {
                foundUrlReport = true;
                foundUrlReportDbName = dbName;
              }
            }

            // Now filter for regular display
            const filteredReports = reports.filter(
              (report) =>
                report.status !== ORACLE_REPORT_STATUS.ERRORED &&
                report.status !== ORACLE_REPORT_STATUS.INITIALIZED
            );

            // add to histories based on date created
            filteredReports.forEach((report) => {
              // Parse date_created as UTC and convert to local timezone
              const date = new Date(report.date_created + "Z");
              const localToday = new Date();
              const localYesterday = new Date(localToday);
              localYesterday.setDate(localYesterday.getDate() - 1);
              const localWeek = new Date(localToday);
              localWeek.setDate(localWeek.getDate() - 7);
              const localMonth = new Date(localToday);
              localMonth.setMonth(localMonth.getMonth() - 1);

              // Compare dates using local timezone
              if (date.toDateString() === localToday.toDateString()) {
                histories[dbName]["Today"].push(report);
              } else if (
                date.toDateString() === localYesterday.toDateString()
              ) {
                histories[dbName]["Yesterday"].push(report);
              } else if (date >= localWeek) {
                histories[dbName]["Past week"].push(report);
              } else if (date >= localMonth) {
                histories[dbName]["Past month"].push(report);
              } else {
                histories[dbName]["Earlier"].push(report);
              }
            });

            // sort the reports within each group in the history by date created in reverse chronological order
            Object.entries(histories[dbName]).forEach(([group, reports]) => {
              reports.sort(
                (a, b) =>
                  new Date(b.date_created + "Z").getTime() -
                  new Date(a.date_created + "Z").getTime()
              );
            });
          } catch (error) {
            setError("Failed to fetch reports for db name " + dbName);
            break;
          }
        }

        // Update report history state
        setReportHistory(histories);

        // If we found the URL report, select it
        if (urlReportId && foundUrlReport && foundUrlReportDbName) {
          // First select the DB
          setSelectedDbName(foundUrlReportDbName);

          // Then wait a moment and select the report ID
          // This delay is important to avoid race conditions
          setTimeout(() => {
            setSelectedReportId(urlReportId);
          }, 100);
        }

        // Mark setup as complete
        initialSetupComplete.current = true;
      } catch (err) {
        console.error("Setup error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, [dbNames, selectedDbName, apiEndpoint, token]);

  const onReportDelete = useCallback(async () => {
    const reportGroup = findReportGroupInHistory(
      selectedDbName,
      selectedReportId,
      reportHistory
    );

    const deleteSucess = await deleteReport(
      apiEndpoint,
      selectedReportId,
      token,
      selectedDbName
    );

    if (!deleteSucess) {
      messageManager.current.error("Failed to delete report");
      return;
    } else {
      messageManager.current.success("Report deleted");

      // remove the report from the history
      setReportHistory((prev) => {
        const newReportList = prev[selectedDbName][reportGroup].filter(
          (report) => report.report_id !== selectedReportId
        );

        const newHistory = {
          ...prev,
          [selectedDbName]: {
            ...prev[selectedDbName],
            [reportGroup]: newReportList,
          },
        };
        // if no reports left in group, remove group
        if (newReportList.length === 0) {
          delete newHistory[selectedDbName][reportGroup];
        }
        return newHistory;
      });

      // Update URL to remove report_id and update state
      updateUrlWithReportId(null);
      setSelectedReportId(null);
    }
  }, [
    apiEndpoint,
    token,
    selectedReportId,
    selectedDbName,
    updateUrlWithReportId,
  ]);

  const dbSelector = useMemo(
    () => (
      <div>
        <SingleSelect
          label={
            !selectedReportId && hasUploadedDataFiles
              ? "Remove uploaded CSV/Excel files to select a database"
              : "Select Database"
          }
          rootClassNames="mb-2"
          value={selectedDbName}
          disabled={selectedReportId === null && hasUploadedDataFiles}
          allowClear={false}
          allowCreateNewOption={false}
          options={[
            {
              value: uploadNewDbOption,
              label: "Upload new",
            },
          ].concat(
            dbNames.map((dbName) => ({
              value: dbName,
              label: dbName,
            }))
          )}
          onChange={(v: string) => {
            setSelectedDbName(v);
            updateUrlWithReportId(null);
            setSelectedReportId(null);
          }}
        />
      </div>
    ),
    [
      selectedDbName,
      selectedReportId,
      dbNames,
      hasUploadedDataFiles,
      updateUrlWithReportId,
    ]
  );

  const draftReport = useMemo(() => {
    return (
      <OracleDraftReport
        token={token}
        dbName={selectedDbName}
        apiEndpoint={apiEndpoint}
        onUploadDataFiles={(dataFiles) => {
          setHasUploadedDataFiles(
            dataFiles && dataFiles?.length ? true : false
          );
        }}
        onClarified={(newDbName) => {
          if (newDbName) {
            messageManager.current.success(
              `A new database was created using your uploaded csv/excel files: ${newDbName}`
            );
            setDbNames((prev) => [...prev, newDbName]);
            setSelectedDbName(newDbName);
            setSelectedReportId(null);
            setReportHistory((prev) => ({
              ...prev,
              [newDbName]: {
                Today: [],
                Yesterday: [],
                "Past week": [],
                "Past month": [],
                Earlier: [],
              },
            }));
          }
        }}
        onReportGenerated={({ userQuestion, reportId, status, newDbName }) => {
          setReportHistory((prev) => {
            let newHistory: ReportHistory = { ...prev };

            if (newDbName) {
              newHistory = {
                ...prev,
                [newDbName]: {
                  Today: [
                    {
                      report_id: reportId,
                      report_name: userQuestion,
                      status,
                      date_created: oracleReportTimestamp(),
                    },
                  ],
                  Yesterday: [],
                  "Past week": [],
                  "Past month": [],
                  Earlier: [],
                },
              };
            } else {
              newHistory = {
                ...prev,
                [selectedDbName]: {
                  ...prev[selectedDbName],
                  Today: [
                    {
                      report_id: reportId,
                      report_name: userQuestion,
                      status,
                      date_created: oracleReportTimestamp(),
                    },
                    ...(prev?.[selectedDbName]?.["Today"] || []),
                  ],
                },
              };
            }

            return newHistory;
          });

          updateUrlWithReportId(reportId);
          setSelectedReportId(reportId);
        }}
      />
    );
  }, [messageManager, selectedDbName, updateUrlWithReportId]);

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-rose-50 text-rose-500">
        Error: {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        <SpinningLoader /> <span>Loading</span>
      </div>
    );
  }

  return (
    <MessageManagerContext.Provider value={messageManager.current}>
      <MessageMonitor rootClassNames={"absolute left-0 right-0"} />
      <div className="flex flex-row min-w-full min-h-full max-h-full overflow-hidden text-gray-600 bg-white dark:bg-gray-900">
        <Sidebar
          open={true}
          beforeTitle={dbSelector}
          location="left"
          rootClassNames="absolute left-0 min-h-full shadow-lg lg:shadow-none lg:sticky top-0 bg-gray-50 dark:bg-gray-800 z-20 border-r border-gray-100 dark:border-gray-700"
          title={
            <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-lg flex items-center">
              <span className="mr-2">📚</span> History
            </h2>
          }
          contentClassNames={
            "w-72 p-5 rounded-tl-lg relative sm:block min-h-96 max-h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          }
        >
          <div className="space-y-4">
            {selectedDbName !== uploadNewDbOption ? (
              <div
                className={twMerge(
                  "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-3 flex items-center border border-transparent",
                  !selectedReportId
                    ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                )}
                onClick={() => {
                  updateUrlWithReportId(null);
                  setSelectedReportId(null);
                }}
              >
                <div className="flex flex-row items-center gap-2">
                  <SquarePen size={18} />{" "}
                  <span className="font-medium">New Report</span>
                </div>
              </div>
            ) : (
              <p className="text-xs">
                Upload a new CSV/Excel file on the right
              </p>
            )}
            {selectedDbName !== uploadNewDbOption &&
              reportHistory[selectedDbName] &&
              Object.entries(reportHistory[selectedDbName]).map(
                ([group, reports]) => {
                  if (!reports || Object.keys(reports).length === 0)
                    return null; // Skip empty groups
                  return (
                    <div key={group} className="mb-6">
                      <div className="px-2 mb-3 text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400 uppercase flex items-center">
                        <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow mr-2"></div>
                        {group}
                        <div className="h-px bg-blue-100 dark:bg-blue-800 flex-grow ml-2"></div>
                      </div>
                      {reports.map((report: OracleReportType) => (
                        <div
                          key={report.report_id}
                          onClick={() => {
                            updateUrlWithReportId(report.report_id);
                            setSelectedReportId(report.report_id);
                          }}
                          className={twMerge(
                            "title hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 history-item p-3 text-sm rounded-md transition-colors duration-200 mb-2 border border-transparent",
                            report.report_id === selectedReportId
                              ? "font-medium bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-800 shadow-sm text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                          )}
                        >
                          {/* Use max-height transition for smooth expansion on hover */}
                          <div
                            className="overflow-hidden transition-all duration-300 hover:max-h-[500px]"
                          >
                            <p
                              className="font-medium hover:line-clamp-none line-clamp-2"
                            >
                              {report.report_name ||
                                report.inputs.user_question ||
                                "Untitled report"}
                            </p>
                          </div>
                          <div className="flex items-center text-xs mt-1.5 text-gray-500 dark:text-gray-400">
                            <span 
                              className={`inline-block w-3 h-3 mr-1.5 rounded-full ${
                                report.status === ORACLE_REPORT_STATUS.DONE 
                                  ? "bg-blue-200 dark:bg-blue-800" 
                                  : report.status === ORACLE_REPORT_STATUS.THINKING
                                    ? "bg-green-300 dark:bg-green-600"
                                    : report.status === ORACLE_REPORT_STATUS.ERRORED
                                      ? "bg-red-200 dark:bg-red-800"
                                      : "bg-blue-200 dark:bg-blue-800"
                              }`}
                              title={`Status: ${report.status || "Unknown"}`}
                            ></span>
                            {new Date(report.date_created + "Z").toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
              )}
          </div>
        </Sidebar>
        <div className="flex flex-col grow p-2 overflow-auto">
          {/* Show OracleNewDb when the "Upload new" option is selected */}
          {selectedReportId === null &&
            selectedDbName === uploadNewDbOption && (
              <OracleNewDb
                apiEndpoint={apiEndpoint}
                token={token}
                onDbCreated={(dbName) => {
                  setReportHistory((prev) => ({
                    ...prev,
                    [dbName]: {
                      Today: [],
                      Yesterday: [],
                      "Past week": [],
                      "Past month": [],
                      Earlier: [],
                    },
                  }));
                  setDbNames((prev) => [...prev, dbName]);
                  setSelectedDbName(dbName);
                }}
              />
            )}

          {/* Show completed report */}
          {selectedReportId &&
          selectedReport &&
          selectedReport.status === ORACLE_REPORT_STATUS.DONE ? (
            <OracleReport
              key={selectedReportId}
              reportId={selectedReportId}
              apiEndpoint={apiEndpoint}
              dbName={selectedDbName}
              token={token}
              onDelete={onReportDelete}
              onReportParsed={(data: ReportData) => {
                // find the group of this report in histories
                const group = findReportGroupInHistory(
                  selectedDbName,
                  selectedReportId,
                  reportHistory
                );

                setReportHistory((prev) => {
                  const prevReports = prev[selectedDbName][group];
                  // if report is found, update it
                  return {
                    ...prev,
                    [selectedDbName]: {
                      ...prev[selectedDbName],
                      [group]: prevReports.map((r) => {
                        if (r.report_id === selectedReportId) {
                          return {
                            ...r,
                            reportData: data,
                          };
                        }
                        return r;
                      }),
                    },
                  };
                });
              }}
            />
          ) : selectedReportId ? (
            // Show thinking status for in-progress report
            <OracleThinking
              apiEndpoint={apiEndpoint}
              token={token}
              reportId={selectedReportId}
              onDelete={onReportDelete}
              onStreamClosed={(thinkingSteps, hadError) => {
                // Safety check - make sure the DB and report still exist
                if (
                  !selectedDbName ||
                  !selectedReportId ||
                  !reportHistory[selectedDbName]
                ) {
                  console.warn("Stream closed but DB or report data missing");
                  return;
                }

                const reportGroup = findReportGroupInHistory(
                  selectedDbName,
                  selectedReportId,
                  reportHistory
                );

                // Safety check - make sure the report group exists
                if (!reportHistory[selectedDbName][reportGroup]) {
                  console.warn(
                    "Stream closed but report group missing:",
                    reportGroup
                  );
                  return;
                }

                if (hadError) {
                  // remove this report from the history
                  setReportHistory((prev) => {
                    const newHistory = { ...prev };

                    // Extra safety check
                    if (
                      newHistory[selectedDbName] &&
                      newHistory[selectedDbName][reportGroup] &&
                      Array.isArray(newHistory[selectedDbName][reportGroup])
                    ) {
                      newHistory[selectedDbName][reportGroup] = newHistory[
                        selectedDbName
                      ][reportGroup].filter((r) => {
                        return r.report_id !== selectedReportId;
                      });
                    }

                    return newHistory;
                  });

                  updateUrlWithReportId(null);
                  setSelectedReportId(null);
                } else {
                  // set the status to done which will trigger the report rendering
                  setReportHistory((prev) => {
                    const newHistory = { ...prev };

                    // Extra safety check
                    if (
                      newHistory[selectedDbName] &&
                      newHistory[selectedDbName][reportGroup] &&
                      Array.isArray(newHistory[selectedDbName][reportGroup])
                    ) {
                      newHistory[selectedDbName][reportGroup] = newHistory[
                        selectedDbName
                      ][reportGroup].map((r) => {
                        if (r.report_id === selectedReportId) {
                          return {
                            ...r,
                            status: ORACLE_REPORT_STATUS.DONE,
                          };
                        }
                        return r;
                      });
                    }

                    return newHistory;
                  });
                }
              }}
            />
          ) : null}

          {/* Show draft report creator when no report is selected and we're not uploading new DB */}
          {selectedReportId === null &&
            selectedDbName !== uploadNewDbOption && (
              <div className="w-full h-full m-auto">{draftReport}</div>
            )}
        </div>
      </div>
    </MessageManagerContext.Provider>
  );
}
