#!/usr/bin/env node
/**
 * db-query.mjs — Run a SQL query and print results as a table.
 * Sibling of db-run.mjs but for read queries.
 *
 * Usage: node scripts/db-query.mjs "SELECT ..."
 */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const sql = process.argv.slice(2).join(" ");
if (!sql) {
  console.error("Uso: node scripts/db-query.mjs \"SELECT ...\"");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const r = await client.query(sql);
  if (r.rows.length === 0) {
    console.log("(no rows)");
  } else {
    console.table(r.rows);
  }
} catch (err) {
  console.error("✗", err.message);
  process.exit(1);
} finally {
  await client.end();
}
