import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Recuperar contraseña — Jotaeme",
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresá tu email y te enviamos un link para crear una nueva.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
