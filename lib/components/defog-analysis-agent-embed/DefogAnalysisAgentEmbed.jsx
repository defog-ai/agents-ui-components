"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { MessageManagerContext, Tabs } from "@ui-components";
import { EmbedScaffolding } from "./EmbedScaffolding";
import { twMerge } from "tailwind-merge";
import { AnalysisTreeManager } from "../agent/analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./tab-content/MetadataTabContent";
import { AnalysisTabContent } from "./tab-content/AnalysisTabContent";
import { PreviewDataTabContent } from "./tab-content/PreviewDataTabContent";
import { TabNullState } from "./tab-content/TabNullState";
import { getColumnDescriptionsForCsv } from "../utils/utils";
import { addParsedCsvToSqlite, cleanTableNameForSqlite } from "../utils/sqlite";
import { AgentConfigContext } from "../context/AgentContext";
import { Setup } from "../context/Setup";

export function EmbedInner({
  csvFileKeyName = null,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  dbs,
  searchBarDraggable = true,
  searchBarClasses = "",
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
  uploadedCsvIsSqlOnly = true,
  defaultSidebarOpen = true,
  onTreeChange,
}) {
  const messageManager = useContext(MessageManagerContext);
  const agentConfigContext = useContext(AgentConfigContext);

  const { sqliteConn, token, apiEndpoint, hideRawAnalysis, hidePreviewTabs } =
    agentConfigContext.val;

  const [availableDbs, setAvailableDbs] = useState(dbs);

  const [selectedDbName, setSelectedDbName] = useState(
    dbs.length === 1 ? dbs[0].name : null
  );

  useEffect(() => {
    // to handle edge case where the network request to getApiKeyNames resolves
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
      setSelectedDbName(dbs[0].name);
    }
  }, [dbs]);

  const selectedDb = useMemo(() => {
    return availableDbs.find((d) => d.name === selectedDbName);
  }, [selectedDbName, availableDbs]);

  const selectedDbKeyName = useMemo(() => {
    return availableDbs.find((d) => d.name === selectedDbName)?.keyName;
  }, [selectedDbName, availableDbs]);

  const selectedDbMetadata = useMemo(() => {
    return (
      availableDbs.find((d) => d.name === selectedDbName)?.metadata || null
    );
  }, [selectedDbName, availableDbs]);

  const selectedDbIsSqlOnly = useMemo(() => {
    return (
      availableDbs.find((d) => d.name === selectedDbName)?.sqlOnly || false
    );
  }, [selectedDbName, availableDbs]);

  const selectedDbIsTemp = useMemo(() => {
    return availableDbs.find((d) => d.name === selectedDbName)?.isTemp || false;
  }, [selectedDbName, availableDbs]);

  const selectedDbManager = useMemo(() => {
    return availableDbs.find((d) => d.name === selectedDbName)
      ?.analysisTreeManager;
  }, [selectedDbName, availableDbs]);

  const selectedDbPredefinedQuestions = useMemo(() => {
    return (
      availableDbs.find((d) => d.name === selectedDbName)
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
   * @returns {{columns: {dataIndex: string, title: string, key: string}[], csvFileKeyName: string, metadata: {column_name: string, table_name: string, data_type: string, column_description?: string}[], tableData: {sqlite_table_name: {data: any[], columns: string[]}}, sqliteTableName: string, newDbName: string}}
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
    if (availableDbs.find((d) => d.name === newDbName)) {
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

      // get column descriptions.
      // we do this at the end to have *some metadata* in case we error out here
      const res = await getColumnDescriptionsForCsv({
        apiEndpoint: apiEndpoint,
        keyName: csvFileKeyName,
        metadata: metadata,
        tableName: sqliteTableName,
      });

      if (!res.success || res.error_message || !res.descriptions) {
        throw new Error(
          res.error_message ||
            "Failed to get column descriptions. Queries might be less precise."
        );
      }

      const columnDescriptions = res.descriptions;

      // if we got them successfully, merge them into the metadata object above
      metadata.forEach((m) => {
        const colDesc = columnDescriptions.find(
          (d) => d.column_name === m.column_name
        );

        if (colDesc) {
          m.column_description = colDesc.column_description;
        }
      });
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
        keyName: csvFileKeyName,
        isTemp: true,
        sqlOnly: uploadedCsvIsSqlOnly && true,
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

  const addExcelToSqlite = async ({ file, sheetCsvs }) => {
    const xlsData = {};
    let xlsMetadata = [];

    for (const sheetName in sheetCsvs) {
      const { columns, rows } = sheetCsvs[sheetName];
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
        onParseExcel={async ({ file, sheetCsvs }) => {
          try {
            setFileUploading(true);
            const { xlsData, xlsMetadata } = await addExcelToSqlite({
              file,
              sheetCsvs,
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
          !selectedDbManager || !selectedDbKeyName || !token ? (
            nullTab
          ) : (
            <AnalysisTabContent
              key={selectedDbKeyName}
              predefinedQuestions={selectedDbPredefinedQuestions}
              isTemp={selectedDbIsTemp}
              keyName={selectedDbKeyName}
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
            key={selectedDbKeyName}
            apiEndpoint={apiEndpoint}
            db={selectedDb}
            token={token}
            onGetMetadata={({ metadata, error }) => {
              setAvailableDbs((prev) => {
                const newDbs = [...prev];
                const idx = prev.findIndex((d) => d.name === selectedDbName);
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
            key={selectedDbKeyName}
            apiEndpoint={apiEndpoint}
            db={selectedDb}
            token={token}
            onGetData={({ data }) => {
              setAvailableDbs((prev) => {
                const newDbs = [...prev];
                const idx = prev.findIndex((d) => d.name === selectedDbName);
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
        agentConfigContext.update({
          ...agentConfigContext.val,
          isTemp: true,
          sqlOnly: true,
          keyName: selectedDb.keyName,
          metadata: selectedDb.metadata,
        });
      } else {
        agentConfigContext.update({
          ...agentConfigContext.val,
          isTemp: false,
          sqlOnly: false,
          keyName: selectedDb.keyName,
          metadata: selectedDb.metadata,
        });
      }
    }
  }, [selectedDb]);

  return (
    <EmbedScaffolding
      defaultSelectedDb={selectedDbName}
      availableDbs={availableDbs.map((d) => d.name)}
      onDbChange={(selectedDbName) => setSelectedDbName(selectedDbName)}
      rootClassNames={(selectedDbName) => {
        return (
          "flex flex-col " +
          (!selectedDbName ? "items-center justify-center" : "")
        );
      }}
      fileUploading={fileUploading}
    >
      {hidePreviewTabs ? (
        !selectedDbManager || !selectedDbKeyName || !token ? (
          nullTab
        ) : (
          <AnalysisTabContent
            key={selectedDbKeyName}
            predefinedQuestions={selectedDbPredefinedQuestions}
            isTemp={selectedDbIsTemp}
            keyName={selectedDbKeyName}
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
          rootClassNames="grow h-[90%] w-full"
          contentClassNames="mt-2 sm:mt-0 bg-white grow overflow-hidden shadow-custom rounded-2xl sm:rounded-tl-none"
          defaultTabClassNames="pl-0 sm:mt-0 h-full"
          selectedTabHeaderClasses={(nm) =>
            nm === "Analysis" ? "bg-transparent" : ""
          }
          tabs={tabs}
        />
      )}
    </EmbedScaffolding>
  );
}

/**
 * @typedef {Object} EmbedProps
 * @property {String} token - The hashed password.
 * @property {Object=} user - User email/name. Default is "admin".
 * @property {Boolean=} hideRawAnalysis - Whether to hide the raw analysis of results.
 * @property {Array<string>=} hiddenCharts - The list of charts that *will be hidden*.
 * @property {Boolean=} hideSqlTab - Whether to hide the SQL/Code tab.
 * @property {Boolean=} hidePreviewTabs - Whether to hide the "view data structure" and "preview data" tabs.
 * @property {String} apiEndpoint - The API endpoint to use for the requests. Default is https://demo.defog.ai.
 * @property {Boolean=} devMode -  If the component should be in dev mode.
 * @property {Boolean=} showAnalysisUnderstanding - Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
 * @property {Boolean=} showCode - Whether to show tool code.
 * @property {Boolean=} allowDashboardAdd - Whether to allow addition to dashboards.
 * @property {Boolean=} disableMessages - Whether to disable messages
 * @property {Array<{name: string, keyName: string, predefinedQuestions?: string[], isTemp?: false, sqlOnly?: false}>=} dbs - The list of databases to show in the dropdown. Each object should have a keyName and predefinedQuestions array.
 * @property {Boolean=true} uploadedCsvIsSqlOnly - Whether all uploaded csvs should be sql only.
 * @property {Array<string>=} uploadedCsvPredefinedQuestions - The predefined questions for the uploaded CSVs
 * @property {Boolean=} searchBarDraggable -  If the main search bad should be draggable.
 * @property {String=} searchBarClasses -  The classes for the search bar.
 * @property {String=} csvFileKeyName -  The key name for the csv file.
 * @property {Boolean=} limitCsvUploadSize -  If the file size should be limited to maxCsvUploadSize.
 * @property {Number=} maxCsvUploadSize -  The max file size allowed, in mbs. Default is 10.
 * @property {Boolean=} defaultSidebarOpen -  If the sidebar should be open by default.
 * @property {(keyName, treeWithoutManagers, fullTree) => void=} onTreeChange - Callback for when the analysis tree changes for a particular key. Will be called on addition or removal of analyses.
 * @property {{[apiKeyName: string]: {}}=} initialTrees - An object of initial trees to populate the UI with.
 *
 */

/**
 * Embed component, renders the tabbed view with database selection + csv upload for agents.
 * @param {EmbedProps} props - The props of the component
 */

export function DefogAnalysisAgentEmbed({
  token,
  apiEndpoint = "https://demo.defog.ai",
  user = "admin",
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  devMode = false,
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  disableMessages = false,
  dbs = [],
  uploadedCsvIsSqlOnly = true,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  searchBarDraggable = true,
  searchBarClasses = "",
  csvFileKeyName = null,
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
  defaultSidebarOpen = true,
  onTreeChange = () => {},
  initialTrees = null,
}) {
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
        (initialTrees && initialTrees[d.keyName]) || {},
        d.keyName + "_" + Math.floor(Math.random() * 1000)
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
    <div className="w-full bg-gradient-to-br from-[#6E00A2]/10 to-[#FFA20D]/10 p-2 lg:px-0 py-2 h-full flex items-center shadow-inner relative">
      <div className="w-full lg:w-full min-h-96 h-full overflow-y-hidden mx-auto">
        <Setup
          token={token}
          user={user}
          hideRawAnalysis={hideRawAnalysis}
          hiddenCharts={hiddenCharts}
          hideSqlTab={hideSqlTab}
          hidePreviewTabs={hidePreviewTabs}
          apiEndpoint={apiEndpoint}
          devMode={devMode}
          showAnalysisUnderstanding={showAnalysisUnderstanding}
          showCode={showCode}
          allowDashboardAdd={allowDashboardAdd}
          disableMessages={disableMessages}
        >
          <EmbedInner
            uploadedCsvIsSqlOnly={uploadedCsvIsSqlOnly}
            dbs={dbsWithManagers}
            uploadedCsvPredefinedQuestions={uploadedCsvPredefinedQuestions}
            searchBarClasses={searchBarClasses}
            searchBarDraggable={searchBarDraggable}
            // if csvFileKeyName is defined, use that
            // otherwise use the first db's keyName if available
            csvFileKeyName={
              csvFileKeyName || (dbs.length > 0 ? dbs[0].keyName : null)
            }
            limitCsvUploadSize={limitCsvUploadSize}
            maxCsvUploadSize={maxCsvUploadSize}
            defaultSidebarOpen={defaultSidebarOpen}
            onTreeChange={(keyName, tree) => {
              try {
                // make a copy of the tree
                const treeCopyWithoutManagers = JSON.parse(
                  JSON.stringify(tree)
                );
                const treeCopy = JSON.parse(JSON.stringify(tree));
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

                onTreeChange(keyName, treeCopyWithoutManagers, treeCopy);
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
