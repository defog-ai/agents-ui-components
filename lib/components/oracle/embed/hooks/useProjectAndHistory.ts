import { useState, useCallback } from "react";
import { OracleHistory } from "../types";
import { createHistoryTimeGroups } from "../utils/historyUtils";

/**
 * Hook for managing project selection and history
 */
export const useProjectAndHistory = (
  initialProjectNames: string[],
  updateUrlWithItemId: (itemId: string | number | null) => void,
  initialItemId: string | null = null
) => {
  const [projectNames, setProjectNames] = useState<string[]>(initialProjectNames);
  const [selectedProjectName, setSelectedProjectName] = useState(null);
  const [oracleHistory, setOracleHistory] = useState<OracleHistory>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId);

  // Handler for changing project
  const handleProjectChange = useCallback(
    (newProjectName: string) => {
      setSelectedProjectName(newProjectName);
      updateUrlWithItemId(null);
      setSelectedItemId(null);
    },
    [updateUrlWithItemId]
  );

  // Handler for new project creation
  const handleNewProjectCreated = useCallback((newProjectName: string) => {
    setProjectNames((prev) => [...prev, newProjectName]);
    setSelectedItemId(null);
    setOracleHistory((prev) => ({
      ...prev,
      [newProjectName]: createHistoryTimeGroups(),
    }));
  }, []);

  return {
    projectNames,
    setProjectNames,
    selectedProjectName,
    setSelectedProjectName,
    oracleHistory,
    setOracleHistory,
    selectedItemId,
    setSelectedItemId,
    handleProjectChange,
    handleNewProjectCreated
  };
};