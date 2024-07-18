// managers a version "tree" of many analysis
// used as a manager by analysisVersionViewer

import { v4 } from "uuid";

export function AnalysisVersionManager(initialTree = {}, id = v4()) {
  // an object that stores all analysis in this "session" as a tree
  // structure:
  // {
  //  rootAnalysisId: {
  //     root: {
  //       analysisId: "analysis-1",
  //       user_question: "Show me 5 rows",
  //     },
  //     versionList: [
  //       {
  //        analysisId: "analysis-1-v1",
  //        user_question: "Show me 5 rows",
  //        manager: ...
  //       },
  //      ...
  //    ]
  //   }
  //  ...
  // }
  let _id = id;
  let analysisTree = initialTree;
  // just a duplicate of the above but in a flat object
  let allAnalyses = Object.values(analysisTree).reduce((acc, item) => {
    return {
      ...acc,
      [item.root.analysisId]: item.root,
      ...item.versionList.reduce((acc, version) => {
        return {
          ...acc,
          [version.analysisId]: version,
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
      // else find the root analysis and remove the version
      if (rootAnalysisId) {
        const rootAnalysis = newAnalysisTree[rootAnalysisId];
        if (rootAnalysis) {
          rootAnalysis.versionList = rootAnalysis.versionList.filter(
            (item) => item.analysisId !== analysisId
          );
        }
      }
    }

    const newAllAnalyses = { ...allAnalyses };
    delete newAllAnalyses[analysisId];

    setAnalysisTree(newAnalysisTree, newAllAnalyses);
  }

  function submit({
    question,
    rootAnalysisId = null,
    isRoot = false,
    directParentId = null,
    sqlOnly = false,
  }) {
    // if we have an active root analysis, we're appending to that
    // otherwise we're starting a new analysis
    const newId = "analysis-" + v4();
    let newAnalysis = {
      analysisId: newId,
      isRoot: isRoot,
      rootAnalysisId: isRoot ? newId : rootAnalysisId,
      user_question: question,
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
    if (!rootAnalysisId) {
      newAnalysisTree[newAnalysis.analysisId] = {
        root: newAnalysis,
        versionList: [newAnalysis],
      };
    } else {
      const rootAnalysis = analysisTree[rootAnalysisId].root;
      newAnalysisTree[rootAnalysis.analysisId].versionList.push(newAnalysis);
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
    getMgrId: () => _id,
  };
}
