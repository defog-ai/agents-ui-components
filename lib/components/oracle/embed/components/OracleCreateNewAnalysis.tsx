import { MessageManager } from "@ui-components";
import { AnalysisTree } from "../../../query-data/analysis-tree-viewer/analysisTreeManager";
import { oracleReportTimestamp } from "@oracle";
import { AnalysisTreeManager } from "../../../query-data/analysis-tree-viewer/analysisTreeManager";
import { OracleHistory, OracleHistoryItem, QueryDataTree } from "../OracleEmbed";
import { raf } from "@utils/utils";
import { scrollToAnalysis } from "../../../query-data/analysis-tree-viewer/AnalysisTreeViewer";

/**
 * Creates a new fast analysis and handles updating the Oracle history
 */
export async function OracleCreateNewAnalysis({
  question,
  projectName,
  analysisId,
  selectedItem,
  createNewFastAnalysis,
  setOracleHistory,
  updateUrlWithItemId,
  setSelectedItemId,
  setSelectedProjectName,
  messageManager,
}: {
  question: string;
  projectName: string;
  analysisId: string;
  selectedItem: OracleHistoryItem;
  createNewFastAnalysis: (params: {
    question: string;
    projectName: string;
    analysisId: string;
    rootAnalysisId: string;
    treeManager?: AnalysisTreeManager;
  }) => Promise<{
    rootAnalysisId: string;
    analysisTree: AnalysisTree;
    treeManager: AnalysisTreeManager;
  }>;
  setOracleHistory: React.Dispatch<React.SetStateAction<OracleHistory>>;
  updateUrlWithItemId: (itemId: string | number | null) => void;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedProjectName: React.Dispatch<React.SetStateAction<string>>;
  messageManager: any; // Using any as a workaround for the MessageManager type issue
}) {
  try {
    const { rootAnalysisId, analysisTree, treeManager } = await createNewFastAnalysis({
      question,
      projectName: projectName,
      analysisId: analysisId,
      rootAnalysisId: analysisId,
      treeManager:
        selectedItem?.itemType === "query-data"
          ? selectedItem.treeManager
          : undefined,
    });

    const timestamp = oracleReportTimestamp();

    // Create a new QueryDataTree item
    const newQueryDataTree: QueryDataTree = {
      date_created: timestamp,
      itemId: rootAnalysisId,
      analysisTree: analysisTree,
      treeManager: treeManager,
      itemType: "query-data",
    };

    // Add the new analysis to the history
    setOracleHistory((prev) => {
      let newHistory: OracleHistory = { ...prev };

      newHistory = {
        ...prev,
        [projectName]: {
          ...prev[projectName],
          Today: [
            newQueryDataTree,
            ...(prev?.[projectName]?.Today || []),
          ],
          Yesterday: prev?.[projectName]?.Yesterday || [],
          "Past week": prev?.[projectName]?.["Past week"] || [],
          "Past month": prev?.[projectName]?.["Past month"] || [],
          Earlier: prev?.[projectName]?.Earlier || [],
        },
      };

      return newHistory;
    });

    // Update URL and selected report ID
    updateUrlWithItemId(rootAnalysisId);
    setSelectedItemId(rootAnalysisId);
    setSelectedProjectName(projectName);

    messageManager.success("New analysis created");
    
    return {
      rootAnalysisId,
      analysisTree,
      treeManager
    };
  } catch (error) {
    console.error("Error in OracleCreateNewAnalysis:", error);
    messageManager.error("Failed to create analysis: " + error.message);
    throw error;
  }
}
