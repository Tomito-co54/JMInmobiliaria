import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/shared/user-menu";
import { AdminSidebar } from "@/components/shared/admin-sidebar";

/**
 * Admin-only layout. Redirects:
 *   - / (home)  if no session
 *   - /dashboard if session but role != admin
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-tight"
            >
              Jotaeme
            </Link>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </div>
          <UserMenu
            email={profile.email ?? user.email ?? ""}
            fullName={profile.full_name}
          />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 border-r bg-muted/30 hidden md:block shrink-0">
          <AdminSidebar />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
