import { useCallback } from "react";
import { MessageManager } from "@ui-components";
import { AnalysisTreeManager } from "../../../query-data/analysis-tree-viewer/analysisTreeManager";
import { scrollToAnalysis } from "../../../query-data/analysis-tree-viewer/AnalysisTreeViewer";
import { raf } from "@utils/utils";

/**
 * Hook for analysis tree management
 */
export const useAnalysisTree = (
  messageManager: MessageManager
) => {
  // Function to handle analysis creation when in query-data mode
  const createNewFastAnalysis = useCallback(async function ({
    question,
    projectName,
    analysisId,
    rootAnalysisId,
    treeManager = null,
  }: {
    question: string;
    projectName: string;
    analysisId: string;
    rootAnalysisId: string;
    treeManager?: AnalysisTreeManager;
  }) {
    try {
      if (treeManager) {
        // Add to existing tree
        return handleExistingTreeAnalysis({
          question,
          projectName,
          analysisId,
          rootAnalysisId,
          treeManager
        });
      } else {
        // Start a fresh tree
        return handleNewTreeAnalysis({
          question,
          projectName,
          analysisId
        });
      }
    } catch (error) {
      console.error("Error creating new analysis:", error);
      messageManager.error(
        "Failed to create analysis: " + error.message
      );
      throw error;
    }
  }, [messageManager]);

  return { createNewFastAnalysis };
};

/**
 * Handle analysis creation in an existing tree
 */
async function handleExistingTreeAnalysis({
  question,
  projectName,
  analysisId,
  rootAnalysisId,
  treeManager
}: {
  question: string;
  projectName: string;
  analysisId: string;
  rootAnalysisId: string;
  treeManager: AnalysisTreeManager;
}) {
  // Create a follow-on analysis
  const { newAnalysis } = await treeManager.submit({
    question,
    projectName: projectName,
    analysisId,
    rootAnalysisId: rootAnalysisId,
    isRoot: false,
    directParentId: treeManager.getActiveAnalysisId(),
    activeTab: "table",
  });

  raf(() => {
    scrollToAnalysis(newAnalysis.analysisId);
  });

  return {
    rootAnalysisId: rootAnalysisId,
    analysisTree: treeManager?.getTree() || {},
    treeManager: treeManager,
  };
}

/**
 * Handle analysis creation for a new tree
 */
async function handleNewTreeAnalysis({
  question,
  projectName,
  analysisId
}: {
  question: string;
  projectName: string;
  analysisId: string;
}) {
  const newAnalysisTreeManager = AnalysisTreeManager();

  // Submit the question to create a new root analysis
  await newAnalysisTreeManager.submit({
    question,
    projectName: projectName,
    analysisId,
    // this is a new root so this is the same as analysisId
    rootAnalysisId: analysisId,
    isRoot: true,
    directParentId: null,
    sqlOnly: false,
    isTemp: false,
    activeTab: "table",
  });

  return {
    rootAnalysisId: analysisId,
    analysisTree: newAnalysisTreeManager.getTree(),
    treeManager: newAnalysisTreeManager,
  };
}