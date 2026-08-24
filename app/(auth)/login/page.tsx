import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { AuthCallbackNotice } from "./auth-callback-notice";

export const metadata = {
  title: "Iniciar sesión — Jotaeme",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresá con tu email y contraseña
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthCallbackNotice initialCode={error} />
        <LoginForm />
      </CardContent>
    </Card>
  );
}
