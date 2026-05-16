import Link from "next/link";

/**
 * Shared layout for all auth pages (/login, /register, /forgot-password, etc.).
 * Mobile-first: centered card on a neutral background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="px-4 py-4 border-b bg-background">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
        >
          Jotaeme
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
