import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * "+ Nueva propiedad" target. Creates a fresh draft owner property
 * inline (no Server Action) and redirects to the editor.
 *
 * Why inline and not via a Server Action: Server Actions invoked from
 * a render context (a Server Component body) can't call revalidatePath
 * — Next.js 15 explicitly forbids that. We don't actually need to
 * revalidate /admin/properties here anyway:
 *
 *   - The redirect takes the broker to the editor, not back to the list.
 *   - The list page is dynamically rendered (no `revalidate` / no cache),
 *     so the next visit re-fetches and shows the new draft.
 *
 * Auth: the parent /admin/layout.tsx already redirects unauthenticated
 * or non-admin users — we re-check here only to satisfy the type narrow
 * before the insert.
 */
export default async function NewPropertyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin/properties");
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      source: "owner_direct",
      listing_status: "borrador",
      is_active: true,
      operation_type: "venta",
      price_currency: "USD",
    } as never)
    .select("id")
    .single();

  if (error) {
    throw new Error(`No pudimos crear la propiedad: ${error.message}`);
  }

  const id = (data as { id: string }).id;
  redirect(`/admin/properties/${id}/editar`);
}
