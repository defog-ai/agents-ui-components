import { AnalysisManager } from "../analysis/analysisManager.js";

export interface CreateAnalysisRequestBody {
  initialisation_details?: { [key: string]: any };
  direct_parent_id?: string | null;
  is_root_analysis?: boolean;
  root_analysis_id?: string | null;
  user_question?: string | null;
  key_name?: string | null;
  sql_only?: boolean;
}

interface Analysis {
  analysisManager?: AnalysisManager;
  analysisId: string;
  createAnalysisRequestBody: CreateAnalysisRequestBody;
  directParentId: string | null;
  timestamp: number;
  isRoot: boolean;
  isTemp: boolean;
  keyName: string;
  rootAnalysisId: string;
  sqlOnly: boolean;
  user_question: string;
}

export type AnalysisTree = {
  [analysisId: string]: { root: Analysis; analysisList: Analysis[] };
};

type Listener = () => void;

type FlatAnalysisTree = { [analysisId: string]: Analysis };

type Unsubscribe = () => void;

export interface AnalysisTreeNode extends Analysis {
  children: AnalysisTreeNode[];
  parent: AnalysisTreeNode | null;
  /**
   * Returns a flat list of all children of this node, ordered by depth first.
   */
  flatOrderedChildren: AnalysisTreeNode[];
  /**
   * Flat list of all parents of this node, going up the tree from this node.
   */
  allParents: AnalysisTreeNode[];
}

export interface NestedAnalysisTree {
  [analysisId: string]: AnalysisTreeNode;
}

export interface AnalysisTreeManager {
  subscribeToDataChanges: (listener: Listener) => Unsubscribe;
  getTree: () => AnalysisTree;
  getNestedTree: () => NestedAnalysisTree;
  getAll: () => FlatAnalysisTree;
  subscribeToActiveAnalysisIdChanges: (listener: Listener) => Unsubscribe;
  setActiveAnalysisId: (analysisId: string | null) => void;
  setActiveRootAnalysisId: (analysisId: string | null) => void;
  getActiveAnalysisId: () => string | null;
  getActiveRootAnalysisId: () => string | null;
  submit: (params: {
    question: string;
    keyName: string;
    analysisId: string;
    rootAnalysisId: string | null;
    isRoot?: boolean;
    directParentId?: string | null;
    sqlOnly?: boolean;
    isTemp?: boolean;
  }) => Promise<{ newAnalysis: Analysis }>;
  removeAnalysis: (params: {
    analysisId: string;
    isRoot: boolean;
    rootAnalysisId: string;
  }) => void;
  updateAnalysis: (params: {
    analysisId: string;
    isRoot: boolean;
    updateObj: Partial<Analysis>;
    emit?: boolean;
  }) => void;
  getMgrId: () => string;
  reset: () => void;
}

/**
 * Manages a hierarchical structure of analyses, allowing for operations on a tree of analysis items.
 * This manager is utilized by the AnalysisTreeViewer to handle and visualize analysis data in a structured manner.
 * Constructs an AnalysisTreeManager instance.
 * @param {AnalysisTree} initialTree - The initial structure of the analysis tree. Defaults to an empty object.
 * @param {string} id - The unique identifier for the root of the analysis tree. Defaults to a generated UUID.
 */
export function AnalysisTreeManager(
  initialTree: AnalysisTree = {},
  id: string | null = crypto.randomUUID()
) {
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
   */
  let allAnalyses: FlatAnalysisTree = Object.values(analysisTree).reduce(
    (acc, item) => {
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
    },
    {}
  );

  let dataListeners: Listener[] = [];
  let activeAnalysisIdChangeListeners: Listener[] = [];
  let activeAnalysisId: string | null = null;
  let activeRootAnalysisId: string | null = null;

  let destroyed = false;

  function setAnalysisTree(
    newAnalysisTree: AnalysisTree,
    newAllAnalyses: FlatAnalysisTree
  ) {
    analysisTree = newAnalysisTree;
    allAnalyses = newAllAnalyses;
    emitDataChange();
  }

  function getAll(): FlatAnalysisTree {
    return allAnalyses;
  }

  function getTree(): AnalysisTree {
    return analysisTree;
  }

  function flatOrderedChildren(node: AnalysisTreeNode): AnalysisTreeNode[] {
    return [...node.children, ...node.children.flatMap(flatOrderedChildren)];
  }

  function getAllParents(node: AnalysisTreeNode): AnalysisTreeNode[] {
    const parents: AnalysisTreeNode[] = [];
    let current: AnalysisTreeNode | null = node;
    while (current) {
      parents.push(current);
      current = current.parent;
    }
    return parents;
  }

  function getNestedTree(): NestedAnalysisTree {
    const nestedTree: NestedAnalysisTree = {};

    Object.keys(allAnalyses).forEach((analysisId) => {
      nestedTree[analysisId] = {
        ...allAnalyses[analysisId],
        children: [],
        parent: null,
        flatOrderedChildren: [],
        allParents: [],
      };
    });

    Object.keys(nestedTree).forEach((analysisId) => {
      if (nestedTree[analysisId].directParentId) {
        const parent = nestedTree[nestedTree[analysisId].directParentId];
        if (parent) {
          nestedTree[analysisId].parent = parent;
          nestedTree[analysisId].allParents = getAllParents(parent);
          parent.children.push(nestedTree[analysisId]);
          // sort the new children by timestamp
          parent.children.sort((a, b) => b.timestamp - a.timestamp);
        }
      }
    });

    // only keep root analyses at the top level
    for (const analysisId in nestedTree) {
      if (!nestedTree[analysisId].isRoot) {
        delete nestedTree[analysisId];
      } else {
        nestedTree[analysisId].flatOrderedChildren = flatOrderedChildren(
          nestedTree[analysisId]
        );
      }
    }

    return nestedTree;
  }

  function emitDataChange() {
    dataListeners.forEach((l) => l());
  }

  function emitActiveAnalysisIdChange() {
    activeAnalysisIdChangeListeners.forEach((l) => l());
  }

  function subscribeToDataChanges(listener: Listener): Unsubscribe {
    dataListeners = [...dataListeners, listener];

    return function unsubscribe() {
      dataListeners = dataListeners.filter((l) => l !== listener);
    };
  }

  function subscribeToActiveAnalysisIdChanges(listener: Listener): Unsubscribe {
    activeAnalysisIdChangeListeners.push(listener);

    return function unsubscribe() {
      activeAnalysisIdChangeListeners = activeAnalysisIdChangeListeners.filter(
        (l) => l !== listener
      );
    };
  }

  function setActiveAnalysisId(analysisId: string | null) {
    activeAnalysisId = analysisId;
    emitActiveAnalysisIdChange();
  }

  function setActiveRootAnalysisId(analysisId: string | null) {
    activeRootAnalysisId = analysisId;
    emitActiveAnalysisIdChange();
  }

  function getActiveAnalysisId(): string | null {
    return activeAnalysisId;
  }

  function getActiveRootAnalysisId(): string | null {
    return activeRootAnalysisId;
  }

  function removeAnalysis({
    analysisId,
    isRoot,
    rootAnalysisId,
  }: {
    analysisId: string;
    isRoot: boolean;
    rootAnalysisId: string;
  }) {
    const newAnalysisTree = { ...analysisTree };

    // if is root, just delete
    if (isRoot) {
      delete newAnalysisTree[analysisId];
    } else {
      // else find the root analysis and remove the child
      if (rootAnalysisId) {
        const rootAnalysis = analysisTree[rootAnalysisId].root;
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

  function updateAnalysis({
    analysisId,
    isRoot,
    updateObj,
    emit = true,
  }: {
    analysisId: string;
    isRoot: boolean;
    updateObj: Partial<Analysis>;
    emit?: boolean;
  }) {
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
    setAnalysisTree(newAnalysisTree, newAllAnalyses);
  }

  async function submit({
    question,
    keyName,
    analysisId,
    rootAnalysisId,
    isRoot = false,
    directParentId = null,
    sqlOnly = false,
    isTemp = false,
  }: {
    question: string;
    keyName: string;
    analysisId: string;
    rootAnalysisId: string;
    isRoot?: boolean;
    directParentId?: string | null;
    sqlOnly?: boolean;
    isTemp?: boolean;
  }) {
    let newAnalysis: Analysis = {
      analysisId: analysisId,
      isRoot: isRoot,
      rootAnalysisId: isRoot ? analysisId : rootAnalysisId,
      user_question: question,
      isTemp,
      keyName,
      sqlOnly,
      timestamp: Date.now(),
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
    getNestedTree,
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
 * - Be an object with the following keys: analysisId, createAnalysisRequestBody, directParentId, isRoot, isTemp, keyName, rootAnalysisId, sqlOnly, userQuestion
 * - analysisId should be a string
 * - createAnalysisRequestBody should be an object
 * - directParentId should be a string or null
 * - isRoot should be a boolean
 * - isTemp should be a boolean
 * - keyName should be a string
 * - rootAnalysisId should be a string
 * - sqlOnly should be a boolean
 * - userQuestion should be a string
 *
 * @returns {boolean} If this analysis is valid or not
 */

export function validateAnalysis(analysis: Analysis): boolean {
  if (!analysis) return false;

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
 * @returns {boolean} If this tree is valid or not
 */
export function validateAnalysisTree(tree: AnalysisTree): boolean {
  if (!tree) return false;

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
