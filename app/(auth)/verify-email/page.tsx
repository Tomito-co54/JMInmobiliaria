import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Confirmá tu email — Jotaeme",
};

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Revisá tu email</CardTitle>
        <CardDescription>Te enviamos un link para confirmar tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
          <p>Próximos pasos:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Abrí tu casilla de email.</li>
            <li>Buscá el mensaje de Jotaeme (revisá spam si no aparece).</li>
            <li>Hacé clic en el link de confirmación.</li>
            <li>Vas a entrar automáticamente a tu cuenta.</li>
          </ol>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
