"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormErrorBanner } from "@/components/shared/form-error";
import { signIn } from "@/app/(auth)/actions";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [bannerError, setBannerError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    setBannerError(undefined);
    setFieldErrors({});

    startTransition(async () => {
      const result = await signIn(formData);

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            ¿La olvidaste?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
        />
        <FormError message={fieldErrors.password?.[0]} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
