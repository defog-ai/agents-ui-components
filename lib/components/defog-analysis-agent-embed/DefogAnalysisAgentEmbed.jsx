"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  SpinningLoader,
  Tabs,
} from "@ui-components";
import { EmbedScaffolding } from "./EmbedScaffolding";
import { twMerge } from "tailwind-merge";
import { AnalysisTreeManager } from "../agent/analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./tab-content/MetadataTabContent";
import { AnalysisTabContent } from "./tab-content/AnalysisTabContent";
import { PreviewDataTabContent } from "./tab-content/PreviewDataTabContent";
import { TabNullState } from "./tab-content/TabNullState";
import { getColumnDescriptionsForCsv } from "../utils/utils";
import {
  addParsedCsvToSqlite,
  initializeSQLite,
  validateTableName,
} from "../utils/sqlite";
import {
  AgentConfigContext,
  RelatedAnalysesContext,
  ReactiveVariablesContext,
} from "../context/AgentContext";
import { ContextHelper } from "../context/ContextHelper";

export function EmbedInner({
  token = null,
  apiEndpoint = null,
  csvFileKeyName = null,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  dbs,
  searchBarDraggable = true,
  searchBarClasses = "",
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
  uploadedCsvIsSqlOnly = true,
}) {
  const ctr = useRef(null);
  const messageManager = useContext(MessageManagerContext);
  const agentConfigContext = useContext(AgentConfigContext);
  const conn = useRef(null);

  const [availableDbs, setAvailableDbs] = useState(dbs);

  const [selectedDbName, setSelectedDbName] = useState(null);

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

  const addCsvToDbListAndSqlite = async ({ file, columns, rows }) => {
    try {
      if (!conn.current) {
        throw new Error(
          "SQLite connection not initialized. Please refresh the page and try again. If the error persists, please reach out to us."
        );
      }
      setFileUploading(true);
      // if file size is >10mb, raise error
      if (limitCsvUploadSize && file.size > maxCsvUploadSize * 1024 * 1024) {
        throw new Error("File size is too large. Max size allowed is 10MB.");
      }

      let newDbName = file.name.split(".")[0];
      // if this already exists, add a random number to the end
      if (availableDbs.find((d) => d.name === newDbName)) {
        newDbName = newDbName + "_" + Math.floor(Math.random() * 1000);
      }
      const sqliteTableName = validateTableName("csv_" + newDbName);

      let tableData = null;
      let metadata = null;

      // also add to sqlite
      // once done uploading, also add it to sqlite db
      if (conn.current) {
        try {
          const { columnMetadata, fiveRowsAsArraysOfValues } =
            addParsedCsvToSqlite({
              conn: conn.current,
              tableName: sqliteTableName,
              rows: rows,
              columns,
            });

          messageManager.info(
            "CSV parsed, now generating descriptions for columns!"
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
        } catch (e) {
          console.log(e.stack);
          messageManager.error(e.message);
        }
      }

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

        // const existingTempIdx = prev.findIndex((d) => d.isTemp);
        // if (existingTempIdx >= 0) {
        //   newDbs[existingTempIdx] = tempDb;
        // } else {
        newDbs.push(tempDb);
        // }

        return newDbs;
      });

      // set this to selected db
      setSelectedDbName(newDbName);
    } catch (e) {
      console.log(e.stack);
      messageManager.error(e.message);
    } finally {
      setFileUploading(false);
    }
  };

  const nullTab = useMemo(
    () => (
      <TabNullState
        availableDbs={availableDbs}
        onSelectDb={(selectedDbName) => setSelectedDbName(selectedDbName)}
        fileUploading={fileUploading}
        onParseCsv={addCsvToDbListAndSqlite}
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
          !selectedDbManager || !selectedDbKeyName || !token || !apiEndpoint ? (
            nullTab
          ) : (
            <AnalysisTabContent
              predefinedQuestions={selectedDbPredefinedQuestions}
              isTemp={selectedDbIsTemp}
              keyName={selectedDbKeyName}
              treeManager={selectedDbManager}
              forceSqlOnly={selectedDbIsSqlOnly}
              metadata={selectedDbMetadata}
              searchBarDraggable={searchBarDraggable}
              searchBarClasses={searchBarClasses}
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
    ];
  }, [selectedDb, apiEndpoint, searchBarDraggable, token, nullTab]);

  useEffect(() => {
    (async () => {
      if (conn.current) return;

      const _conn = await initializeSQLite();
      conn.current = _conn;

      agentConfigContext.update({
        ...agentConfigContext.val,
        sqliteConn: _conn,
      });

      window.sqlite = _conn;
    })();
  }, []);

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
      onParseCsv={addCsvToDbListAndSqlite}
      rootClassNames={(selectedDbName) => {
        return (
          "flex flex-col " +
          (!selectedDbName ? "items-center justify-center" : "")
        );
      }}
      fileUploading={fileUploading}
    >
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
    </EmbedScaffolding>
  );
}

/**
 * @typedef {Object} EmbedProps
 * @property {String} token - The hashed password.
 * @property {Object=} user - User email/name. Default is "admin".
 * @property {String} apiEndpoint - The API endpoint to use for the requests. Default is https://demo.defog.ai.
 * @property {Boolean=} devMode -  If the component should be in dev mode.
 * @property {Boolean=} showAnalysisUnderstanding - Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
 * @property {Boolean=} showCode - Whether to show tool code.
 * @property {Boolean=} allowDashboardAdd - Whether to allow addition to dashboards.
 * @property {Object=} sqliteConn - The sqlite connection object
 * @property {Boolean=} disableMessages - Whether to disable messages
 * @property {Array<{name: string, keyName: string, predefinedQuestions?: string[], isTemp?: false, sqlOnly?: false}>=} dbs - The list of databases to show in the dropdown. Each object should have a keyName and predefinedQuestions array.
 * @property {Boolean=true} uploadedCsvIsSqlOnly - Whether all uploaded csvs should be sql only.
 * @property {Array<string>=} uploadedCsvPredefinedQuestions - The predefined questions for the uploaded CSVs
 * @property {Boolean=} searchBarDraggable -  If the main search bad should be draggable.
 * @property {String=} searchBarClasses -  The classes for the search bar.
 * @property {String=} csvFileKeyName -  The key name for the csv file.
 * @property {Boolean=} limitCsvUploadSize -  If the file size should be limited to maxCsvUploadSize.
 * @property {Number=} maxCsvUploadSize -  The max file size allowed, in mbs. Default is 10.
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
  devMode = false,
  showAnalysisUnderstanding = true,
  showCode = false,
  allowDashboardAdd = true,
  sqliteConn = null,
  disableMessages = false,
  dbs = [],
  uploadedCsvIsSqlOnly = true,
  uploadedCsvPredefinedQuestions = ["Show me any 5 rows"],
  searchBarDraggable = true,
  searchBarClasses = "",
  csvFileKeyName = null,
  limitCsvUploadSize = true,
  maxCsvUploadSize = 10,
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
        {},
        d.keyName + "_" + Math.floor(Math.random() * 1000)
      ),
      // do this after so that sqlOnly, and isTemp can be overwritten if defined by the user
      ...d,
    }));
  }, [dbs]);

  return (
    <div className="w-full bg-gradient-to-br from-[#6E00A2]/10 to-[#FFA20D]/10 px-2 lg:px-0 py-8 h-screen flex items-center shadow-inner relative">
      <div className="w-full lg:w-10/12 min-h-96 h-[95%] overflow-y-hidden mx-auto">
        <ContextHelper
          token={token}
          user={user}
          apiEndpoint={apiEndpoint}
          devMode={devMode}
          showAnalysisUnderstanding={showAnalysisUnderstanding}
          showCode={showCode}
          allowDashboardAdd={allowDashboardAdd}
          sqliteConn={sqliteConn}
          disableMessages={disableMessages}
        >
          <EmbedInner
            uploadedCsvIsSqlOnly={uploadedCsvIsSqlOnly}
            token={token}
            apiEndpoint={apiEndpoint}
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
          />
        </ContextHelper>
      </div>
    </div>
  );
}
