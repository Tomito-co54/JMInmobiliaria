import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/shared/user-menu";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            Jotaeme
          </Link>
          <UserMenu email={user.email ?? ""} fullName={profile?.full_name} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
