import { createOwnerPropertyAction } from "@/app/admin/properties/actions";

/**
 * Trigger route for "+ Nueva propiedad". Renders nothing — the server
 * action creates a fresh draft row and redirects to the editor.
 *
 * Implemented as a page (not a button-action wired from the list) so:
 *   - The URL is shareable / bookmarkable.
 *   - The admin layout's auth guard runs before any DB write.
 *   - Refreshing creates exactly one new draft per visit (idempotent
 *     enough; the broker can delete stray drafts from the list).
 */
export default async function NewPropertyPage() {
  await createOwnerPropertyAction();
  // The action redirects internally; we never get here. Returning null
  // keeps Next.js happy about the page signature.
  return null;
}
