"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PARTIDOS_ZONA_SUR_ENTRIES,
  validatePartida,
} from "@/lib/zona-sur/partidos";
import { canPublishProperty } from "@/lib/validators/property";
import {
  changeListingStatusAction,
  clearArbaDataAction,
  deleteOwnerPropertyAction,
  lookupArbaByPartidaAction,
  updateOwnerPropertyAction,
} from "@/app/admin/properties/actions";
import { useAutoSave } from "@/hooks/use-autosave";
import { PhotoUploader } from "./photo-uploader";
import { SectionSaveIndicator } from "./section-save-indicator";
import type { PropertyRowFromDb } from "./page";

/**
 * Single-screen property loader. All sections live side-by-side; the broker
 * can fill them in any order. Each card autosaves silently 800ms after the
 * last edit — no explicit "Guardar" button. A small indicator next to the
 * section title tells you when changes are persisting.
 *
 * Status bar at the top: badge + transition buttons. Publish is gated by
 * the canPublishProperty() check. Includes a "Ver como comprador" link so
 * the broker can preview the public-facing detail page (drafts allowed
 * for admins; anonymous visitors still 404 on non-publicada properties).
 */
export function PropertyEditor({ initial }: { initial: PropertyRowFromDb }) {
  const [row, setRow] = useState(initial);
  const router = useRouter();

  function applyRowPatch(patch: Partial<PropertyRowFromDb>) {
    setRow((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-4">
      <StatusBar
        row={row}
        onPatch={applyRowPatch}
        onDeleted={() => router.push("/admin/properties")}
      />

      <ArbaSection row={row} onPatch={applyRowPatch} />

      <PublicacionSection row={row} onPatch={applyRowPatch} />

      <TecnicosSection row={row} onPatch={applyRowPatch} />

      <UbicacionSection row={row} onPatch={applyRowPatch} />

      <PhotosSection row={row} onPatch={applyRowPatch} />
    </div>
  );
}

// ===========================================================================
// Status bar — top of the editor
// ===========================================================================

function StatusBar({
  row,
  onPatch,
  onDeleted,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const status = row.listing_status ?? "borrador";

  const publishCheck = canPublishProperty({
    property_type: row.property_type,
    operation_type: row.operation_type,
    price_amount: row.price_amount,
    price_currency: row.price_currency,
    partido: row.partido,
    partida: row.partida,
    nomenclatura_catastral: row.nomenclatura_catastral,
    address: row.address,
    photos: row.photos,
  });

  function setStatus(newStatus: "borrador" | "publicada" | "vendida") {
    startTransition(async () => {
      const result = await changeListingStatusAction(row.id, newStatus);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onPatch({ listing_status: newStatus });
      toast.success(
        newStatus === "publicada"
          ? "Publicada"
          : newStatus === "vendida"
            ? "Marcada como vendida"
            : "Vuelta a borrador",
      );
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "¿Eliminar esta propiedad? Se borrarán sus fotos. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteOwnerPropertyAction(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Propiedad eliminada");
      onDeleted();
    });
  }

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/95 backdrop-blur px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Estado:</span>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/p/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Abre la vista pública en una pestaña nueva"
        >
          <Eye className="size-3.5" />
          Ver como comprador
        </Link>
        <Separator orientation="vertical" className="h-6" />
        {status !== "publicada" && (
          <Button
            size="sm"
            disabled={pending || !publishCheck.ok}
            onClick={() => setStatus("publicada")}
            title={
              publishCheck.ok
                ? "Publicar al catálogo"
                : `Faltan: ${publishCheck.missing.join(", ")}`
            }
          >
            Publicar
          </Button>
        )}
        {status === "publicada" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setStatus("borrador")}
          >
            Volver a borrador
          </Button>
        )}
        {status !== "vendida" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("vendida")}
          >
            Marcar vendida
          </Button>
        )}
        {status === "vendida" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("borrador")}
          >
            Reactivar
          </Button>
        )}
        <Separator orientation="vertical" className="h-6" />
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={handleDelete}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "borrador" | "publicada" | "vendida";
}) {
  if (status === "publicada") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">Publicada</Badge>
    );
  }
  if (status === "vendida") {
    return <Badge className="bg-blue-600 hover:bg-blue-600">Vendida</Badge>;
  }
  return <Badge variant="secondary">Borrador</Badge>;
}

// ===========================================================================
// Section 1 — ARBA (partido + partida + lookup)
//
// This section is NOT autosaved — the only writes happen through the ARBA
// lookup action (which is a button click) or the "Re-consultar" action.
// ===========================================================================

function ArbaSection({
  row,
  onPatch,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
}) {
  const [partido, setPartido] = useState(row.partido ?? "");
  const [partida, setPartida] = useState(row.partida ?? "");
  const [pending, startTransition] = useTransition();
  const [warning, setWarning] = useState<string | null>(null);

  const hasArbaData = !!row.nomenclatura_catastral;

  // Inline validation — runs on every keystroke once both fields have
  // something. While either is empty we show no error (clean state).
  // The button enables only when validation passes.
  const inlineValidation = useMemo(() => {
    if (!partido || partida.trim() === "") return null;
    return validatePartida(partido, partida);
  }, [partido, partida]);
  const canLookup =
    !pending &&
    partido !== "" &&
    partida.trim() !== "" &&
    (inlineValidation?.ok ?? false);

  function handleLookup() {
    setWarning(null);
    startTransition(async () => {
      const result = await lookupArbaByPartidaAction(row.id, partido, partida);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onPatch({
        partido,
        partida: result.data?.partida ?? null,
        nomenclatura_catastral: result.data?.nomenclatura ?? null,
        surface_arba: result.data?.surfaceArba ?? null,
        tpa: result.data?.tpa ?? null,
      });
      if (result.data?.warning) {
        setWarning(result.data.warning);
        toast.warning("ARBA respondió pero con observaciones");
      } else {
        toast.success("Datos de ARBA cargados");
      }
    });
  }

  function handleReConsult() {
    if (
      !confirm(
        "Esto limpia los datos catastrales actuales para volver a consultar ARBA. ¿Continuar?",
      )
    ) {
      return;
    }
    setWarning(null);
    startTransition(async () => {
      const result = await clearArbaDataAction(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Clear local state too so the inputs become editable.
      onPatch({
        partida: null,
        nomenclatura_catastral: null,
        surface_arba: null,
        tpa: null,
      });
      setPartida("");
      toast.success("Datos catastrales limpiados — re-ingresá la partida.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos catastrales (ARBA)</CardTitle>
        <CardDescription>
          Ingresá el partido y la partida exactos. Validamos formato local
          antes de consultar ARBA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="partido">Partido</Label>
            <select
              id="partido"
              value={partido}
              disabled={hasArbaData || pending}
              onChange={(e) => setPartido(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Elegí un partido</option>
              {PARTIDOS_ZONA_SUR_ENTRIES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.arbaCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partida">Partida (9 dígitos)</Label>
            <Input
              id="partida"
              value={partida}
              disabled={hasArbaData || pending}
              placeholder="063-056-604"
              onChange={(e) => setPartida(e.target.value)}
              aria-invalid={
                inlineValidation && !inlineValidation.ok ? "true" : undefined
              }
              className={
                inlineValidation && !inlineValidation.ok
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
            />
            {inlineValidation && !inlineValidation.ok && (
              <p className="text-xs text-destructive">
                {inlineValidation.message}
              </p>
            )}
          </div>
        </div>

        {!hasArbaData && (
          <Button size="sm" disabled={!canLookup} onClick={handleLookup}>
            {pending ? "Consultando ARBA…" : "Traer datos de ARBA"}
          </Button>
        )}

        {hasArbaData && (
          <>
            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Partida</span>
                <span className="font-mono tabular-nums">
                  {row.partida ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Nomenclatura</span>
                <span className="font-mono text-xs">
                  {row.nomenclatura_catastral ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Superficie ARBA</span>
                <span className="tabular-nums">
                  {row.surface_arba !== null ? `${row.surface_arba} m²` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tipo</span>
                <span>{row.tpa ?? "—"}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleReConsult}
              title="Limpia los datos catastrales y permite volver a consultar"
            >
              <RefreshCw className="size-3.5" />
              Re-consultar ARBA
            </Button>
          </>
        )}

        {warning && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            ⚠️ {warning}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Section 2 — Publicación (autosaved)
// ===========================================================================

function PublicacionSection({
  row,
  onPatch,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
}) {
  const [propertyType, setPropertyType] = useState(row.property_type ?? "");
  const [operationType, setOperationType] = useState(
    row.operation_type ?? "venta",
  );
  const [priceAmount, setPriceAmount] = useState(
    row.price_amount !== null ? String(row.price_amount) : "",
  );
  const [priceCurrency, setPriceCurrency] = useState(
    row.price_currency ?? "USD",
  );
  const [description, setDescription] = useState(row.description ?? "");

  const values = useMemo(
    () => ({
      property_type: propertyType,
      operation_type: operationType,
      price_amount: priceAmount,
      price_currency: priceCurrency,
      description,
    }),
    [propertyType, operationType, priceAmount, priceCurrency, description],
  );

  const { status, lastError } = useAutoSave(values, async () => {
    const result = await updateOwnerPropertyAction(row.id, values);
    if (!result.ok) throw new Error(result.error);
    onPatch({
      property_type: propertyType || null,
      operation_type: operationType,
      price_amount: priceAmount ? parseFloat(priceAmount) : null,
      price_currency: priceCurrency as "USD" | "ARS",
      description: description || null,
    });
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Publicación</CardTitle>
          <SectionSaveIndicator status={status} lastError={lastError} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <FieldSelect
            id="property_type"
            label="Tipo"
            value={propertyType}
            onChange={setPropertyType}
            options={[
              { value: "", label: "—" },
              { value: "casa", label: "Casa" },
              { value: "departamento", label: "Departamento" },
              { value: "ph", label: "PH" },
              { value: "lote", label: "Lote" },
              { value: "local", label: "Local" },
            ]}
          />
          <FieldSelect
            id="operation_type"
            label="Operación"
            value={operationType}
            onChange={setOperationType}
            options={[
              { value: "venta", label: "Venta" },
              { value: "alquiler", label: "Alquiler" },
            ]}
          />
          <div className="space-y-1.5">
            <Label htmlFor="price_amount">Precio</Label>
            <Input
              id="price_amount"
              type="number"
              step="any"
              min="0"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
            />
          </div>
          <FieldSelect
            id="price_currency"
            label="Moneda"
            value={priceCurrency}
            onChange={(v) => setPriceCurrency(v as "USD" | "ARS")}
            options={[
              { value: "USD", label: "USD" },
              { value: "ARS", label: "ARS" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Detalle de la propiedad — descripción comercial…"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Section 3 — Datos técnicos (autosaved)
// ===========================================================================

function TecnicosSection({
  row,
  onPatch,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
}) {
  const [surfaceTotal, setSurfaceTotal] = useState(
    row.surface_total !== null ? String(row.surface_total) : "",
  );
  const [surfaceCovered, setSurfaceCovered] = useState(
    row.surface_covered !== null ? String(row.surface_covered) : "",
  );
  const [rooms, setRooms] = useState(row.rooms !== null ? String(row.rooms) : "");
  const [bedrooms, setBedrooms] = useState(
    row.bedrooms !== null ? String(row.bedrooms) : "",
  );
  const [bathrooms, setBathrooms] = useState(
    row.bathrooms !== null ? String(row.bathrooms) : "",
  );
  const [garages, setGarages] = useState(
    row.garages !== null ? String(row.garages) : "",
  );

  const values = useMemo(
    () => ({
      surface_total: surfaceTotal,
      surface_covered: surfaceCovered,
      rooms,
      bedrooms,
      bathrooms,
      garages,
    }),
    [surfaceTotal, surfaceCovered, rooms, bedrooms, bathrooms, garages],
  );

  const { status, lastError } = useAutoSave(values, async () => {
    const result = await updateOwnerPropertyAction(row.id, values);
    if (!result.ok) throw new Error(result.error);
    const toInt = (s: string) => (s ? parseInt(s, 10) : null);
    const toNum = (s: string) => (s ? parseFloat(s) : null);
    onPatch({
      surface_total: toNum(surfaceTotal),
      surface_covered: toNum(surfaceCovered),
      rooms: toInt(rooms),
      bedrooms: toInt(bedrooms),
      bathrooms: toInt(bathrooms),
      garages: toInt(garages),
    });
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Datos técnicos</CardTitle>
          <SectionSaveIndicator status={status} lastError={lastError} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <NumberField
            id="surface_total"
            label="m² total"
            value={surfaceTotal}
            onChange={setSurfaceTotal}
          />
          <NumberField
            id="surface_covered"
            label="m² cubierto"
            value={surfaceCovered}
            onChange={setSurfaceCovered}
          />
          <NumberField
            id="rooms"
            label="Ambientes"
            value={rooms}
            onChange={setRooms}
            integer
          />
          <NumberField
            id="bedrooms"
            label="Dormitorios"
            value={bedrooms}
            onChange={setBedrooms}
            integer
          />
          <NumberField
            id="bathrooms"
            label="Baños"
            value={bathrooms}
            onChange={setBathrooms}
            integer
          />
          <NumberField
            id="garages"
            label="Cocheras"
            value={garages}
            onChange={setGarages}
            integer
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Section 4 — Ubicación (autosaved)
// ===========================================================================

function UbicacionSection({
  row,
  onPatch,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
}) {
  const [address, setAddress] = useState(row.address ?? "");

  const values = useMemo(() => ({ address }), [address]);

  const { status, lastError } = useAutoSave(values, async () => {
    const result = await updateOwnerPropertyAction(row.id, { address });
    if (!result.ok) throw new Error(result.error);
    onPatch({ address: address || null });
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Ubicación</CardTitle>
          <SectionSaveIndicator status={status} lastError={lastError} />
        </div>
        <CardDescription>
          El partido vive en la sección ARBA (vincula con catastro).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle Nombre 1234"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Section 5 — Fotos (not autosaved — its own upload/reorder pipeline)
// ===========================================================================

function PhotosSection({
  row,
  onPatch,
}: {
  row: PropertyRowFromDb;
  onPatch: (patch: Partial<PropertyRowFromDb>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fotos</CardTitle>
        <CardDescription>
          La primera es la portada del catálogo. Arrastrá para reordenar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhotoUploader
          propertyId={row.id}
          photos={row.photos ?? []}
          onChange={(photos) => onPatch({ photos })}
        />
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Small reusable form atoms
// ===========================================================================

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  integer = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  integer?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={integer ? "1" : "any"}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

