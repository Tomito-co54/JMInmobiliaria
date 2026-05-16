import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/shared/google-button";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Iniciar sesión — Jotaeme",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresá con tu email o con Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton />

        <div className="relative">
          <Separator />
          <span className="absolute inset-0 -top-3 flex justify-center">
            <span className="bg-card px-2 text-xs text-muted-foreground">
              o con email
            </span>
          </span>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link
            href="/register"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
