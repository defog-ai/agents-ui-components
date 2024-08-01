import { v4 } from "uuid";

/**
 * Manages a hierarchical structure of analyses, allowing for operations on a tree of analysis items.
 * This manager is utilized by the AnalysisTreeViewer to handle and visualize analysis data in a structured manner.
 * Constructs an AnalysisTreeManager instance.
 * @param {Object} initialTree - The initial structure of the analysis tree. Defaults to an empty object.
 * @param {string} id - The unique identifier for the root of the analysis tree. Defaults to a generated UUID.
 */
export function AnalysisTreeManager(initialTree = {}, id = v4()) {
  // Initializes the unique identifier for this analysis tree manager instance.
  let _id = id;

  /**
   * An object that stores all analysis in this "session" as a tree
   * @example
   * {
   *  rootAnalysisId: {
   *     root: {
   *       analysisId: "analysis-1",
   *       user_question: "Show me 5 rows",
   *     },
   *     analysisList: [
   *       // note that the first analysis here is the root
   *       {
   *         analysisId: "analysis-1",
   *         user_question: "Show me 5 rows",
   *       },
   *       {
   *        analysisId: "analysis-1-v1",
   *        user_question: "Show me 5 rows",
   *        manager: ...
   *       },
   *      ...
   *    ]
   *   }
   *  ...
   * }
   * */
  let analysisTree = initialTree;

  /**
   * Flattens the analysis tree into a single object for easy access to any analysis by its ID.
   * Just a duplicate of the analysisTree but in a flat object
   * structure:
   * @type {object}
   */
  let allAnalyses = Object.values(analysisTree).reduce((acc, item) => {
    return {
      ...acc,
      [item.root.analysisId]: item.root,
      // Accumulates child analyses into the flat object, mapping their IDs to their data.
      ...item.analysisList.reduce((acc, child) => {
        return {
          ...acc,
          [child.analysisId]: child,
        };
      }, {}),
    };
  }, {});

  let dataListeners = [];
  let activeAnalysisIdChangeListeners = [];
  let activeAnalysisId = null;
  let activeRootAnalysisId = null;

  let destroyed = false;

  function setAnalysisTree(newAnalysisTree, newAllAnalyses) {
    analysisTree = newAnalysisTree;
    allAnalyses = newAllAnalyses;
    emitDataChange();
  }

  function getAll() {
    return allAnalyses;
  }

  function getTree() {
    return analysisTree;
  }

  function emitDataChange() {
    dataListeners.forEach((l) => l());
  }

  function emitActiveAnalysisIdChange() {
    activeAnalysisIdChangeListeners.forEach((l) => l());
  }

  function subscribeToDataChanges(listener) {
    dataListeners = [...dataListeners, listener];

    return function unsubscribe() {
      dataListeners = dataListeners.filter((l) => l !== listener);
    };
  }

  function subscribeToActiveAnalysisIdChanges(listener) {
    activeAnalysisIdChangeListeners.push(listener);

    return function unsubscribe() {
      activeAnalysisIdChangeListeners = activeAnalysisIdChangeListeners.filter(
        (l) => l !== listener
      );
    };
  }

  function setActiveAnalysisId(analysisId) {
    activeAnalysisId = analysisId;
    emitActiveAnalysisIdChange();
  }

  function setActiveRootAnalysisId(analysisId) {
    activeRootAnalysisId = analysisId;
    emitActiveAnalysisIdChange();
  }

  function getActiveAnalysisId() {
    return activeAnalysisId;
  }

  function getActiveRootAnalysisId() {
    return activeRootAnalysisId;
  }

  function removeAnalysis({ analysisId, isRoot, rootAnalysisId }) {
    const newAnalysisTree = { ...analysisTree };

    // if is root, just delete
    if (isRoot) {
      delete newAnalysisTree[analysisId];
    } else {
      // else find the root analysis and remove the child
      if (rootAnalysisId) {
        const rootAnalysis = newAnalysisTree[rootAnalysisId];
        if (rootAnalysis) {
          rootAnalysis.analysisList = rootAnalysis.analysisList.filter(
            (item) => item.analysisId !== analysisId
          );
        }
      }
    }

    const newAllAnalyses = { ...allAnalyses };
    delete newAllAnalyses[analysisId];

    setAnalysisTree(newAnalysisTree, newAllAnalyses);
  }

  function updateAnalysis({ analysisId, isRoot, updateObj, emit = true }) {
    const newAnalysisTree = { ...analysisTree };

    if (!allAnalyses[analysisId]) {
      console.warn("Analysis not found", analysisId);
      return;
    }

    // if is root, just update
    if (isRoot) {
      newAnalysisTree[analysisId].root = {
        ...newAnalysisTree[analysisId].root,
        ...updateObj,
      };
    }

    // also find the root analysis and update the entry in analysisList
    const rootAnalysisId = allAnalyses[analysisId].rootAnalysisId;

    newAnalysisTree[rootAnalysisId].analysisList = newAnalysisTree[
      rootAnalysisId
    ].analysisList.map((item) => {
      if (item.analysisId === analysisId) {
        return {
          ...item,
          ...updateObj,
        };
      }
      return item;
    });

    const newAllAnalyses = { ...allAnalyses };

    newAllAnalyses[analysisId] = {
      ...newAllAnalyses[analysisId],
      ...updateObj,
    };

    // don't emit in this case to prevent unnecessary re renders
    setAnalysisTree(newAnalysisTree, newAllAnalyses, emit);
  }

  async function submit({
    question,
    keyName,
    rootAnalysisId = null,
    isRoot = false,
    directParentId = null,
    sqlOnly = false,
    isTemp = false,
  }) {
    // if we have an active root analysis, we're appending to that
    // otherwise we're starting a new analysis
    const newId = "analysis-" + v4();
    let newAnalysis = {
      analysisId: newId,
      isRoot: isRoot,
      rootAnalysisId: isRoot ? newId : rootAnalysisId,
      user_question: question,
      existingAnalysisData: null,
      isTemp,
      keyName,
      sqlOnly,
    };

    newAnalysis.directParentId = directParentId;

    // this is extra stuff we will send to the backend when creating an entry
    // in the db
    let createAnalysisRequestExtraParams = {
      user_question: question,
      is_root_analysis: isRoot,
      root_analysis_id: rootAnalysisId,
      direct_parent_id: directParentId,
    };

    newAnalysis.createAnalysisRequestBody = {
      // the backend receives an extra param called "other_data" when appending to the table
      other_data: createAnalysisRequestExtraParams,
      sql_only: sqlOnly,
    };

    let newAnalysisTree = { ...analysisTree };

    // if we have an active root analysis, we're appending to that
    // otherwise we're starting a new root analysis
    if (rootAnalysisId) {
      const rootAnalysis = analysisTree[rootAnalysisId].root;
      newAnalysisTree[rootAnalysis.analysisId].analysisList.push(newAnalysis);
    } else {
      // this is the root
      newAnalysisTree[newAnalysis.analysisId] = {
        root: newAnalysis,
        analysisList: [newAnalysis],
      };
    }

    const newAllAnalyses = {
      ...allAnalyses,
      [newAnalysis.analysisId]: newAnalysis,
    };

    setAnalysisTree(newAnalysisTree, newAllAnalyses);

    return {
      newId,
      newAnalysis,
    };
  }

  function reset() {
    setAnalysisTree({}, {});
  }

  return {
    subscribeToDataChanges,
    getTree,
    getAll,
    subscribeToActiveAnalysisIdChanges,
    setActiveAnalysisId,
    setActiveRootAnalysisId,
    getActiveAnalysisId,
    getActiveRootAnalysisId,
    submit,
    removeAnalysis,
    updateAnalysis,
    getMgrId: () => _id,
    reset,
  };
}
