// Usage (from the repo root): node scripts/repair-2026-09-09.mjs <backup.json>
// Not yet run as of 16-sep-2026 night; see CLAUDE.md "Cuarta vez, el 9-sep".
// Repair of the 9-sep-2026 false mass deactivation (388 zonaprop rows written
// by the original Jotaeme repo's cron). Backup first; then one transaction that
// only touches rows whose ids were captured in the backup, and rolls back unless
// the counts are exactly the verified ones (588 history rows, 188 revivals).
import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });
const backupPath = process.argv[2];
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const bajas = await c.query(`
  select * from property_history
  where field_changed = 'is_active' and old_value = 'true' and new_value = 'false'
    and changed_at >= '2026-09-09 10:27:00+00' and changed_at < '2026-09-09 10:28:00+00'
    and price_at_change is null`);
const affected = [...new Set(bajas.rows.map((r) => r.property_id))];
const altas = await c.query(`
  select * from property_history
  where field_changed = 'is_active' and old_value = 'false' and new_value = 'true'
    and changed_at >= '2026-09-16 20:57:00+00' and changed_at < '2026-09-16 20:59:00+00'
    and property_id = any($1::uuid[])`, [affected]);
const props = await c.query(
  `select id, is_active, last_seen_at from properties where id = any($1::uuid[])`, [affected]);
const toRevive = props.rows.filter((p) => !p.is_active).map((p) => p.id);
const historyIds = [...bajas.rows, ...altas.rows].map((r) => r.id);

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
fs.writeFileSync(backupPath, JSON.stringify(
  { bajas: bajas.rows, altas: altas.rows, properties: props.rows }, null, 1));
console.log(`backup: ${bajas.rowCount} bajas, ${altas.rowCount} altas, ${props.rowCount} propiedades -> ${backupPath}`);

if (bajas.rowCount !== 388 || altas.rowCount !== 200 || toRevive.length !== 188) {
  console.error("counts differ from the verified ones; nothing written");
  process.exit(1);
}

try {
  await c.query("begin");
  const d = await c.query(`delete from property_history where id = any($1::uuid[])`, [historyIds]);
  const u = await c.query(
    `update properties set is_active = true where id = any($1::uuid[]) and is_active = false`, [toRevive]);
  if (d.rowCount !== 588 || u.rowCount !== 188) {
    throw new Error(`unexpected counts: deleted ${d.rowCount}, revived ${u.rowCount}`);
  }
  await c.query("commit");
  console.log(`done: deleted ${d.rowCount} history rows, revived ${u.rowCount} listings`);
} catch (e) {
  await c.query("rollback");
  console.error("ROLLBACK:", e.message);
  process.exitCode = 1;
}
await c.end();
