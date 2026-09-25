/**
 * Whether a photo should skip Next's image optimizer.
 *
 * A partner's photos are served straight from their host (staticbp.com, the
 * BuscadorProp platform; josemartinoinmobiliaria.com.ar, the family's agency
 * in Villa del Dique), already at a web size. Sending them through the
 * optimizer would spend the Vercel image quota on roughly a thousand source
 * images a month — and past the quota the optimizer stops for every photo,
 * the family's included. The family's own photos (Supabase Storage) keep
 * going through it.
 */
const DIRECT_HOSTS = new Set([
  "staticbp.com",
  "www.staticbp.com",
  "josemartinoinmobiliaria.com.ar",
  "www.josemartinoinmobiliaria.com.ar",
]);

export function skipsOptimizer(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    return DIRECT_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}
