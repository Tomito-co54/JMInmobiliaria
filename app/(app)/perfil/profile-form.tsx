"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/shared/form-error";
import { updateProfile } from "./actions";

interface ProfileFormProps {
  defaultValues: {
    fullName: string;
    phone: string;
  };
  email: string;
}

export function ProfileForm({ defaultValues, email }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfile(formData);

      if (result.ok) {
        toast.success("Perfil actualizado");
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={email}
          disabled
          readOnly
          className="bg-muted/50"
        />
        <p className="text-xs text-muted-foreground">
          El email no se puede cambiar.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={defaultValues.fullName}
          required
          disabled={isPending}
        />
        <FormError message={fieldErrors.fullName?.[0]} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono (opcional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+54 9 11 ..."
          defaultValue={defaultValues.phone}
          disabled={isPending}
        />
        <FormError message={fieldErrors.phone?.[0]} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
