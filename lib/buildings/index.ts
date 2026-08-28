/**
 * Buildings — grouping units that share a cadastral parcel.
 *
 * A building stands on a parcel, so two units with the same
 * `nomenclatura_catastral` are in the same building. That is a definition,
 * not a heuristic, and ARBA is the one saying it — which is the same claim
 * the rest of the site is built on.
 *
 * Why not the obvious alternatives:
 *
 *   - **The address text.** Alsina 1639 is in the database four ways:
 *     "Alsina 1639", "ALSINA 1639", "alsina 1639", "Avenida Alsina 1639".
 *     Ten units, one building, four spellings. String matching never groups
 *     them; the parcel does it without a single normalisation rule.
 *   - **The partida.** Works today only because the building is not
 *     subdivided yet. The day the propiedad horizontal is registered each
 *     unit gets its own partida, and the grouping breaks exactly when the
 *     building has the most units to group.
 *   - **`property_groups`.** That table exists but means something else:
 *     "these listings are the SAME property in different portals" (dedup).
 *     Same building is a different relation, and folding it in would break
 *     the dedup it was built for.
 *
 * Everything here is derived — no table, no migration, no field to fill in.
 * When a building earns an identity of its own (a name, common-area photos,
 * amenities), a `buildings` table can be added and only `buildingKey` has to
 * learn about it: it would return the `building_id` when present and fall
 * back to the parcel. The callers do not change.
 */

export interface BuildingKeyed {
  /**
   * Optional as well as nullable: not every row shape the callers hand over
   * carries the column, and a shape that omits it should group as "unknown"
   * rather than fail to compile and push someone into a cast.
   */
  nomenclatura_catastral?: string | null;
}

/**
 * The building a property belongs to, or null when we cannot tell.
 *
 * Null is a normal outcome, not a failure: the ARBA lookup is deliberately
 * non-fatal, so a property can be published without one. Those simply do not
 * group, and every caller has to degrade quietly.
 */
export function buildingKey(property: BuildingKeyed): string | null {
  const n = property.nomenclatura_catastral?.trim();
  return n ? n : null;
}

/** Groups rows by building. Rows with no key are left out entirely. */
export function groupByBuilding<T extends BuildingKeyed>(
  rows: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = buildingKey(row);
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export interface PricedUnit extends BuildingKeyed {
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
}

export interface BuildingSummary {
  key: string;
  unitCount: number;
  /** Cheapest published unit, for a "desde" line. Null when none has a price. */
  fromPrice: number | null;
  fromCurrency: "USD" | "ARS" | null;
}

/**
 * One summary per building, keyed the same way as `groupByBuilding`.
 *
 * Only buildings with more than one unit are returned: a single property is
 * not a building the reader needs told about, and a badge saying "1 unidad"
 * is noise on every other card in the catalog.
 *
 * The "desde" price only mixes what can be compared — the cheapest is picked
 * within the currency most of the units use, because "desde $80.000" next to
 * "desde USD 80.000" is worse than saying nothing.
 */
export function summariseBuildings(
  rows: readonly PricedUnit[],
): Map<string, BuildingSummary> {
  const out = new Map<string, BuildingSummary>();

  for (const [key, units] of groupByBuilding(rows)) {
    if (units.length < 2) continue;

    const byCurrency = new Map<string, number[]>();
    for (const u of units) {
      if (u.price_amount === null || u.price_amount <= 0 || !u.price_currency) continue;
      const list = byCurrency.get(u.price_currency);
      if (list) list.push(u.price_amount);
      else byCurrency.set(u.price_currency, [u.price_amount]);
    }

    let fromPrice: number | null = null;
    let fromCurrency: "USD" | "ARS" | null = null;
    let best = 0;
    for (const [currency, prices] of byCurrency) {
      if (prices.length > best) {
        best = prices.length;
        fromCurrency = currency as "USD" | "ARS";
        fromPrice = Math.min(...prices);
      }
    }

    out.set(key, { key, unitCount: units.length, fromPrice, fromCurrency });
  }

  return out;
}
