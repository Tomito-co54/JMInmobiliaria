"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KNOWN_MUST_HAVES } from "@/lib/matching";
import { PARTIDOS_ZONA_SUR, type PartidoZonaSur } from "@/lib/zona-sur/partidos";
import { cn } from "@/lib/utils";

/**
 * Shared form for creating or editing a search profile.
 *
 * Used by:
 *   - /onboarding              — first profile creation (no initialValues)
 *   - /busquedas/nueva         — additional profile (no initialValues)
 *   - /busquedas/[id]/editar   — edit (initialValues populated)
 *
 * Receives the server action as a prop so each surface can dispatch its
 * own (create vs update). On success the action redirects, so the form's
 * own state never needs to reset.
 */

export type BuyingStageSlug =
  | "pre-busqueda"
  | "busqueda"
  | "reserva"
  | "due-diligence"
  | "boleto-y-escritura"
  | "post-escritura";

export interface SearchProfileFormValues {
  name: string;
  zones: Array<{ partido: PartidoZonaSur; priority: "preferido" | "aceptable" | "descarte" }>;
  operation_type: "venta" | "alquiler" | null;
  property_types: ("casa" | "departamento" | "ph" | "lote" | "local")[];
  price_currency: "USD" | "ARS";
  price_min: number | null;
  price_max: number | null;
  rooms_min: number | null;
  surface_min: number | null;
  must_haves: (typeof KNOWN_MUST_HAVES)[number][];
  current_stage: BuyingStageSlug | null;
}

export type SearchProfileActionResult = { ok: true } | { ok: false; error: string };

interface SearchProfileFormProps {
  initialValues?: Partial<SearchProfileFormValues>;
  action: (input: SearchProfileFormValues) => Promise<SearchProfileActionResult | void>;
  submitLabel: string;
  /** When set, renders a secondary "Cancelar" button below the submit. */
  cancelHref?: string;
}

const PROPERTY_TYPES = [
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "ph", label: "PH" },
  { value: "lote", label: "Lote" },
  { value: "local", label: "Local" },
] as const;

const MUST_HAVE_LABELS: Record<string, string> = {
  cochera: "Cochera",
  patio: "Patio",
  balcon: "Balcón",
  parrilla: "Parrilla / Quincho",
  pileta: "Pileta",
  terraza: "Terraza",
  jardin: "Jardín",
  ascensor: "Ascensor",
  amenities: "Amenities",
  seguridad: "Seguridad",
};

const STAGE_OPTIONS: {
  value: BuyingStageSlug | "none";
  label: string;
  hint?: string;
}[] = [
  {
    value: "none",
    label: "Todavía no estoy seguro",
    hint: "Estamos viendo opciones, sin compromiso.",
  },
  {
    value: "pre-busqueda",
    label: "Pre-búsqueda",
    hint: "Definiendo presupuesto, financiación, qué busco.",
  },
  {
    value: "busqueda",
    label: "Búsqueda y visitas",
    hint: "Mirando avisos y visitando propiedades.",
  },
  {
    value: "reserva",
    label: "Hice o estoy por hacer una reserva",
    hint: "Encontré una propiedad y la quiero apartar.",
  },
  {
    value: "due-diligence",
    label: "Pidiendo informes (due diligence)",
    hint: "Dominio, inhibiciones, catastro, libres deuda.",
  },
  {
    value: "boleto-y-escritura",
    label: "Boleto firmado / camino a escritura",
    hint: "Falta poco para ser dueño.",
  },
  {
    value: "post-escritura",
    label: "Ya escrituré",
    hint: "Tareas administrativas finales.",
  },
];

type ZonePriorityState = "none" | "preferido" | "aceptable" | "descarte";

function parseIntOrNull(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function SearchProfileForm({
  initialValues = {},
  action,
  submitLabel,
  cancelHref,
}: SearchProfileFormProps) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initialValues.name ?? "Mi búsqueda");
  const [zonePriorities, setZonePriorities] = useState<Record<string, ZonePriorityState>>(() => {
    const map = Object.fromEntries(PARTIDOS_ZONA_SUR.map((p) => [p, "none" as ZonePriorityState]));
    for (const z of initialValues.zones ?? []) {
      map[z.partido] = z.priority;
    }
    return map;
  });
  const [operationType, setOperationType] = useState<"venta" | "alquiler" | "any">(
    initialValues.operation_type === null
      ? "any"
      : initialValues.operation_type ?? "venta",
  );
  const [propertyTypes, setPropertyTypes] = useState<Set<string>>(
    () => new Set(initialValues.property_types ?? ["casa", "departamento", "ph"]),
  );
  const [priceCurrency, setPriceCurrency] = useState<"USD" | "ARS">(
    initialValues.price_currency ?? "USD",
  );
  const [priceMin, setPriceMin] = useState(initialValues.price_min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initialValues.price_max?.toString() ?? "");
  const [roomsMin, setRoomsMin] = useState(initialValues.rooms_min?.toString() ?? "");
  const [surfaceMin, setSurfaceMin] = useState(initialValues.surface_min?.toString() ?? "");
  const [mustHaves, setMustHaves] = useState<Set<string>>(
    () => new Set(initialValues.must_haves ?? []),
  );
  const [currentStage, setCurrentStage] = useState<BuyingStageSlug | "none">(
    initialValues.current_stage ?? "none",
  );

  function toggleType(value: string) {
    setPropertyTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleMustHave(value: string) {
    setMustHaves((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function setZonePriority(partido: string, priority: ZonePriorityState) {
    setZonePriorities((prev) => ({ ...prev, [partido]: priority }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (propertyTypes.size === 0) {
      toast.error("Elegí al menos un tipo de propiedad");
      return;
    }
    const zones = Object.entries(zonePriorities)
      .filter(([, p]) => p !== "none")
      .map(([partido, priority]) => ({
        partido: partido as PartidoZonaSur,
        priority: priority as Exclude<ZonePriorityState, "none">,
      }));

    startTransition(async () => {
      const result = await action({
        name: name.trim() || "Mi búsqueda",
        zones,
        operation_type: operationType === "any" ? null : operationType,
        property_types: Array.from(propertyTypes) as SearchProfileFormValues["property_types"],
        price_currency: priceCurrency,
        price_min: parseIntOrNull(priceMin),
        price_max: parseIntOrNull(priceMax),
        rooms_min: parseIntOrNull(roomsMin),
        surface_min: parseIntOrNull(surfaceMin),
        must_haves: Array.from(mustHaves) as SearchProfileFormValues["must_haves"],
        current_stage: currentStage === "none" ? null : currentStage,
      });
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nombre</CardTitle>
          <CardDescription>Cómo te referís a esta búsqueda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="name" className="sr-only">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Casa familiar en Lomas"
            maxLength={60}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zonas que te interesan</CardTitle>
          <CardDescription>
            Marcá cada zona con la prioridad que tenga para vos. Las que dejes en
            &quot;Excluir&quot; no se evalúan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {PARTIDOS_ZONA_SUR.map((partido) => {
              const current = zonePriorities[partido];
              return (
                <li
                  key={partido}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-card/50 px-3 py-2"
                >
                  <span className="font-medium text-sm">{partido}</span>
                  <div className="flex gap-1 flex-wrap">
                    {(["none", "preferido", "aceptable", "descarte"] as const).map((priority) => {
                      const label =
                        priority === "none"
                          ? "Excluir"
                          : priority === "preferido"
                            ? "Preferido"
                            : priority === "aceptable"
                              ? "Aceptable"
                              : "Descartar";
                      const active = current === priority;
                      const tint =
                        priority === "preferido"
                          ? "data-[active=true]:bg-emerald-100 data-[active=true]:text-emerald-900 data-[active=true]:border-emerald-300"
                          : priority === "aceptable"
                            ? "data-[active=true]:bg-amber-100 data-[active=true]:text-amber-900 data-[active=true]:border-amber-300"
                            : priority === "descarte"
                              ? "data-[active=true]:bg-red-100 data-[active=true]:text-red-900 data-[active=true]:border-red-300"
                              : "data-[active=true]:bg-muted data-[active=true]:text-foreground";
                      return (
                        <button
                          type="button"
                          key={priority}
                          data-active={active}
                          onClick={() => setZonePriority(partido, priority)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted/60",
                            tint,
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Comprar o alquilar?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(["venta", "alquiler", "any"] as const).map((op) => {
              const label =
                op === "venta" ? "Comprar" : op === "alquiler" ? "Alquilar" : "Cualquiera";
              return (
                <button
                  type="button"
                  key={op}
                  data-active={operationType === op}
                  onClick={() => setOperationType(op)}
                  className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo de propiedad</CardTitle>
          <CardDescription>Podés elegir varios.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROPERTY_TYPES.map(({ value, label }) => (
              <label
                key={value}
                htmlFor={`type-${value}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/60"
              >
                <Checkbox
                  id={`type-${value}`}
                  checked={propertyTypes.has(value)}
                  onCheckedChange={() => toggleType(value)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rango de precio</CardTitle>
          <CardDescription>Dejá un campo vacío si no tenés mínimo o máximo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select
              value={priceCurrency}
              onValueChange={(v) => setPriceCurrency(v as "USD" | "ARS")}
            >
              <SelectTrigger id="currency" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (dólares)</SelectItem>
                <SelectItem value="ARS">ARS (pesos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price-min">Mínimo</Label>
              <Input
                id="price-min"
                inputMode="numeric"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))}
                placeholder="50000"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="price-max">Máximo</Label>
              <Input
                id="price-max"
                inputMode="numeric"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))}
                placeholder="200000"
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tamaño mínimo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rooms">Ambientes</Label>
              <Input
                id="rooms"
                inputMode="numeric"
                value={roomsMin}
                onChange={(e) => setRoomsMin(e.target.value.replace(/\D/g, ""))}
                placeholder="3"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="surface">Superficie (m²)</Label>
              <Input
                id="surface"
                inputMode="numeric"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value.replace(/\D/g, ""))}
                placeholder="80"
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">No-negociables</CardTitle>
          <CardDescription>Lo que no puede faltar. Opcional.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KNOWN_MUST_HAVES.map((tag) => (
              <label
                key={tag}
                htmlFor={`mh-${tag}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/60"
              >
                <Checkbox
                  id={`mh-${tag}`}
                  checked={mustHaves.has(tag)}
                  onCheckedChange={() => toggleMustHave(tag)}
                />
                <span className="text-sm">{MUST_HAVE_LABELS[tag] ?? tag}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿En qué etapa estás?</CardTitle>
          <CardDescription>
            Opcional. Si nos contás dónde estás en tu proceso, cuando entres a
            una propiedad te mostramos qué documentos te faltan y cuál es tu
            próximo paso. Podés cambiarlo cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STAGE_OPTIONS.map((opt) => {
              const active = currentStage === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCurrentStage(opt.value)}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 size-4 rounded-full border-2 shrink-0 grid place-items-center",
                      active ? "border-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {active && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="text-sm leading-snug">
                    <span className="font-medium">{opt.label}</span>
                    {opt.hint && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {opt.hint}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-end gap-2">
        {cancelHref && (
          <a
            href={cancelHref}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-2.5 h-9 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            )}
          >
            Cancelar
          </a>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
