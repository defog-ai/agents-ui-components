// npm i -S sql.js
import initSqlJs from "sql.js";
import { snakeCase } from "./utils";

export const validateTableName = (tableName) => {
  let validated = tableName + "";
  validated = snakeCase(validated.trim().toLowerCase());

  if (typeof tableName !== "string") {
    throw new Error("Table name must be a string.");
  }
  if (tableName.length === 0) {
    // add random string
    validated = `table_${Math.random().toString(36).substring(7)}`;
  }

  // if it has special characters, quote and send back
  if (tableName.match(/[^a-zA-Z0-9_]/)) {
    validated = `"${validated}"`;
  }

  return validated;
};

export const validateColumnName = (colName) => {
  // convert to string first
  let validatedColumnName = colName + "";

  if (validatedColumnName === "" || validatedColumnName === null) {
    // just create a random column name and return
    validatedColumnName = `col_${Math.random().toString(36).substring(3)}`;
    return validatedColumnName;
  }
  // if column name has only numerics
  // or if it starts with a numeric, append a "col_" to it
  // this is specifically for sqlite support

  if (validatedColumnName.match(/^[0-9]+$/)) {
    validatedColumnName = `col_${validatedColumnName}`;
  }

  if (validatedColumnName.match(/^[0-9]/)) {
    validatedColumnName = `col_${validatedColumnName}`;
  }

  return validatedColumnName;
};

/**
 * SQLite3 instance.
 * @param {import("sql.js").SqlJsStatic} SQL - SQLite3 instance.
 * @returns {import("sql.js").Database} - SQLite3 database instance/connection.
 */
const getConn = (SQL) => {
  const conn = new SQL.Database();

  return conn;
};

/**
 * Initializes SQLite3.
 * @example
 * const conn = await initializeSQLite();
 */
export const initializeSQLite = async () => {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm`,
  });
  return new SQL.Database();
};

/**
 * Runs a query on an SQLite3 database.
 * @param {Object} config
 * @param {import("sql.js").Database} config.conn - SQLite3 database instance/connection.
 * @param {string} config.query - Query to run.
 * @param {Array<any>} [config.bind] - Bind parameters.
 * @returns {[Array<string>, Array<Array<any>>]} [columns, rows] Column names and array of rows.
 */
export const runQueryOnDb = ({ conn, query, bind = null }) => {
  const stmt = conn.prepare(query);
  const results = [];
  const columnNames = stmt.getColumnNames();

  if (bind) {
    stmt.bind(bind);
  }

  if (stmt.step()) {
    // Ensure there's at least one row
    // Add the first row to results
    results.push(stmt.get());
    // Continue with the rest of the rows
    while (stmt.step()) {
      results.push(stmt.get());
    }
  }
  stmt.free();

  // Optionally, return both column names and results
  return [columnNames, results];
};

/**
 *
 * Adds a parsed CSV to an SQLite3 database.
 * @param {Object} config
 * @param {import("sql.js").Database} config.conn
 * @param {string} config.tableName
 * @param {Array<object>} config.rows
 * @param {Array<{ dataIndex: string, title: string, key: string }>} config.columns
 * @returns {Object} - Table name and column metadata.
 */
export const addParsedCsvToSqlite = ({ conn, tableName, rows, columns }) => {
  const dropTableStmt = `DROP TABLE IF EXISTS ${tableName};`;

  const createTableStmt = `CREATE TABLE ${tableName} (${columns
    .map((c) => `"${c.dataIndex}"`)
    .join(", ")});`;

  const insertStmt = `INSERT INTO ${tableName} VALUES (${columns
    .map(() => "?")
    .join(",")});`;

  void runQueryOnDb({ conn, query: dropTableStmt });

  void runQueryOnDb({ conn, query: createTableStmt });

  for (const row of rows) {
    const rowValues = columns.map((c) => row[c.dataIndex]);
    void runQueryOnDb({ conn, query: insertStmt, bind: rowValues });
  }

  // get column metadta using pragma
  // for each column, get column metadata using SELECT DISTINCT typeof(COLUMN_NAME) from TABLE_NAME;
  const columnMetadata = columns.map((c) => {
    const columnTypeStmt = `SELECT DISTINCT typeof("${c.dataIndex}") FROM ${tableName};`;
    const [_, columnType] = runQueryOnDb({ conn, query: columnTypeStmt });

    // check if this has multiple types
    const hasMultipleTypes = columnType.length > 1;

    return {
      ...c,
      allDataTypes: columnType.map((ct) => ct[0]),
      hasMultipleTypes,
      // just use first one as the main data type
      dataType: columnType[0][0],
      tableName,
    };
  });

  // get first 5 rows
  const selectStmt = `SELECT * FROM ${tableName} LIMIT 5;`;
  const [_, fiveRowsAsArraysOfValues] = runQueryOnDb({
    conn,
    query: selectStmt,
  });

  console.log(
    `Table ${tableName} created successfully  with ${rows.length} rows`
  );

  return { tableName, columnMetadata, fiveRowsAsArraysOfValues };
};
