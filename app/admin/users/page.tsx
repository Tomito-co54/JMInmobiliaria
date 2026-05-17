import { getUsersAdmin } from "@/lib/db/admin";
import { Badge } from "@/components/ui/badge";
import { UsersFilters } from "./users-filters";
import { Pagination } from "@/components/shared/pagination";

export const metadata = {
  title: "Usuarios — Admin Jotaeme",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    page?: string;
  }>;
}

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "agency":
      return "Inmobiliaria";
    case "buyer":
      return "Comprador";
    default:
      return role;
  }
}

function roleVariant(
  role: string,
): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "agency") return "secondary";
  return "outline";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const role =
    params.role === "buyer" ||
    params.role === "agency" ||
    params.role === "admin"
      ? params.role
      : "all";

  const result = await getUsersAdmin({
    search: params.search,
    role,
    page,
    pageSize: 25,
  });

  return (
    <div className="px-6 py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground mt-1">
          {result.total.toLocaleString("es-AR")} usuarios registrados.
        </p>
      </header>

      <UsersFilters />

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left font-medium p-3">Email</th>
              <th className="text-left font-medium p-3">Nombre</th>
              <th className="text-left font-medium p-3">Teléfono</th>
              <th className="text-center font-medium p-3">Rol</th>
              <th className="text-left font-medium p-3">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Sin usuarios que coincidan con esos filtros.
                </td>
              </tr>
            ) : (
              result.rows.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{u.email}</td>
                  <td className="p-3 text-muted-foreground">
                    {u.full_name || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.phone || "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={roleVariant(u.role)}>
                      {roleLabel(u.role)}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
