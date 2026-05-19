import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/shared/user-menu";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { getUnreadAlertsCount, getUserAlerts } from "@/lib/db/alerts";

/**
 * Layout for authenticated app routes (/dashboard, /perfil, etc.).
 * Redirects to /login if no session.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Load alerts up front so the bell renders with real data on first paint.
  const [alerts, unreadCount] = await Promise.all([
    getUserAlerts(20),
    getUnreadAlertsCount(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/buscar"
            aria-label="Jotaeme — ver propiedades"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BrandLogo variant="isotipo" size={28} />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell alerts={alerts} unreadCount={unreadCount} />
            <UserMenu email={user.email ?? ""} fullName={profile?.full_name} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
