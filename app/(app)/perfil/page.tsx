import { getCurrentUser } from "@/lib/db/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export const metadata = {
  title: "Mi perfil — Jotaeme",
};

export default async function PerfilPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Layout already redirects, but TypeScript needs the narrowing.
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground mt-1">
          Editá tu información personal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
          <CardDescription>
            Esta información se usa para personalizar tu experiencia y
            comunicarnos con vos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email}
            defaultValues={{
              fullName: user.full_name ?? "",
              phone: user.phone ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
