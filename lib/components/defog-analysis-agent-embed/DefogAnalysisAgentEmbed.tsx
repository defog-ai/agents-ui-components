"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { MessageManagerContext, Tabs } from "@ui-components";
import { EmbedScaffolding } from "./EmbedScaffolding";
import { twMerge } from "tailwind-merge";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../agent/analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./tab-content/MetadataTabContent";
import { AnalysisTabContent } from "./tab-content/AnalysisTabContent";
import { PreviewDataTabContent } from "./tab-content/PreviewDataTabContent";
import { TabNullState } from "./tab-content/TabNullState";
import { addParsedCsvToSqlite, cleanTableNameForSqlite } from "../utils/sqlite";
import { EmbedContext } from "../context/EmbedContext";
import { Setup } from "../context/Setup";

export function EmbedInner({
  csvFileDbName = null,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  dbs,
  searchBarDraggable = true,
  searchBarClasses = "",
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
  defaultSidebarOpen = true,
  onTreeChange,
}: Partial<EmbedProps>) {
  const messageManager = useContext(MessageManagerContext);
  const { sqliteConn, token, apiEndpoint, hidePreviewTabs } =
    useContext(EmbedContext);

  const [availableDbs, setAvailableDbs] = useState(dbs);

  const [selectedDbName, setSelectedDbName] = useState(
    dbs.length === 1 ? dbs[0].dbName : null
  );

  useEffect(() => {
    // to handle edge case where the network request to getDbNames resolves
    // after first render
    // we solved this with a loader on query-data, but still keeping this useEffect here
    // to reflect a prop change
    // we also can't convert the above availableDbs to a useMemo
    // because we want to maintain state if there are temp dbs that have been added

    // if the dbs prop changes
    // we know that everything in the new dbs array is non temp
    // so we will replace
    // all non temp dbs with whatever is in the new dbs array
    // and keep the temp dbs as is
    setAvailableDbs((prev) => {
      // get old temp dbs
      const tempDbs = prev.filter((d) => d.isTemp);

      // keep the new dbs + old temp dbs
      return [...dbs, ...tempDbs];
    });

    // also set selected db if there's only one
    if (dbs.length === 1) {
      setSelectedDbName(dbs[0].dbName);
    }
  }, [dbs]);

  const selectedDb = useMemo(() => {
    return availableDbs.find((d) => d.dbName === selectedDbName);
  }, [selectedDbName, availableDbs]);

  const selectedDbMetadata = useMemo(() => {
    return (
      availableDbs.find((d) => d.dbName === selectedDbName)?.metadata || null
    );
  }, [selectedDbName, availableDbs]);

  const selectedDbIsSqlOnly = useMemo(() => {
    return (
      availableDbs.find((d) => d.dbName === selectedDbName)?.sqlOnly || false
    );
  }, [selectedDbName, availableDbs]);

  const selectedDbIsTemp = useMemo(() => {
    return (
      availableDbs.find((d) => d.dbName === selectedDbName)?.isTemp || false
    );
  }, [selectedDbName, availableDbs]);

  const selectedDbManager = useMemo(() => {
    return availableDbs.find((d) => d.dbName === selectedDbName)
      ?.analysisTreeManager;
  }, [selectedDbName, availableDbs]);

  const selectedDbPredefinedQuestions = useMemo(() => {
    return (
      availableDbs.find((d) => d.dbName === selectedDbName)
        ?.predefinedQuestions || []
    );
  }, [selectedDbName, availableDbs]);

  const [fileUploading, setFileUploading] = useState(false);

  /**
   * Adds a csv to sqlite db.
   *
   * If the file size is >10mb, it will raise an error.
   *
   * @param {Object} param0
   * @param {File} param0.file - The file object.
   * @param {{dataIndex: string, title: string, key: string}[]} param0.columns - The columns of the csv.
   * @param {{[column_name: string]: any}[]} param0.rows - The rows of the csv.
   *
   * @returns {{columns: {dataIndex: string, title: string, key: string}[], csvFileDbName: string, metadata: {column_name: string, table_name: string, data_type: string, column_description?: string}[], tableData: {sqlite_table_name: {data: any[], columns: string[]}}, sqliteTableName: string, newDbName: string}}
   */
  const addCsvToSqlite = async ({ file, columns, rows }) => {
    if (!sqliteConn) {
      throw new Error(
        "SQLite connection not initialized. Please refresh the page and try again. If the error persists, please reach out to us."
      );
    }
    // if file size is >10mb, raise error
    if (limitCsvUploadSize && file.size > maxCsvUploadSize * 1024 * 1024) {
      throw new Error("File size is too large. Max size allowed is 10MB.");
    }

    let newDbName = file.name.split(".")[0];
    // if this already exists, add a random number to the end
    if (availableDbs.find((d) => d.dbName === newDbName)) {
      newDbName = newDbName + "_" + Math.floor(Math.random() * 1000);
    }
    const sqliteTableName = cleanTableNameForSqlite("csv_" + newDbName);

    let tableData = null;
    let metadata = null;

    // also add to sqlite
    // once done uploading, also add it to sqlite db
    if (sqliteConn) {
      const { columnMetadata, fiveRowsAsArraysOfValues } = addParsedCsvToSqlite(
        {
          conn: sqliteConn,
          tableName: sqliteTableName,
          rows: rows,
          columns,
        }
      );

      messageManager.info(
        `Table ${newDbName} parsed, now generating descriptions for columns!`
      );

      // reformat to a format that PreviewDataTabContent expects
      // this is also the format we get back from integration/preview_table endpoint
      tableData = {
        [sqliteTableName]: {
          data: fiveRowsAsArraysOfValues,
          columns: columnMetadata.map((d) => d["dataIndex"]),
        },
      };

      // if any columns have hasMultipleTypes true, then we need to show a warning
      const multipleTypesColumns = columnMetadata.filter(
        (d) => d.hasMultipleTypes
      );

      if (multipleTypesColumns.length > 0) {
        messageManager.warning(
          `Columns ${multipleTypesColumns.map((d) => `'${d.title}'`).join(",")} have values of multiple data types. This might cause issues.`
        );
      }

      // re shape metadata into something defog servers expect
      // this will be stored internally and sent inr request bodies
      // we don't have column descriptions yet
      metadata = columnMetadata.map((d) => ({
        column_name: d.dataIndex,
        table_name: sqliteTableName,
        data_type: d.dataType,
      }));
    }

    return {
      metadata,
      tableData,
      sqliteTableName,
      newDbName,
    };
  };

  const addNewDbToAvailableDbs = async ({
    newDbName,
    metadata,
    tableData,
    sqliteTableName,
    columns,
  }) => {
    // now add it to our db list
    setAvailableDbs((prev) => {
      const newDbs = [...prev];
      // if there's a temp one, replace it
      const tempDb = {
        name: newDbName,
        dbName: csvFileDbName,
        isTemp: true,
        sqlOnly: true,
        metadata: metadata ? metadata : null,
        data: Object.assign({}, tableData || {}),
        columns: columns,
        sqliteTableName,
        metadataFetchingError: metadata ? false : "Error fetching metadata",
        predefinedQuestions: uploadedCsvPredefinedQuestions,
        analysisTreeManager: AnalysisTreeManager(
          {},
          "csv_" + Math.floor(Math.random() * 1000)
        ),
      };

      newDbs.push(tempDb);

      return newDbs;
    });

    // set this to selected db
    setSelectedDbName(newDbName);
  };

  const addExcelToSqlite = async ({ file, sheets }) => {
    const xlsData = {};
    let xlsMetadata = [];

    for (const sheetName in sheets) {
      const { columns, rows } = sheets[sheetName];
      // add all these to the sqlite db
      // without adding them db list (we don't want them to show up as separate dbs)

      const { metadata, tableData, sqliteTableName } = await addCsvToSqlite({
        file: { name: `${sheetName}.csv`, size: file?.size || 0 },
        columns,
        rows,
      });

      xlsData[sqliteTableName] = tableData[sqliteTableName];
      xlsMetadata = xlsMetadata.concat(metadata);
    }

    return { xlsMetadata, xlsData };
  };

  const nullTab = useMemo(
    () => (
      <TabNullState
        availableDbs={availableDbs}
        onSelectDb={(selectedDbName) => setSelectedDbName(selectedDbName)}
        fileUploading={fileUploading}
        onParseCsv={async ({ file, columns, rows }) => {
          try {
            setFileUploading(true);
            const { metadata, tableData, sqliteTableName, newDbName } =
              await addCsvToSqlite({ file, columns, rows });

            await addNewDbToAvailableDbs({
              newDbName,
              metadata,
              tableData,
              sqliteTableName,
              columns,
            });
          } catch (e) {
            messageManager.error("Could not parse your file.");
            console.trace(e);
          } finally {
            setFileUploading(false);
          }
        }}
        onParseExcel={async ({ file, sheets }) => {
          try {
            setFileUploading(true);
            const { xlsData, xlsMetadata } = await addExcelToSqlite({
              file,
              sheets,
            });

            const newDbName = file.name.split(".")[0];

            await addNewDbToAvailableDbs({
              newDbName,
              metadata: xlsMetadata,
              tableData: xlsData,
              sqliteTableName: newDbName,
              columns: xlsMetadata,
            });
          } catch (e) {
            messageManager.error("Could not parse your file.");
            console.trace(e);
          } finally {
            setFileUploading(false);
          }
        }}
      />
    ),
    [availableDbs, fileUploading]
  );

  const tabs = useMemo(() => {
    return [
      {
        name: "Analysis",
        headerClassNames: (selected, tab) =>
          twMerge(
            "bg-gray-100",
            tab.name === "Analysis"
              ? selected
                ? "bg-gray-600 text-white hover:bg-gray-600"
                : ""
              : ""
          ),
        content:
          !selectedDbManager || !selectedDbName || !token ? (
            nullTab
          ) : (
            <AnalysisTabContent
              key={selectedDbName}
              predefinedQuestions={selectedDbPredefinedQuestions}
              isTemp={selectedDbIsTemp}
              dbName={selectedDbName}
              treeManager={selectedDbManager}
              forceSqlOnly={selectedDbIsSqlOnly}
              metadata={selectedDbMetadata}
              searchBarDraggable={searchBarDraggable}
              searchBarClasses={searchBarClasses}
              defaultSidebarOpen={defaultSidebarOpen}
              onTreeChange={onTreeChange}
            />
          ),
      },
      {
        name: "View data structure",
        content: !selectedDb ? (
          nullTab
        ) : (
          <MetadataTabContent
            key={selectedDbName}
            apiEndpoint={apiEndpoint}
            db={selectedDb}
            token={token}
            onGetMetadata={({ metadata, error }) => {
              setAvailableDbs((prev) => {
                const newDbs = [...prev];
                const idx = prev.findIndex((d) => d.dbName === selectedDbName);
                if (idx < 0) return newDbs;
                newDbs[idx] = Object.assign({}, newDbs[idx]);

                // if this is a temp db, then add a property called "sqlite_table_name" in metadata as the actual name
                if (selectedDb.isTemp) {
                  metadata.forEach((m) => {
                    m.sqlite_table_name = selectedDb.sqliteTableName;
                  });
                }

                newDbs[idx].metadata = metadata;
                // if there's an error, don't show the data
                if (error) {
                  newDbs[idx].metadataFetchingError = error;
                  newDbs[idx].data = {};
                  newDbs[idx].dataFetchingError = error || false;
                }

                return newDbs;
              });
            }}
          />
        ),
      },
      {
        name: "Preview data",
        content: !selectedDb ? (
          nullTab
        ) : (
          <PreviewDataTabContent
            key={selectedDbName}
            apiEndpoint={apiEndpoint}
            db={selectedDb}
            token={token}
            onGetData={({ data }) => {
              setAvailableDbs((prev) => {
                const newDbs = [...prev];
                const idx = prev.findIndex((d) => d.dbName === selectedDbName);
                if (idx < 0) return newDbs;

                newDbs[idx] = Object.assign({}, newDbs[idx]);

                newDbs[idx].data = Object.assign({}, data);
                return newDbs;
              });
            }}
          />
        ),
      },
    ].filter((d) =>
      hidePreviewTabs
        ? d.name !== "View data structure" && d.name !== "Preview data"
        : true
    );
  }, [
    selectedDb,
    apiEndpoint,
    searchBarDraggable,
    token,
    nullTab,
    hidePreviewTabs,
  ]);

  useEffect(() => {
    // if the new selected db is temp, empty its tree
    // becuase currently the tool runs are not saved on servers. so can't be fetched again.
    if (selectedDb) {
      if (selectedDb.isTemp) {
        // set some presets for the temp db
        // set is temp to true in the context
        // and also sqlOnly to true
        // analysisContext.update({
        //   ...analysisContext.val,
        //   isTemp: true,
        //   sqlOnly: true,
        //   dbName: selectedDb.dbName,
        //   metadata: selectedDb.metadata,
        // });
      } else {
        // analysisContext.update({
        //   ...analysisContext.val,
        //   isTemp: false,
        //   sqlOnly: false,
        //   dbName: selectedDb.dbName,
        //   metadata: selectedDb.metadata,
        // });
      }
    }
  }, [selectedDb]);

  return (
    <EmbedScaffolding
      defaultSelectedDb={selectedDbName}
      availableDbs={availableDbs.map((d) => d.dbName)}
      onDbChange={(selectedDbName) => setSelectedDbName(selectedDbName)}
      rootClassNames=""
      fileUploading={fileUploading}
    >
      {hidePreviewTabs ? (
        !selectedDbManager || !selectedDbName || !token ? (
          nullTab
        ) : (
          <AnalysisTabContent
            key={selectedDbName}
            predefinedQuestions={selectedDbPredefinedQuestions}
            isTemp={selectedDbIsTemp}
            dbName={selectedDbName}
            treeManager={selectedDbManager}
            forceSqlOnly={selectedDbIsSqlOnly}
            metadata={selectedDbMetadata}
            searchBarDraggable={searchBarDraggable}
            searchBarClasses={searchBarClasses}
            defaultSidebarOpen={defaultSidebarOpen}
            onTreeChange={onTreeChange}
          />
        )
      ) : (
        <Tabs
          disableSingleSelect={true}
          vertical={true}
          rootClassNames="relative grow h-full w-full"
          contentClassNames="mt-2 sm:mt-0 bg-white grow overflow-hidden shadow-custom rounded-2xl sm:rounded-tl-none"
          defaultTabClassNames="p-0 sm:mt-0 h-full"
          selectedTabHeaderClasses={(nm) =>
            nm === "Analysis" ? "bg-transparent" : ""
          }
          tabs={tabs}
        />
      )}
    </EmbedScaffolding>
  );
}

interface EmbedProps {
  /**
   * The hashed password.
   */
  token: string;
  /**
   * User email/name. Default is "admin".
   */
  user: Object;
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
   *  If the component should be in dev mode.
   */
  devMode: boolean;
  /**
   * Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
   */
  showAnalysisUnderstanding: boolean;
  /**
   * Whether to show tool code.
   */
  showCode: boolean;
  /**
   * Whether to allow addition to dashboards.
   */
  allowDashboardAdd: boolean;
  /**
   * Whether to disable messages
   */
  disableMessages: boolean;
  /**
   * The list of databases to show in the dropdown. Each object should have a dbName and predefinedQuestions array.
   */
  dbs: Array<{
    name: string;
    dbName: string;
    predefinedQuestions?: string[];
    isTemp?: boolean;
    sqlOnly?: boolean;
    metadata?: any;
    data?: any;
    columns?: any;
    sqliteTableName?: string;
    analysisTreeManager?: any;
    metadataFetchingError?: boolean | string;
    dataFetchingError?: boolean | string;
  }>;
  /**
   * Whether all uploaded csvs should be sql only.
   */
  true: boolean;
  /**
   * The predefined questions for the uploaded CSVs
   */
  uploadedCsvPredefinedQuestions: Array<string>;
  /**
   *  If the main search bad should be draggable.
   */
  searchBarDraggable: boolean;
  /**
   *  The classes for the search bar.
   */
  searchBarClasses: string;
  /**
   *  The key name for the csv file.
   */
  csvFileDbName: string;
  /**
   *  If the file size should be limited to maxCsvUploadSize.
   */
  limitCsvUploadSize: boolean;
  /**
   *  The max file size allowed, in mbs. Default is 10.
   */
  maxCsvUploadSize: number;
  /**
   *  If the sidebar should be open by default.
   */
  defaultSidebarOpen: boolean;
  /**
   * Callback for when the analysis tree changes for a particular key. Will be called on addition or removal of analyses.
   */
  onTreeChange: (dbName: string, tree: AnalysisTree) => void;
  /**
   * An object of initial trees to populate the UI with.
   */
  initialTrees: { [DbName: string]: {} };
}

/**
 * Embed component, renders the tabbed view with database selection + csv upload for agents.
 */

export function DefogAnalysisAgentEmbed({
  token,
  apiEndpoint = "https://demo.defog.ai",
  user = "admin",
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  disableMessages = false,
  dbs = [],
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  searchBarDraggable = true,
  searchBarClasses = "",
  csvFileDbName = null,
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
  defaultSidebarOpen = true,
  onTreeChange = (...args) => {},
  initialTrees = null,
}: EmbedProps) {
  // use the simple db list
  // and add some extra props to them
  // including the analysis tree manager which helps us "remember" questions for each db
  const dbsWithManagers = useMemo(() => {
    return dbs.map((d) => ({
      isTemp: false,
      sqlOnly: false,
      metadata: null,
      data: {},
      metadataFetchingError: false,
      analysisTreeManager: AnalysisTreeManager(
        (initialTrees && initialTrees[d.dbName]) || {},
        d.dbName + "_" + Math.floor(Math.random() * 1000)
      ),
      // do this after so that sqlOnly, and isTemp can be overwritten if defined by the user
      ...d,
    }));
  }, [dbs, initialTrees]);

  console.debug(
    "hideRawAnalysis",
    hideRawAnalysis,
    "hideSqlTab",
    hideSqlTab,
    "hidePreviewTabs",
    hidePreviewTabs
  );

  return (
    <div className="w-full bg-gradient-to-br from-[#6E00A2]/10 to-[#FFA20D]/10 h-full flex items-center shadow-inner relative">
      <div className="w-full lg:w-full min-h-96 h-full overflow-y-hidden mx-auto">
        <Setup
          token={token}
          user={user}
          hideRawAnalysis={hideRawAnalysis}
          hiddenCharts={hiddenCharts}
          hideSqlTab={hideSqlTab}
          hidePreviewTabs={hidePreviewTabs}
          apiEndpoint={apiEndpoint}
          showAnalysisUnderstanding={showAnalysisUnderstanding}
          showCode={showCode}
          allowDashboardAdd={allowDashboardAdd}
          disableMessages={disableMessages}
        >
          <EmbedInner
            dbs={dbsWithManagers}
            uploadedCsvPredefinedQuestions={uploadedCsvPredefinedQuestions}
            searchBarClasses={searchBarClasses}
            searchBarDraggable={searchBarDraggable}
            // if csvFileDbName is defined, use that
            // otherwise use the first db's dbName if available
            csvFileDbName={
              csvFileDbName || (dbs.length > 0 ? dbs[0].dbName : null)
            }
            limitCsvUploadSize={limitCsvUploadSize}
            maxCsvUploadSize={maxCsvUploadSize}
            defaultSidebarOpen={defaultSidebarOpen}
            onTreeChange={(dbName, tree) => {
              try {
                // make a copy of the tree
                const treeCopyWithoutManagers = JSON.parse(
                  JSON.stringify(tree)
                );

                // remove all analysisManagers
                // we do this because analysisManagers have functions as properties
                // which can't be stringified (for now that is the major use case as we're storing to localStorage)
                // so to avoid the parent component handling this, this is placed here.
                // we still return the full tree including all properties as the third argument
                Object.keys(treeCopyWithoutManagers).forEach((analysisId) => {
                  delete treeCopyWithoutManagers[analysisId].root
                    .analysisManager;
                  treeCopyWithoutManagers[analysisId].analysisList.forEach(
                    (item) => {
                      delete item.analysisManager;
                    }
                  );
                });

                onTreeChange(dbName, treeCopyWithoutManagers);
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </Setup>
      </div>
    </div>
  );
}
