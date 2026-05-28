import Link from "next/link";
import { Eye, ArrowLeft } from "lucide-react";

/**
 * Banner shown at the top of /p/[id] when an admin is viewing a property
 * that's NOT yet 'publicada'. Anonymous visitors never reach this state —
 * the strict listing_status filter 404s them before the page renders.
 *
 * Purpose: make it unambiguous that what the admin is looking at is a
 * preview, not what the public sees. Provides a quick link back to the
 * editor.
 */
export function PreviewBanner({
  propertyId,
  listingStatus,
}: {
  propertyId: string;
  listingStatus: "borrador" | "publicada" | "vendida";
}) {
  const message =
    listingStatus === "borrador"
      ? "Vista previa de un borrador. Los visitantes anónimos no la ven hasta que la publiques."
      : listingStatus === "vendida"
        ? "Vista previa de una propiedad marcada como vendida. Los visitantes anónimos no la ven."
        : "Vista previa de admin."; // safety fallback, shouldn't trigger

  return (
    <div className="border-b bg-amber-500/10 px-4 py-2 text-sm">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Eye className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
        <Link
          href={`/admin/properties/${propertyId}/editar`}
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-200 hover:underline shrink-0"
        >
          <ArrowLeft className="size-3" />
          Editor
        </Link>
      </div>
    </div>
  );
}
