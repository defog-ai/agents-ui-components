// npm i -S sql.js
import initSqlJs from "sql.js";

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
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });
  return new SQL.Database();
};

/**
 * Runs a query on an SQLite3 database.
 * @param {Object} config
 * @param {import("sql.js").Database} config.conn - SQLite3 database instance/connection.
 * @param {string} config.query - Query to run.
 * @param {Array<any>} [config.bind] - Bind parameters.
 * @returns {Array<any>} - Results.
 */
export const runQueryOnDb = ({ conn, query, bind = null }) => {
  const stmt = conn.prepare(query);
  const results = [];
  if (bind) {
    stmt.bind(bind);
  }
  while (stmt.step()) {
    // While there are rows to return
    results.push(stmt.get()); // Add each row to the results array
  }
  stmt.free();

  return results; // Return the array of results
};

/**
 *
 * Adds a parsed CSV to an SQLite3 database.
 * @param {Object} config
 * @param {import("sql.js").Database} config.conn
 * @param {string} config.tableName
 * @param {Array<Array<string>>} config.rowWiseArrays
 * @param {Array<{ title: string }>} config.columns
 * @returns {string} - Created table name.
 */
export const addParsedCSVToSqlite = ({
  conn,
  tableName,
  rowWiseArrays,
  columns,
}) => {
  const dropTableStmt = `DROP TABLE IF EXISTS ${tableName};`;

  const createTableStmt = `CREATE TABLE ${tableName} (${columns
    .map((c) => `${c.title}`)
    .join(", ")});`;

  const insertStmt = `INSERT INTO ${tableName} VALUES (${columns
    .map(() => "?")
    .join(",")});`;

  runQueryOnDb({ conn, query: dropTableStmt });

  runQueryOnDb({ conn, query: createTableStmt });

  for (const row of rowWiseArrays) {
    runQueryOnDb({ conn, query: insertStmt, bind: row });
  }

  console.log(
    `Table ${tableName} created successfully  with ${rowWiseArrays.length} rows`
  );

  // get first 5 rows
  // const selectStmt = `SELECT *\n  FROM csv_656493_summary\n LIMIT 5;`;
  // const results = runQueryOnDb({ conn, query: selectStmt });

  // console.log(results);

  return tableName;
};
