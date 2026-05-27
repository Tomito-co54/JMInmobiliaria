import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PropertyEditor } from "./property-editor";

export const metadata = {
  title: "Editar propiedad — Admin Jotaeme",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const OWNER_SOURCES = ["owner_direct", "agency"];

export default async function EditPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Layout already enforces admin — this fetch is the data load.
  const { data, error } = await supabase
    .from("properties")
    .select(
      [
        "id",
        "source",
        "listing_status",
        "property_type",
        "operation_type",
        "price_amount",
        "price_currency",
        "description",
        "surface_total",
        "surface_covered",
        "surface_arba",
        "rooms",
        "bedrooms",
        "bathrooms",
        "garages",
        "partido",
        "partida",
        "nomenclatura_catastral",
        "tpa",
        "address",
        "photos",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    notFound();
  }

  const row = data as unknown as PropertyRowFromDb;

  // Owner-only editor — scraped properties have their own (read-only) detail
  // view at /admin/properties/[id].
  if (!OWNER_SOURCES.includes(row.source)) {
    redirect(`/admin/properties/${id}`);
  }

  return (
    <div className="px-6 py-6 space-y-4 max-w-5xl">
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Volver al listado
      </Link>

      <PropertyEditor initial={row} />
    </div>
  );
}

export interface PropertyRowFromDb {
  id: string;
  source: string;
  listing_status: "borrador" | "publicada" | "vendida" | null;
  property_type: string | null;
  operation_type: string | null;
  price_amount: number | null;
  price_currency: "USD" | "ARS" | null;
  description: string | null;
  surface_total: number | null;
  surface_covered: number | null;
  surface_arba: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  partido: string | null;
  partida: string | null;
  nomenclatura_catastral: string | null;
  tpa: string | null;
  address: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}
