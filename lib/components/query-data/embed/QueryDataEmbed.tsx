"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageManagerContext,
  SingleSelect,
  SpinningLoader,
} from "@ui-components";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "../../defog-analysis-agent-embed/tab-content/MetadataTabContent";
import { PreviewDataTabContent } from "../../defog-analysis-agent-embed/tab-content/PreviewDataTabContent";
import {
  createQueryDataEmbedConfig,
  QueryDataEmbedContext,
} from "../../context/QueryDataEmbedContext";
import { QueryDataNewDb } from "./QueryDataNewDb";
import ErrorBoundary from "../../../../lib/components/common/ErrorBoundary";
import { AnalysisTreeViewer } from "@agent";
import { getMetadata } from "@utils/utils";

interface EmbedProps {
  /**
   * The hashed password.
   */
  token: string;
  /**
   * Whether the search bar is draggable
   */
  searchBarDraggable?: boolean;
  /**
   * Whether to hide the raw analysis of results.
   */
  hideRawAnalysis?: boolean;
  /**
   * The list of charts that *will be hidden*.
   */
  hiddenCharts?: Array<string>;
  /**
   * Whether to hide the SQL/Code tab.
   */
  hideSqlTab?: boolean;
  /**
   * Whether to hide the "view data structure" and "preview data" tabs.
   */
  hidePreviewTabs?: boolean;
  /**
   * The API endpoint to use for the requests. Default is https://demo.defog.ai.
   */
  apiEndpoint: string;
  /**
   * Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
   */
  showAnalysisUnderstanding?: boolean;
  /**
   * Whether to show tool code.
   */
  showCode?: boolean;
  /**
   * Initial db names.
   */
  initialDbList: { dbName: string; predefinedQuestions: string[] }[];
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
  initialDbList = [],
  initialTrees = {},
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  showAnalysisUnderstanding = true,
  searchBarDraggable = false,
  showCode = false,
  allowDashboardAdd = true,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  onTreeChange = (...args) => {},
}: EmbedProps) {
  const [initialised, setInitialised] = useState(false);

  const [embedConfig, setEmbedConfig] = useState(
    createQueryDataEmbedConfig({
      token,
      hideRawAnalysis,
      hiddenCharts,
      hideSqlTab,
      hidePreviewTabs,
      apiEndpoint,
    })
  );

  embedConfig.updateConfig = (updates) => {
    setEmbedConfig((prev) => ({ ...prev, ...updates }));
  };

  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: newApiKey } = useRef<string>(crypto.randomUUID().toString());

  const [dbList, setDbList] = useState<
    {
      dbName: string;
      predefinedQuestions: string[];
      metadata?: any;
    }[]
  >([
    ...initialDbList,
    {
      dbName: newApiKey,
      predefinedQuestions: [],
      metadata: null,
    },
  ]);

  const trees = useRef(
    Object.keys(initialTrees || {}).reduce((acc, k) => {
      const initialDb = initialDbList.find((db) => db.dbName === k);
      if (!initialDb) return acc;

      acc[k] = {
        dbName: k,
        predefinedQuestions: initialDb.predefinedQuestions,
        treeManager: AnalysisTreeManager(initialTrees[k] || {}),
      };
      return acc;
    }, {})
  );

  useEffect(() => {
    async function setupMetadata() {
      dbList.forEach(async (db) => {
        if (db.dbName === newApiKey) return;
        const fetchedMetadata = {};
        try {
          const metadata = await getMetadata(apiEndpoint, token, db.dbName);
          fetchedMetadata[db.dbName] = metadata;
        } catch (error) {
          console.error(error);
          fetchedMetadata[db.dbName] = null;
        }

        setDbList((prev) => {
          return prev.map((d) => {
            return {
              ...d,
              metadata: fetchedMetadata[d.dbName],
            };
          });
        });

        setInitialised(true);
      });
    }

    setupMetadata();
  }, []);

  const [selectedDb, setSelectedDb] = useState(
    dbList.length ? dbList[0] : null
  );

  const message = useContext(MessageManagerContext);

  const selector = useMemo(() => {
    return (
      <SingleSelect
        label="Select database"
        rootClassNames="mb-2"
        defaultValue={newApiKey}
        allowClear={false}
        placeholder="Select Database"
        allowCreateNewOption={false}
        options={[
          {
            value: newApiKey,
            label: "Upload new",
          },
        ].concat(
          dbList.map((db) => ({
            value: db.dbName,
            label: db.dbName,
          }))
        )}
        onChange={(v: string) => {
          const matchingDb = dbList.find((db) => db.dbName === v);
          setSelectedDb(matchingDb || dbList[0]);
        }}
      />
    );
  }, [selectedDb, dbList]);

  const content = useMemo(() => {
    if (!selectedDb) return null;

    if (selectedDb.dbName === newApiKey) {
      return (
        <QueryDataNewDb
          apiEndpoint={apiEndpoint}
          token={token}
          onDbCreated={async (dbName) => {
            try {
              trees.current = {
                ...trees.current,
                [dbName]: {
                  dbName: dbName,
                  treeManager: AnalysisTreeManager(),
                },
              };

              const metadata = await getMetadata(apiEndpoint, token, dbName);

              setDbList((prev) => [
                ...prev,
                { dbName, predefinedQuestions: [], metadata },
              ]);

              setSelectedDb(
                dbList.find((db) => db.dbName === dbName) || dbList[0]
              );
            } catch (error) {
              message.error(error);
            }
          }}
        />
      );
    } else {
      return (
        <ErrorBoundary>
          <AnalysisTreeViewer
            beforeTitle={selector}
            searchBarDraggable={searchBarDraggable}
            dbName={selectedDb.dbName}
            metadata={selectedDb.metadata}
            analysisTreeManager={trees.current[selectedDb.dbName].treeManager}
            autoScroll={true}
            predefinedQuestions={selectedDb.predefinedQuestions || []}
            onTreeChange={(dbName, tree) => {
              try {
                onTreeChange(dbName, tree);
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </ErrorBoundary>
      );
    }
  }, [selectedDb.dbName, selector]);

  return (
    <QueryDataEmbedContext.Provider value={embedConfig}>
      <div className="relative w-full h-full">
        {initialised ? <>{content}</> : <SpinningLoader />}
      </div>
    </QueryDataEmbedContext.Provider>
  );
}
