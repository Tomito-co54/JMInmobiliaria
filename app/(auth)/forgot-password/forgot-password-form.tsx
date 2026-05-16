"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/shared/form-error";
import { requestPasswordReset } from "@/app/(auth)/actions";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await requestPasswordReset(formData);

      if (result.ok) {
        setSubmitted(true);
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Email enviado</p>
        <p className="mt-1 text-muted-foreground">
          Si existe una cuenta con ese email, te enviamos un link para
          recuperar tu contraseña. Revisá tu casilla (y la carpeta de spam).
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
          disabled={isPending}
        />
        <FormError message={fieldErrors.email?.[0]} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar link de recuperación"}
      </Button>
    </form>
  );
}
