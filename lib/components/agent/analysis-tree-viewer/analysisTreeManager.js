import { v4 } from "uuid";

/**
 * @typedef {Object} CreateAnalysisRequestBody
 * @property {Object} initialisation_details
 * @property {string | null} direct_parent_id - Id of the direct parent of this analysis. `null` if this is a root analysis (aka `is_root_analysis` is true)
 * @property {boolean} is_root_analysis - If this is a root analysis (aka `direct_parent_id` is null).
 * @property {string | null} root_analysis_id - ID of the root. If this is a root analysis (aka `is_root_analysis` is `true`), it is the id of this analysis itself.
 * @property {string | null} user_question - User question to initialise this analysis with, if any. If null, a blank analysis will be created.
 */

/**
 * @typedef {Object} Analysis
 * @property {import("../analysis/analysisManager.js").AnalysisManager} analysisManager - This analysis's manager.
 * @property {string} analysisId - ID of the analysis
 * @property {CreateAnalysisRequestBody} createAnalysisRequestBody - HTTP Request body that is sent when creating an analysis. Useful if we want the analysis to be initialised and run with a pre defined question, rather than a blank analysis.
 * @property {string | null} directParentId - Id of the direct parent of this analysis. `null` if this is a root analysis (aka `is_root_analysis` is true)
 * @property {boolean} isRoot - Is this a root analysis?
 * @property {boolean} isTemp: false
 * @property {string} keyName: "Restaurants"
 * @property {string} rootAnalysisId - ID of the root.If this is a root analysis (aka `isRoot` is `true`), it is equal to analysisId.
 * @property {boolean} sqlOnly - Is this an SQL only analysis?
 * @property {string} user_question - User question of this analysis.
 *
 */

/**
 * @typedef {{[analysisId: string]: {root: Analysis, analysisList: Analysis[]}}} AnalysisTree
 */

/**
 * Manages a hierarchical structure of analyses, allowing for operations on a tree of analysis items.
 * This manager is utilized by the AnalysisTreeViewer to handle and visualize analysis data in a structured manner.
 * Constructs an AnalysisTreeManager instance.
 * @param {AnalysisTree} initialTree - The initial structure of the analysis tree. Defaults to an empty object.
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

  let analysisTree = validateAnalysisTree(initialTree) ? initialTree : {};

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
    analysisId,
    rootAnalysisId = null,
    isRoot = false,
    directParentId = null,
    sqlOnly = false,
    isTemp = false,
  }) {
    let newAnalysis = {
      analysisId: analysisId,
      isRoot: isRoot,
      rootAnalysisId: isRoot ? analysisId : rootAnalysisId,
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
      // the backend receives an extra param called "initialisation_details" when appending to the table
      initialisation_details: createAnalysisRequestExtraParams,
      sql_only: sqlOnly,
    };

    let newAnalysisTree = { ...analysisTree };

    // if this isn't a root, we're appending to children of the root
    // otherwise we're starting a new root analysis
    if (!isRoot) {
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
      newAnalysis,
    };
  }

  function reset() {
    setAnalysisTree({}, {});
    setActiveAnalysisId(null);
    setActiveRootAnalysisId(null);
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

/**
 * Validates an analysis object. This is to prevent UI crashes in case of illegal/abnormal analyses being stored in localStorage/passed down for some reason.
 *
 * An analysis should:
 * - Be an object with the following keys: analysisId, createAnalysisRequestBody, directParentId, isRoot, isTemp, keyName, rootAnalysisId, sqlOnly, user_question
 * - analysisId should be a string
 * - createAnalysisRequestBody should be an object
 * - directParentId should be a string or null
 * - isRoot should be a boolean
 * - isTemp should be a boolean
 * - keyName should be a string
 * - rootAnalysisId should be a string
 * - sqlOnly should be a boolean
 * - user_question should be a string
 *
 * @param {Analysis} analysis
 * @returns {boolean} If this analysis is valid or not
 */

export function validateAnalysis(analysis) {
  if (!analysis) return null;

  if (typeof analysis !== "object") return false;

  if (!analysis.analysisId) return false;
  if (typeof analysis.analysisId !== "string") return false;
  if (!analysis.createAnalysisRequestBody) return false;
  if (typeof analysis.createAnalysisRequestBody !== "object") return false;
  if (
    typeof analysis.directParentId !== "string" &&
    analysis.directParentId !== null
  )
    return false;

  if (typeof analysis.isRoot !== "boolean") return false;
  if (typeof analysis.isTemp !== "boolean") return false;
  if (typeof analysis.keyName !== "string") return false;
  if (typeof analysis.rootAnalysisId !== "string") return false;
  if (typeof analysis.sqlOnly !== "boolean") return false;
  if (typeof analysis.user_question !== "string") return false;

  return true;
}

/**
 * Validates an analysis tree. This is to prevent UI crashes in case of illegal/abnormal trees being stored in localStorage/passed down for some reason.
 * An analysis tree should:
 * - Be an object with string keys.
 * - And all values should be objects with two keys: root and analysisList
 * - root should be an object adhering to the analysis type.
 * - analysisList should be an array of analyses.
 * - The first item of the analysisList should be exactly the same as the root.
 *
 * @param {AnalysisTree} tree
 * @returns {boolean} If this tree is valid or not
 */
export function validateAnalysisTree(tree) {
  if (!tree) return null;

  if (typeof tree !== "object") return false;

  for (const key in tree) {
    if (typeof key !== "string") return false;

    const value = tree[key];

    if (!value || typeof value !== "object") return false;

    if (!value.root || !value.analysisList) return false;

    if (typeof value.root !== "object" || !Array.isArray(value.analysisList))
      return false;

    if (!validateAnalysis(value.root)) return false;

    if (!value.analysisList.length) return false;

    if (value.analysisList[0].analysisId !== value.root.analysisId)
      return false;

    if (key !== value.root.analysisId) return false;

    for (const analysis of value.analysisList) {
      if (!validateAnalysis(analysis)) return false;

      if (analysis.rootAnalysisId !== value.root.analysisId) return false;
    }
  }

  return true;
}
