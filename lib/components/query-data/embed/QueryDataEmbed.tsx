"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Modal,
  SingleSelect,
  SpinningLoader,
} from "@ui-components";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./MetadataTabContent";
// import { PreviewDataTabContent } from "../../defog-analysis-agent-embed/tab-content/PreviewDataTabContent";
import {
  createQueryDataEmbedConfig,
  QueryDataEmbedContext,
} from "../../context/QueryDataEmbedContext";
import { QueryDataNewDb } from "./QueryDataNewDb";
import ErrorBoundary from "../../../../lib/components/common/ErrorBoundary";
import { AnalysisTreeViewer } from "@agent";
import { getMetadata } from "@utils/utils";
import { Tab, Tabs } from "../../../../lib/components/core-ui/Tabs";
import { twMerge } from "tailwind-merge";

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
   * Initial db names.
   */
  initialDbList: { name: string; predefinedQuestions: string[] }[];
  /**
   * Whether to allow addition to dashboards.
   */
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
  searchBarDraggable = false,
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
      name: string;
      predefinedQuestions: string[];
      metadata?: any;
    }[]
  >(initialDbList);

  const trees = useRef(
    initialDbList.reduce((acc, db) => {
      acc[db.name] = {
        dbName: db.name,
        predefinedQuestions: db.predefinedQuestions,
        treeManager: AnalysisTreeManager(initialTrees[db.name] || {}),
      };

      return acc;
    }, {})
  );

  const [selectedDb, setSelectedDb] = useState(null);

  const { current: message } = useRef(MessageManager());

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function setupMetadata() {
      const fetchedMetadata = {};
      for await (const db of dbList) {
        if (db.name === newApiKey) continue;
        try {
          const metadata = await getMetadata(apiEndpoint, token, db.name);
          fetchedMetadata[db.name] = metadata;
        } catch (error) {
          console.error(error);
          fetchedMetadata[db.name] = null;
        }
      }

      const newDbList = dbList.map((d) => {
        return {
          ...d,
          metadata: fetchedMetadata[d.name],
        };
      });

      setSelectedDb(newDbList[0]);

      setDbList(newDbList);

      setInitialised(true);
    }

    setupMetadata();
  }, []);

  const selector = useMemo(() => {
    if (!selectedDb || !initialised) return null;
    return (
      <SingleSelect
        label="Select database"
        popupClassName="!max-w-full"
        rootClassNames="mb-2"
        value={selectedDb?.name}
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
            value: db.name,
            label: db.name,
          }))
        )}
        onChange={(v: string) => {
          const matchingDb = dbList.find((db) => db.name === v);
          if (v === newApiKey) {
            setModalOpen(true);
          } else {
            setSelectedDb(matchingDb || dbList[0]);
          }
        }}
      />
    );
  }, [selectedDb, dbList]);

  const wasUploaded = useRef<string | null>(null);

  useEffect(() => {
    if (wasUploaded.current) {
      setSelectedDb(
        dbList.find((db) => db.name === wasUploaded.current) || dbList[0]
      );
      wasUploaded.current = null;
    }
  }, [dbList]);

  const treeContent = useMemo(() => {
    if (!selectedDb || !initialised) return null;

    return (
      <ErrorBoundary>
        <AnalysisTreeViewer
          defaultSidebarOpen={true}
          beforeTitle={selector}
          searchBarDraggable={searchBarDraggable}
          dbName={selectedDb.name}
          metadata={selectedDb.metadata}
          analysisTreeManager={trees.current[selectedDb.name].treeManager}
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
  }, [selectedDb, selector, initialised]);

  const dataStructureContent = useMemo(() => {
    if (!selectedDb || !initialised) return null;
    return <MetadataTabContent metadata={selectedDb.metadata} />;
  }, [dbList, selectedDb, initialised, selector]);

  const tabs = useMemo<Tab[]>(() => {
    return [
      {
        name: "Query",
        content: treeContent,
      },
      {
        name: "View data structure",
        content: dataStructureContent,
      },
    ];
  }, [treeContent, dataStructureContent]);

  return (
    <MessageManagerContext.Provider value={message}>
      <MessageMonitor rootClassNames={"absolute left-0 right-0"} />
      <QueryDataEmbedContext.Provider value={embedConfig}>
        <div className="relative w-full h-full p-2">
          {initialised ? (
            <Tabs
              size="small"
              tabs={tabs}
              vertical={true}
              contentClassNames="p-0 mt-2 sm:mt-0 bg-white"
              defaultTabClassNames="p-0 sm:mt-0 h-full"
              selectedTabHeaderClasses={(nm) =>
                nm === "Tree" ? "bg-transparent" : ""
              }
            />
          ) : (
            <SpinningLoader />
          )}
          <Modal
            title="Upload new database"
            open={modalOpen}
            footer={false}
            onCancel={() => setModalOpen(false)}
          >
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

                  const metadata = await getMetadata(
                    apiEndpoint,
                    token,
                    dbName
                  );

                  setDbList((prev) => [
                    ...prev,
                    {
                      name: dbName,
                      predefinedQuestions: [
                        "What are the tables available?",
                        "Show me 5 rows",
                      ],
                      metadata,
                    },
                  ]);

                  message.success(
                    "Database uploaded successfully, access it by the name: " +
                      dbName
                  );

                  wasUploaded.current = dbName;
                } catch (error) {
                  message.error(error);
                } finally {
                  setModalOpen(false);
                }
              }}
            />
          </Modal>
        </div>
      </QueryDataEmbedContext.Provider>
    </MessageManagerContext.Provider>
  );
}
