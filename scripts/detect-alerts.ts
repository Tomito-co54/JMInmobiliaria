#!/usr/bin/env node
/**
 * CLI: detect and persist alerts (new_match, price_drop) for all users.
 *
 * Usage:
 *   tsx scripts/detect-alerts.ts [--dry]
 *
 * Runs daily as part of the GitHub Actions pipeline, after the
 * recompute-quality-scores step. For each search profile, scans
 * recently-seen properties and emits an alert when:
 *
 *   - new_match  → property first_seen within the last 24h AND match
 *                  score ≥ 70 for this profile
 *   - price_drop → property is in the user's favorites AND price_amount
 *                  changed within the last 24h to a lower value
 *
 * Dedupes via `hasRecentAlert` so the same alert isn't re-emitted on
 * subsequent runs. Email delivery (B6.7, Resend) is added in a follow-up;
 * for now alerts only land in the in-app feed.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  computeMatchScore,
  getMatchBand,
  type PropertyForMatching,
  type SearchProfileForMatching,
  type ZonePref,
} from "@/lib/matching";
import { hasRecentAlert, insertAlerts, type InsertAlertInput } from "@/lib/db/alerts";
import { sendNewMatchEmail, sendPriceDropEmail } from "@/lib/services/email";

const NEW_MATCH_THRESHOLD = 70;
const RECENT_WINDOW_HOURS = 24;

interface RawProfile {
  id: string;
  user_id: string;
  name: string;
  zones: unknown;
  price_min: number | string | null;
  price_max: number | string | null;
  price_currency: "USD" | "ARS";
  property_types: string[] | null;
  operation_type: "venta" | "alquiler" | null;
  rooms_min: number | null;
  surface_min: number | string | null;
  must_haves: string[] | null;
}

interface PropertyRow {
  id: string;
  address: string | null;
  partido: string | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | string | null;
  price_currency: "USD" | "ARS" | null;
  rooms: number | null;
  bedrooms: number | null;
  surface_total: number | string | null;
  surface_arba: number | string | null;
  garages: number | null;
  description: string | null;
  first_seen_at: string;
  is_active: boolean;
}

interface PriceChangeEvent {
  id: string;
  property_id: string;
  changed_at: string;
  old_value: string | null;
  new_value: string | null;
}

interface FavoriteRow {
  user_id: string;
  property_id: string;
}

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeZones(raw: unknown): ZonePref[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((z) => {
    if (!z || typeof z !== "object") return [];
    const obj = z as { partido?: unknown; priority?: unknown };
    if (typeof obj.partido !== "string") return [];
    const p =
      obj.priority === "preferido" ||
      obj.priority === "aceptable" ||
      obj.priority === "descarte"
        ? obj.priority
        : "preferido";
    return [{ partido: obj.partido, priority: p }];
  });
}

function rowToProfile(row: RawProfile): SearchProfileForMatching {
  return {
    id: row.id,
    name: row.name,
    zones: normalizeZones(row.zones),
    price_min: toNumber(row.price_min),
    price_max: toNumber(row.price_max),
    price_currency: row.price_currency,
    property_types: row.property_types ?? [],
    operation_type: row.operation_type,
    rooms_min: row.rooms_min,
    surface_min: toNumber(row.surface_min),
    must_haves: row.must_haves ?? [],
  };
}

function rowToProperty(row: PropertyRow): PropertyForMatching {
  return {
    partido: row.partido,
    property_type: row.property_type,
    operation_type: row.operation_type,
    price_amount: toNumber(row.price_amount),
    price_currency: row.price_currency,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    surface_total: toNumber(row.surface_total),
    surface_arba: toNumber(row.surface_arba),
    garages: row.garages,
    description: row.description,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("✗ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const recentCutoff = new Date(
    Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  console.log(`\n=== Detect alerts ===`);
  console.log(`  Ventana: últimas ${RECENT_WINDOW_HOURS}h (desde ${recentCutoff})`);
  console.log(`  Modo: ${dryRun ? "DRY RUN (no escribe)" : "ESCRIBE alerts"}`);

  // -------------------------------------------------------------------------
  // 1. Recently-seen active properties (potential new_match candidates).
  // -------------------------------------------------------------------------
  const { data: recentRaw, error: recentErr } = await supabase
    .from("properties")
    .select(
      "id, address, partido, property_type, operation_type, price_amount, price_currency, rooms, bedrooms, surface_total, surface_arba, garages, description, first_seen_at, is_active",
    )
    .eq("is_active", true)
    .gte("first_seen_at", recentCutoff);
  if (recentErr) {
    console.error("✗ Falla cargando propiedades recientes:", recentErr.message);
    process.exit(1);
  }
  const recentProperties = (recentRaw ?? []) as unknown as PropertyRow[];
  console.log(`  Propiedades nuevas en la ventana: ${recentProperties.length}`);

  // -------------------------------------------------------------------------
  // 2. Recent price changes (price_drop candidates).
  // -------------------------------------------------------------------------
  const { data: priceRaw, error: priceErr } = await supabase
    .from("property_history")
    .select("id, property_id, changed_at, old_value, new_value")
    .eq("field_changed", "price_amount")
    .gte("changed_at", recentCutoff);
  if (priceErr) {
    console.error("✗ Falla cargando price changes:", priceErr.message);
    process.exit(1);
  }
  const priceEvents = ((priceRaw ?? []) as unknown as PriceChangeEvent[]).filter((e) => {
    const oldN = parseFloat(e.old_value ?? "");
    const newN = parseFloat(e.new_value ?? "");
    return Number.isFinite(oldN) && Number.isFinite(newN) && newN < oldN;
  });
  console.log(`  Price drops en la ventana: ${priceEvents.length}`);

  // -------------------------------------------------------------------------
  // 3. All search profiles + the favorites map (for price_drop detection).
  // -------------------------------------------------------------------------
  const { data: profilesRaw, error: profErr } = await supabase
    .from("search_profiles")
    .select(
      "id, user_id, name, zones, price_min, price_max, price_currency, property_types, operation_type, rooms_min, surface_min, must_haves",
    );
  if (profErr) {
    console.error("✗ Falla cargando perfiles:", profErr.message);
    process.exit(1);
  }
  const profiles = (profilesRaw ?? []) as unknown as Array<RawProfile>;
  console.log(`  Perfiles totales: ${profiles.length}`);

  const { data: favRaw, error: favErr } = await supabase
    .from("favorites")
    .select("user_id, property_id");
  if (favErr) {
    console.error("✗ Falla cargando favoritos:", favErr.message);
    process.exit(1);
  }
  const favorites = (favRaw ?? []) as unknown as FavoriteRow[];
  // Map propertyId → Set<userId> of users who favorited it.
  const propertyFavoriters = new Map<string, Set<string>>();
  for (const f of favorites) {
    let s = propertyFavoriters.get(f.property_id);
    if (!s) {
      s = new Set();
      propertyFavoriters.set(f.property_id, s);
    }
    s.add(f.user_id);
  }
  console.log(`  Favoritos totales: ${favorites.length}`);

  // -------------------------------------------------------------------------
  // 4. Build pending alerts (carry rich context so we can email after).
  // -------------------------------------------------------------------------
  interface PendingNewMatch {
    kind: "new_match";
    row: InsertAlertInput;
    propRow: PropertyRow;
    profileName: string;
    matchScore: number;
    matchLabel: string;
    qualityScore: number | null;
  }
  interface PendingPriceDrop {
    kind: "price_drop";
    row: InsertAlertInput;
    propRow: PropertyRow;
    oldAmount: number;
    newAmount: number;
    currency: string;
  }
  type Pending = PendingNewMatch | PendingPriceDrop;
  const pending: Pending[] = [];

  // We also need quality_score for new_match emails — fetch only for the
  // recent properties (small set).
  const propIdsForQuality = new Set<string>(recentProperties.map((p) => p.id));
  const qualityScoreByPropertyId = new Map<string, number | null>();
  if (propIdsForQuality.size > 0) {
    const { data: qsRaw } = await supabase
      .from("properties")
      .select("id, quality_score")
      .in("id", Array.from(propIdsForQuality));
    for (const r of (qsRaw ?? []) as Array<{ id: string; quality_score: number | null }>) {
      qualityScoreByPropertyId.set(r.id, r.quality_score);
    }
  }

  let newMatchSkipped = 0;
  let newMatchDeduped = 0;
  for (const rawProfile of profiles) {
    const profile = rowToProfile(rawProfile);
    for (const propRow of recentProperties) {
      const breakdown = computeMatchScore(rowToProperty(propRow), profile);
      if (breakdown.score === null || breakdown.score < NEW_MATCH_THRESHOLD) {
        newMatchSkipped++;
        continue;
      }
      const already = await hasRecentAlert(rawProfile.user_id, propRow.id, "new_match");
      if (already) {
        newMatchDeduped++;
        continue;
      }
      const band = getMatchBand(breakdown.score);
      pending.push({
        kind: "new_match",
        row: {
          user_id: rawProfile.user_id,
          type: "new_match",
          property_id: propRow.id,
          message: `Nueva propiedad con match ${breakdown.score} (${rawProfile.name})${propRow.address ? ` — ${propRow.address}` : ""}`,
        },
        propRow,
        profileName: rawProfile.name,
        matchScore: breakdown.score,
        matchLabel: band.label,
        qualityScore: qualityScoreByPropertyId.get(propRow.id) ?? null,
      });
    }
  }
  console.log(
    `  new_match: ${pending.filter((p) => p.kind === "new_match").length} a insertar · ${newMatchDeduped} ya alertados · ${newMatchSkipped} bajo umbral`,
  );

  // -------------------------------------------------------------------------
  // 5. Emit price_drop alerts (only to users who favorited the property).
  // -------------------------------------------------------------------------
  let priceDropDeduped = 0;
  let priceDropNoFavorites = 0;
  const dropPropertyIds = new Set<string>();
  for (const e of priceEvents) dropPropertyIds.add(e.property_id);
  const dropPropertyMap = new Map<string, PropertyRow>();
  if (dropPropertyIds.size > 0) {
    const { data: dropRaw } = await supabase
      .from("properties")
      .select(
        "id, address, partido, property_type, operation_type, price_amount, price_currency, rooms, bedrooms, surface_total, surface_arba, garages, description, first_seen_at, is_active",
      )
      .in("id", Array.from(dropPropertyIds));
    for (const r of (dropRaw ?? []) as unknown as PropertyRow[]) {
      dropPropertyMap.set(r.id, r);
    }
  }

  for (const event of priceEvents) {
    const users = propertyFavoriters.get(event.property_id);
    if (!users || users.size === 0) {
      priceDropNoFavorites++;
      continue;
    }
    const oldN = parseFloat(event.old_value ?? "");
    const newN = parseFloat(event.new_value ?? "");
    const dropPct = oldN !== 0 ? ((oldN - newN) / oldN) * 100 : 0;
    const message = `Bajó de precio: ${Math.round(newN).toLocaleString("es-AR")} (-${dropPct.toFixed(1)}%)`;
    const propRow = dropPropertyMap.get(event.property_id);
    if (!propRow) continue;

    for (const userId of users) {
      const already = await hasRecentAlert(
        userId,
        event.property_id,
        "price_drop",
        14,
        Math.round(newN).toString(),
      );
      if (already) {
        priceDropDeduped++;
        continue;
      }
      pending.push({
        kind: "price_drop",
        row: {
          user_id: userId,
          type: "price_drop",
          property_id: event.property_id,
          message,
        },
        propRow,
        oldAmount: oldN,
        newAmount: newN,
        currency: propRow.price_currency ?? "",
      });
    }
  }
  console.log(
    `  price_drop: ${pending.filter((p) => p.kind === "price_drop").length} a insertar · ${priceDropDeduped} ya alertados · ${priceDropNoFavorites} sin favoritos`,
  );

  // -------------------------------------------------------------------------
  // 6. Write + send emails.
  // -------------------------------------------------------------------------
  if (pending.length === 0) {
    console.log(`\n=== Resultado ===\n  Sin alertas nuevas para emitir.`);
    return;
  }
  if (dryRun) {
    console.log(`\n=== DRY RUN ===`);
    console.log(`  Se hubieran insertado ${pending.length} alertas y enviado emails.`);
    for (const p of pending.slice(0, 10)) {
      console.log(
        `    [${p.row.type}] user=${p.row.user_id.slice(0, 8)} prop=${p.row.property_id.slice(0, 8)} — ${p.row.message}`,
      );
    }
    if (pending.length > 10) console.log(`    ... y ${pending.length - 10} más.`);
    return;
  }

  const inserted = await insertAlerts(pending.map((p) => p.row));
  console.log(`  Alertas insertadas en DB: ${inserted}`);

  // Look up emails + names in one batch — RLS doesn't apply to service-role,
  // so we read public.users directly.
  const userIds = Array.from(new Set(pending.map((p) => p.row.user_id)));
  const { data: usersRaw } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);
  const userById = new Map<string, { email: string; full_name: string | null }>();
  for (const u of (usersRaw ?? []) as Array<{ id: string; email: string; full_name: string | null }>) {
    userById.set(u.id, { email: u.email, full_name: u.full_name });
  }

  let mailsSent = 0;
  let mailsSkipped = 0;
  let mailsFailed = 0;
  for (const p of pending) {
    const u = userById.get(p.row.user_id);
    if (!u) {
      mailsSkipped++;
      continue;
    }
    let result;
    if (p.kind === "new_match") {
      result = await sendNewMatchEmail({
        to: u.email,
        recipientName: u.full_name?.split(" ")[0] ?? null,
        profileName: p.profileName,
        matchScore: p.matchScore,
        matchLabel: p.matchLabel,
        qualityScore: p.qualityScore,
        property: {
          id: p.propRow.id,
          address: p.propRow.address,
          partido: p.propRow.partido,
          price_amount: toNumber(p.propRow.price_amount),
          price_currency: p.propRow.price_currency,
          property_type: p.propRow.property_type,
          photos: [],
        },
      });
    } else {
      result = await sendPriceDropEmail({
        to: u.email,
        recipientName: u.full_name?.split(" ")[0] ?? null,
        oldAmount: p.oldAmount,
        newAmount: p.newAmount,
        currency: p.currency,
        property: {
          id: p.propRow.id,
          address: p.propRow.address,
          partido: p.propRow.partido,
          photos: [],
        },
      });
    }
    if (result.ok) mailsSent++;
    else if ("skipped" in result && result.skipped) mailsSkipped++;
    else mailsFailed++;
  }

  console.log(`\n=== Resultado ===`);
  console.log(`  Alertas insertadas:  ${inserted}`);
  console.log(`  Emails enviados:     ${mailsSent}`);
  console.log(`  Emails skip (cfg):   ${mailsSkipped}`);
  console.log(`  Emails con error:    ${mailsFailed}`);
}

main().catch((err) => {
  console.error("✗ Falla:", err);
  process.exit(1);
});
