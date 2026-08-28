/**
 * Whether the paid services are offered to the public.
 *
 * Off (28-ago-2026), on purpose and reversibly. The MercadoPago checkout and
 * the ARBA report PDF work end to end — Block 7 of the upstream shipped them
 * — but the site is not ready to take money for an informe while the catalog
 * is four listings old and the agency is still settling what it charges for.
 *
 * Hidden, not removed, which is the same call as Fase 8: `/p/[id]/servicios`
 * still resolves, the webhook still fulfils an order, and nothing in the
 * database changes. What disappears is every public way in — the button on
 * the property panel, the CTA in the buying-process advisor, and the "Lo
 * ofrecemos" badge on the documents it would sell.
 *
 * Flip this to true and the three surfaces come back as they were.
 */
export const PAID_SERVICES_PUBLIC = false;
