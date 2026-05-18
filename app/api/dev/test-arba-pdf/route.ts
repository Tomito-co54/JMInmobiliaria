import { NextResponse, type NextRequest } from "next/server";
import { generateArbaReport } from "@/lib/services/pdf";

/**
 * Dev-only endpoint that generates a sample ARBA PDF and returns it.
 * Used to verify the PDF generator works end-to-end in the Next.js
 * server environment (with `server-only` imports resolved correctly).
 *
 * Disabled in production via the env check at the top.
 */
export const dynamic = "force-dynamic";

const SAMPLE = {
  orderId: "12345678-aaaa-bbbb-cccc-000000000001",
  generatedAt: new Date().toISOString(),
  property: {
    address: "Av. Hipólito Yrigoyen 8200, Lomas de Zamora",
    partido: "Lomas de Zamora",
    surface_total: 142,
    surface_covered: 105,
    property_type: "casa",
  },
  arba: {
    partida: "025070750",
    nomenclatura: "065-25-7-7-50",
    surface_arba: 254.52,
    tipo: "Urbano edificado",
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-58.405, -34.768],
            [-58.404, -34.768],
            [-58.404, -34.769],
            [-58.405, -34.769],
            [-58.405, -34.768],
          ],
        ],
      ],
    },
  },
};

export async function GET(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 404 });
  }
  const buffer = await generateArbaReport(SAMPLE);
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=sample-arba-report.pdf",
      "Cache-Control": "no-store",
    },
  });
}
