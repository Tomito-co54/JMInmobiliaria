import { NextResponse } from "next/server";
import { getPropertyForPublicView } from "@/lib/db/properties";
import { generatePropertySheet } from "@/lib/services/pdf";
import { WHATSAPP_DISPLAY } from "@/lib/brand/contact";

/**
 * GET /p/[id]/ficha.pdf — the listing as a one-page PDF.
 *
 * Goes through `getPropertyForPublicView` and not a raw query, so the same
 * two-gate filter that hides a draft from the page hides it from the file.
 * A downloadable draft would be a leak with a nicer extension.
 *
 * `.pdf` in the path rather than a `?format=pdf` so the browser and whatever
 * the buyer forwards it to (WhatsApp, mail) see the extension and treat it
 * as a document. `Content-Disposition: attachment` with a filename built
 * from the address, because "download.pdf" in a folder of listings is
 * useless.
 *
 * Rendering is a few hundred milliseconds plus fetching the cover photo, so
 * the response is cached: the sheet only changes when the listing does.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const view = await getPropertyForPublicView(id);
  if (!view) {
    return new NextResponse("No encontramos esa propiedad.", { status: 404 });
  }

  const p = view.property;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jm-inmobiliaria-d3pa.vercel.app";

  let pdf: Buffer;
  try {
    pdf = await generatePropertySheet({
      generatedAt: new Date().toLocaleDateString("es-AR"),
      url: `${appUrl}/p/${p.id}`,
      whatsappDisplay: WHATSAPP_DISPLAY,
      property: {
        address: p.address,
        partido: p.partido,
        property_type: p.property_type,
        operation_type: p.operation_type,
        price_amount: p.price_amount,
        price_currency: p.price_currency,
        surface_total: p.surface_total,
        surface_covered: p.surface_covered,
        surface_arba: p.surface_arba,
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        garages: p.garages,
        partida: p.partida,
        nomenclatura_catastral: p.nomenclatura_catastral,
        description: p.description,
        tags: p.tags,
        coverUrl: p.photos?.[0] ?? null,
      },
    });
  } catch (err) {
    // A photo that will not load must not cost the buyer the whole sheet:
    // retry once without it rather than returning a 500 over an image.
    console.error("[ficha.pdf] falló con foto, reintento sin ella:", err);
    try {
      pdf = await generatePropertySheet({
        generatedAt: new Date().toLocaleDateString("es-AR"),
        url: `${appUrl}/p/${p.id}`,
        whatsappDisplay: WHATSAPP_DISPLAY,
          property: {
          address: p.address,
          partido: p.partido,
          property_type: p.property_type,
          operation_type: p.operation_type,
          price_amount: p.price_amount,
          price_currency: p.price_currency,
          surface_total: p.surface_total,
          surface_covered: p.surface_covered,
          surface_arba: p.surface_arba,
          rooms: p.rooms,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          garages: p.garages,
          partida: p.partida,
          nomenclatura_catastral: p.nomenclatura_catastral,
          description: p.description,
        tags: p.tags,
            coverUrl: null,
        },
      });
    } catch (err2) {
      console.error("[ficha.pdf] falló sin foto:", err2);
      return new NextResponse("No pudimos generar la ficha.", { status: 500 });
    }
  }

  const slug =
    (p.address ?? "propiedad")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "propiedad";

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jotaeme-${slug}.pdf"`,
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
