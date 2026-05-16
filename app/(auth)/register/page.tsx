import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/shared/google-button";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Crear cuenta — Jotaeme",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Empezá a buscar propiedades verificadas en Zona Sur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton label="Continuar con Google" />

        <div className="relative">
          <Separator />
          <span className="absolute inset-0 -top-3 flex justify-center">
            <span className="bg-card px-2 text-xs text-muted-foreground">
              o con email
            </span>
          </span>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
