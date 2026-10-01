import type { CrawlEnd } from "@/lib/services/scrapers/crawl-completeness";

/**
 * Whether a run over a partner's site counts as a sync at all.
 *
 * Null when the partner was read; otherwise the reason it was not, in the
 * words the report prints. scripts/sincronizar-colegas.ts finishes every
 * partner and then exits non-zero if any of them has a reason, so the daily
 * workflow goes red and GitHub mails it.
 *
 * It used to end green. Villa del Dique was loaded on 25-sep-2026 and was
 * not touched again: six daily runs of the workflow said "success" while its
 * listings aged, and a run from Tomy's PC read the same site without trouble.
 * Nothing was taken down (decideDeactivation held), which is exactly why
 * nobody saw it — a sync that reads nothing and reports nothing looks the
 * same as one with nothing to do. Same family as the scrapers' fail-open
 * guards: "could not read" must never pass for "nothing changed".
 *
 * `baseline` is how many of the partner's listings were published before the
 * run: a number, or null when that read failed. An empty listing is only
 * believable when the baseline is a real zero (a partner with nothing yet).
 */
export function unreadReason(
  end: CrawlEnd,
  listed: number,
  baseline: number | null,
  unreadable: number,
): string | null {
  if (end !== "exhausted") return `el listado no se pudo recorrer entero (fin: ${end})`;
  if (listed === 0 && baseline !== 0) return "el listado volvió vacío";
  if (listed > 0 && unreadable > listed / 2) return `${unreadable} de ${listed} fichas no cargaron`;
  return null;
}
