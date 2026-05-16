"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormErrorBanner } from "@/components/shared/form-error";
import { resetPassword } from "@/app/(auth)/actions";

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [bannerError, setBannerError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    setBannerError(undefined);
    setFieldErrors({});

    startTransition(async () => {
      const result = await resetPassword(formData);

      if (result && !result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else {
          setBannerError(result.error);
          toast.error(result.error);
        }
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <FormErrorBanner message={bannerError} />

      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
        <FormError message={fieldErrors.password?.[0]} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
        <FormError message={fieldErrors.confirmPassword?.[0]} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
