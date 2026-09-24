/**
 * Which of a partner's listings are units of the same building.
 *
 * The family's buildings are grouped by cadastral parcel (lib/buildings): two
 * units on the same parcel are the same building, by definition. A partner's
 * listings carry no parcel, only the point their agency pinned and the
 * address they typed, and neither alone is enough (measured on Laudani's
 * catalog, 24-sep-2026):
 *
 *   - The address is typed by hand: "Diagonal Brown 1574" and "Diagonal
 *     Almirante Brown 1574" are one building with six units; "Alsina 333" and
 *     "Valentin Alsina 333" are one.
 *   - The pin is placed by hand: two units of Jorge San Pellerano 700 fall on
 *     neighbouring parcels, and one of Somellera 538 lands 49 m away, on
 *     another block.
 *
 * So two listings are the same building when EITHER they share an address
 * (compared without case, accents or extra spaces) OR the cadastre puts both
 * pins inside the same parcel. Only a pin that falls inside counts — a
 * "nearest parcel within 30 m" is how Somellera ended up on the wrong block.
 *
 * A building of two or more gets one parcel and one address for all its
 * units, so it groups like the family's and is titled with one name:
 *   - the parcel most of its pins fall inside (ties: the lowest listing id);
 *   - the address most of its units use (ties: the longest spelling — the
 *     fuller name, "Diagonal Almirante Brown" over "Diagonal Brown").
 * A listing alone keeps its address and gets no parcel: a parcel on a single
 * listing would group it with nothing, and could only ever be wrong.
 *
 * Pure: the lookups happen in scripts/sincronizar-colegas.ts.
 */

export interface PartnerUnit {
  externalId: string;
  address: string | null;
  /** The parcel the cadastre gave for the pin, and whether the pin was inside it. */
  parcel: { nomenclatura: string; inside: boolean } | null;
}

export interface BuildingAssignment {
  /** Shared by every unit of a building; null for a listing on its own. */
  nomenclatura: string | null;
  address: string | null;
  /** How many listings are in its building (1 when alone). */
  size: number;
}

const foldAddress = (a: string) =>
  a
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function mostCommon(values: readonly string[], tieBreak: (a: string, b: string) => number): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || tieBreak(a[0], b[0]))[0][0];
}

export function groupPartnerUnits(units: readonly PartnerUnit[]): Map<string, BuildingAssignment> {
  // Union-find over the listings.
  const parent = new Map<string, string>(units.map((u) => [u.externalId, u.externalId]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  };

  const byAddress = new Map<string, string>();
  const byParcel = new Map<string, string>();
  for (const u of units) {
    if (u.address) {
      const key = foldAddress(u.address);
      const seen = byAddress.get(key);
      if (seen) union(seen, u.externalId);
      else byAddress.set(key, u.externalId);
    }
    if (u.parcel?.inside) {
      const seen = byParcel.get(u.parcel.nomenclatura);
      if (seen) union(seen, u.externalId);
      else byParcel.set(u.parcel.nomenclatura, u.externalId);
    }
  }

  const components = new Map<string, PartnerUnit[]>();
  for (const u of units) {
    const root = find(u.externalId);
    const list = components.get(root);
    if (list) list.push(u);
    else components.set(root, [u]);
  }

  const out = new Map<string, BuildingAssignment>();
  for (const members of components.values()) {
    if (members.length === 1) {
      const [u] = members;
      out.set(u.externalId, { nomenclatura: null, address: u.address, size: 1 });
      continue;
    }
    const sorted = [...members].sort((a, b) => a.externalId.localeCompare(b.externalId));
    const inside = sorted.filter((u) => u.parcel?.inside).map((u) => u.parcel!.nomenclatura);
    // With no pin inside any parcel (Murature 2195: both pins ~23 m off), the
    // nearest parcel they agree on still places a building the address
    // already formed. It never forms one: joining is by address or by "inside".
    const near = sorted.filter((u) => u.parcel).map((u) => u.parcel!.nomenclatura);
    // Ties keep the first one met in id order, which Map insertion preserves.
    const nomenclatura = mostCommon(inside.length > 0 ? inside : near, () => 0);
    const address = mostCommon(
      sorted.map((u) => u.address).filter((a): a is string => !!a),
      (a, b) => b.length - a.length,
    );
    for (const u of members) {
      out.set(u.externalId, { nomenclatura, address: address ?? u.address, size: members.length });
    }
  }
  return out;
}
