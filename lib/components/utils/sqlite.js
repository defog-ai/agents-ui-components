import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

const start = (sqlite3) => {
  const conn = new sqlite3.oo1.DB("/mydb.sqlite3", "ct");
  return conn;
};

/**
 * Initializes SQLite3.
 * @example
 * const conn = await initializeSQLite();
 */
export const initializeSQLite = async () => {
  const sqlite3 = await sqlite3InitModule({});
  return start(sqlite3);
};

/**
 *
 * Adds a parsed CSV to an SQLite3 database.
 * @param {Object} config
 * @param {*} config.conn
 * @param {string} config.csvName
 * @param {Array<Array<string>>} config.rowWiseArrays
 * @param {Array<{ title: string }>} config.columns
 * @returns {Promise<void>}
 */
export const addParsedCSVToSqlite = async ({
  conn,
  csvName,
  rowWiseArrays,
  columns,
}) => {
  try {
    console.log("Adding parsed CSV to SQLite3...");
    const validatedTableName = "csv_" + csvName;

    const dropTableStmt = `DROP TABLE IF EXISTS ${validatedTableName};`;

    const createTableStmt = `CREATE TABLE ${validatedTableName} (${columns
      .map((c) => `${c.title}`)
      .join(", ")});`;

    const insertStmt = `INSERT INTO ${validatedTableName} VALUES (${columns
      .map(() => "?")
      .join(",")});`;

    conn.exec(dropTableStmt);

    conn.exec(createTableStmt);

    for (const row of rowWiseArrays) {
      conn.exec({
        sql: insertStmt,
        bind: row,
      });
    }

    console.log("Added parsed CSV to SQLite3.");
  } catch (err) {
    console.error("Error adding parsed CSV to SQLite3:", err.name, err.message);
    console.log(err.stack);
    throw new Error("Error adding parsed CSV to SQLite3.");
  }
};
