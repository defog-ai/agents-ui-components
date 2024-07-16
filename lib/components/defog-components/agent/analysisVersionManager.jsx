// managers a version "tree" of many analysis
// used as a manager by analysisVersionViewer

import { v4 } from "uuid";

export function AnalysisVersionManager() {
  // an object that stores all analysis in this "session"
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
  let sessionAnalyses = {};
  // just a duplicate of the above but in a flat object
  let allAnalyses = {};

  let listeners = [];
  let destroyed = false;

  function setSessionAnalyses(newSessionAnalysis, newAllAnalyses) {
    sessionAnalyses = newSessionAnalysis;
    allAnalyses = newAllAnalyses;
    emitDataChange();
  }

  function getAll() {
    return allAnalyses;
  }

  function getTree() {
    return sessionAnalyses;
  }

  function emitDataChange() {
    listeners.forEach((l) => l());
  }

  function subscribeToDataChanges(listener) {
    listeners = [...listeners, listener];

    return function unsubscribe() {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function removeAnalysis(analysisData, isRoot, id) {
    const newSessionAnalyses = { ...sessionAnalyses };

    // if is root, just delete
    if (isRoot) {
      delete newSessionAnalyses[id];
    } else {
      // else find the root analysis and remove the version
      const rootAnalysisId = analysisData.root_analysis_id;
      if (rootAnalysisId) {
        const rootAnalysis = newSessionAnalyses[rootAnalysisId];
        if (rootAnalysis) {
          rootAnalysis.versionList = rootAnalysis.versionList.filter(
            (item) => item.analysisId !== id
          );
        }
      }
    }

    const newAllAnalyses = { ...allAnalyses };
    delete newAllAnalyses[id];

    setSessionAnalyses(newSessionAnalyses, newAllAnalyses);
  }

  function submit({
    question,
    rootAnalysisId = null,
    isRoot = false,
    directParentId = null,
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
    };

    let newSessionAnalyses = { ...sessionAnalyses };

    // if we have an active root analysis, we're appending to that
    // otherwise we're starting a new root analysis
    if (!rootAnalysisId) {
      newSessionAnalyses[newAnalysis.analysisId] = {
        root: newAnalysis,
        versionList: [newAnalysis],
      };
    } else {
      const rootAnalysis = sessionAnalyses[rootAnalysisId].root;
      newSessionAnalyses[rootAnalysis.analysisId].versionList.push(newAnalysis);
    }

    const newAllAnalyses = {
      ...allAnalyses,
      [newAnalysis.analysisId]: newAnalysis,
    };

    setSessionAnalyses(newSessionAnalyses, newAllAnalyses);

    return {
      newId,
      newAnalysis,
    };
  }

  return {
    subscribeToDataChanges,
    getTree,
    getAll,
    submit,
    removeAnalysis,
  };
}
