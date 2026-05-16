#!/usr/bin/env node
/**
 * db-run.mjs — Run a SQL file against the Supabase Postgres database.
 *
 * Usage:
 *   node scripts/db-run.mjs <path-to-sql-file>
 *
 * Examples:
 *   node scripts/db-run.mjs supabase/reset.sql
 *   node scripts/db-run.mjs supabase/migrations/00001_initial_schema.sql
 *   node scripts/db-run.mjs supabase/seed.sql
 *
 * Requires DATABASE_URL in .env.local (transaction pooler connection string).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Client } = pg;

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("✗ Falta el path al archivo SQL.");
  console.error("  Uso: node scripts/db-run.mjs <archivo.sql>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ Falta DATABASE_URL en .env.local");
  console.error("  Conseguila en: Supabase Dashboard > Settings > Database > Connection string");
  console.error("  Usá la versión 'Transaction pooler' (URI mode)");
  process.exit(1);
}

const absolutePath = resolve(sqlPath);
let sql;
try {
  sql = readFileSync(absolutePath, "utf8");
} catch (err) {
  console.error(`✗ No pude leer el archivo: ${absolutePath}`);
  console.error(`  ${err.message}`);
  process.exit(1);
}

console.log(`→ Ejecutando: ${sqlPath} (${sql.length} caracteres)`);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("✓ Conectado a Supabase Postgres");

  const start = Date.now();
  await client.query(sql);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`✓ Ejecutado en ${elapsed}s sin errores`);
} catch (err) {
  console.error(`✗ Error de SQL:`);
  console.error(`  ${err.message}`);
  if (err.position) {
    console.error(`  Posición en el archivo: ${err.position}`);
  }
  process.exit(1);
} finally {
  await client.end();
}
