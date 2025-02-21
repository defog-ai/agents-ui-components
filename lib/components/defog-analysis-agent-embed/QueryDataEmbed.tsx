"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { MessageManagerContext, Tabs } from "@ui-components";
import { EmbedScaffolding } from "./EmbedScaffolding";
import { twMerge } from "tailwind-merge";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../query-data/analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./tab-content/MetadataTabContent";
import { AnalysisTabContent } from "./tab-content/AnalysisTabContent";
import { PreviewDataTabContent } from "./tab-content/PreviewDataTabContent";
import { TabNullState } from "./tab-content/TabNullState";
import { QueryDataEmbedContext } from "../context/QueryDataEmbedContext";
import { QueryDataNewDb } from "../query-data/embed/QueryDataNewDb";

interface EmbedProps {
  /**
   * The hashed password.
   */
  token: string;
  /**
   * Whether to hide the raw analysis of results.
   */
  hideRawAnalysis: boolean;
  /**
   * The list of charts that *will be hidden*.
   */
  hiddenCharts: Array<string>;
  /**
   * Whether to hide the SQL/Code tab.
   */
  hideSqlTab: boolean;
  /**
   * Whether to hide the "view data structure" and "preview data" tabs.
   */
  hidePreviewTabs: boolean;
  /**
   * The API endpoint to use for the requests. Default is https://demo.defog.ai.
   */
  apiEndpoint: string;
  /**
   * Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
   */
  showAnalysisUnderstanding: boolean;
  /**
   * Whether to show tool code.
   */
  showCode: boolean;
  /**
   * Initial db names.
   */
  initialDbNames: string[];
  /**
   * Whether to allow addition to dashboards.
   */
  allowDashboardAdd: boolean;
  /**
   * The predefined questions for the uploaded CSVs
   */
  uploadedCsvPredefinedQuestions: Array<string>;
  /**
   * Callback for when the analysis tree changes for a particular Db. Will be called on addition or removal of analyses.
   */
  onTreeChange: (dbName: string, tree: AnalysisTree) => void;
  /**
   * An object of initial trees to populate the UI with.
   */
  initialTrees: { [DbName: string]: {} };
}

export function QueryDataEmbed({
  apiEndpoint,
  token,
  initialDbNames = [],
  initialTrees = {},
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  onTreeChange = (...args) => {},
}: EmbedProps) {
  const [dbNames, setDbNames] = useState(initialDbNames);

  const trees = useRef(
    Object.keys(initialTrees || {}).reduce((acc, k) => {
      acc[k] = {
        dbName: k,
        treeManager: AnalysisTreeManager(initialTrees[k] || {}),
      };
      return acc;
    }, {})
  );

  const [selectedDbName, setSelectedDbName] = useState(
    dbNames.length ? dbNames[0] : null
  );

  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: newApiKey } = useRef<string>(crypto.randomUUID().toString());

  if (selectedDbName === newApiKey) {
    return (
      <QueryDataNewDb
        apiEndpoint={apiEndpoint}
        token={token}
        onDbCreated={(dbName) => {
          trees.current = {
            ...trees.current,
            [dbName]: {
              dbName: dbName,
              treeManager: AnalysisTreeManager(),
            },
          };
          setDbNames((prev) => [...prev, dbName]);
          setSelectedDbName(dbName);
        }}
      />
    );
  }
}
