import { useCallback } from "react";
import { MessageManager } from "@ui-components";
import { deleteReport, ORACLE_REPORT_STATUS, oracleReportTimestamp, ReportData } from "@oracle";
import { OracleHistory } from "../types";
import { findItemGroupInHistory } from "../utils/historyUtils";

/**
 * Hook for handling reports
 */
export const useReportHandlers = (
  apiEndpoint: string,
  token: string,
  selectedItemId: string,
  selectedProjectName: string,
  updateUrlWithItemId: (itemId: string | number | null) => void,
  oracleHistory: OracleHistory,
  setOracleHistory: React.Dispatch<React.SetStateAction<OracleHistory>>,
  messageManager: MessageManager
) => {
  // Handle report deletion
  const onReportDelete = useCallback(async () => {
    const reportGroup = findItemGroupInHistory(
      selectedProjectName,
      selectedItemId,
      oracleHistory
    );

    const deleteSucess = await deleteReport(
      apiEndpoint,
      selectedItemId,
      token,
      selectedProjectName
    );

    if (!deleteSucess) {
      messageManager.error("Failed to delete report");
      return;
    } else {
      messageManager.success("Report deleted");

      // remove the report from the history
      setOracleHistory((prev) => {
        const newReportList = prev[selectedProjectName][reportGroup].filter(
          (item) => {
            // Check if this is a report or an analysis item
            return "report_id" in item
              ? item.report_id !== selectedItemId
              : item.itemId !== selectedItemId;
          }
        );

        const newHistory = {
          ...prev,
          [selectedProjectName]: {
            ...prev[selectedProjectName],
            [reportGroup]: newReportList,
          },
        };
        // if no reports left in group, remove group
        if (newReportList.length === 0) {
          delete newHistory[selectedProjectName][reportGroup];
        }
        return newHistory;
      });

      // Update URL to remove report_id and update state
      updateUrlWithItemId(null);
      return null;
    }
  }, [
    apiEndpoint,
    token,
    selectedItemId,
    selectedProjectName,
    updateUrlWithItemId,
    oracleHistory,
    messageManager,
    setOracleHistory
  ]);

  // Handle report generation
  const handleReportGenerated = useCallback(
    ({ userQuestion, reportId, status }) => {
      setOracleHistory((prev) => {
        const newHistory = { ...prev };

        newHistory[selectedProjectName] = {
          ...prev[selectedProjectName],
          Today: [
            {
              report_id: reportId,
              report_name: userQuestion,
              status,
              date_created: oracleReportTimestamp(),
              itemId: reportId,
              itemType: "report",
            },
            ...(prev?.[selectedProjectName]?.Today || []),
          ],
          Yesterday: prev?.[selectedProjectName]?.Yesterday || [],
          "Past week": prev?.[selectedProjectName]?.["Past week"] || [],
          "Past month": prev?.[selectedProjectName]?.["Past month"] || [],
          Earlier: prev?.[selectedProjectName]?.Earlier || [],
        };

        return newHistory;
      });

      updateUrlWithItemId(reportId);
      return reportId;
    },
    [selectedProjectName, updateUrlWithItemId, setOracleHistory]
  );

  // Handle report data being parsed
  const handleReportParsed = useCallback(
    (data: ReportData) => {
      // find the group of this report in histories
      const group = findItemGroupInHistory(
        selectedProjectName,
        selectedItemId,
        oracleHistory
      );

      setOracleHistory((prev) => {
        const prevReports = prev[selectedProjectName][group];
        // if report is found, update it
        return {
          ...prev,
          [selectedProjectName]: {
            ...prev[selectedProjectName],
            [group]: prevReports.map((r) => {
              if ("report_id" in r && r.report_id === selectedItemId) {
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
    },
    [selectedProjectName, selectedItemId, oracleHistory, setOracleHistory]
  );

  // Handle thinking stream closed
  const handleThinkingStreamClosed = useCallback(
    (thinkingSteps, hadError) => {
      // Safety check - make sure the project and report still exist
      if (
        !selectedProjectName ||
        !selectedItemId ||
        !oracleHistory[selectedProjectName]
      ) {
        console.warn("Stream closed but project or report data missing");
        return;
      }

      const reportGroup = findItemGroupInHistory(
        selectedProjectName,
        selectedItemId,
        oracleHistory
      );

      // Safety check - make sure the report group exists
      if (!oracleHistory[selectedProjectName][reportGroup]) {
        console.warn("Stream closed but report group missing:", reportGroup);
        return;
      }

      if (hadError) {
        handleStreamClosedWithError(
          selectedProjectName,
          selectedItemId,
          reportGroup,
          updateUrlWithItemId,
          setOracleHistory
        );
      } else {
        handleStreamClosedSuccessfully(
          selectedProjectName,
          selectedItemId,
          reportGroup,
          setOracleHistory
        );
      }
    },
    [selectedProjectName, selectedItemId, oracleHistory, updateUrlWithItemId, setOracleHistory]
  );

  return {
    onReportDelete,
    handleReportGenerated,
    handleReportParsed,
    handleThinkingStreamClosed
  };
};

/**
 * Handle thinking stream closed with error
 */
function handleStreamClosedWithError(
  selectedProjectName: string,
  selectedItemId: string,
  reportGroup: string,
  updateUrlWithItemId: (itemId: string | number | null) => void,
  setOracleHistory: React.Dispatch<React.SetStateAction<OracleHistory>>
) {
  // remove this report from the history
  setOracleHistory((prev) => {
    const newHistory = { ...prev };

    // Extra safety check
    if (
      newHistory[selectedProjectName] &&
      newHistory[selectedProjectName][reportGroup] &&
      Array.isArray(newHistory[selectedProjectName][reportGroup])
    ) {
      newHistory[selectedProjectName][reportGroup] = newHistory[
        selectedProjectName
      ][reportGroup].filter((r) => {
        return "report_id" in r
          ? r.report_id !== selectedItemId
          : r.itemId !== selectedItemId;
      });
    }

    return newHistory;
  });

  updateUrlWithItemId(null);
  return null;
}

/**
 * Handle thinking stream closed successfully
 */
function handleStreamClosedSuccessfully(
  selectedProjectName: string,
  selectedItemId: string,
  reportGroup: string,
  setOracleHistory: React.Dispatch<React.SetStateAction<OracleHistory>>
) {
  // set the status to done which will trigger the report rendering
  setOracleHistory((prev) => {
    const newHistory = { ...prev };

    // Extra safety check
    if (
      newHistory[selectedProjectName] &&
      newHistory[selectedProjectName][reportGroup] &&
      Array.isArray(newHistory[selectedProjectName][reportGroup])
    ) {
      newHistory[selectedProjectName][reportGroup] = newHistory[
        selectedProjectName
      ][reportGroup].map((r) => {
        if (r.itemId === selectedItemId) {
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