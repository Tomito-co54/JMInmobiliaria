import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPropertyForPublicView, getBuildingUnits } from "@/lib/db/properties";
import { getPrimarySearchProfile } from "@/lib/db/search-profiles";
import type { PropertyForMatching } from "@/lib/matching";
import { getCurrentUserId } from "@/lib/db/users";
import { isFavorited } from "@/lib/db/favorites";
import { PreviewBanner } from "./preview-banner";
import { PropertyTopBar } from "@/components/property/PropertyTopBar";
import { PropertyHero } from "@/components/property/PropertyHero";
import { PropertyDataPanel } from "@/components/property/PropertyDataPanel";
import { PropertyMobileBar } from "@/components/property/PropertyMobileBar";
import { EditorialSection } from "@/components/property/EditorialSection";
import { VerifiedDataList } from "@/components/property/VerifiedDataList";
import { PropertyMapSection } from "@/components/property/PropertyMapSection";
import { BuildingUnits } from "@/components/property/BuildingUnits";
import { PropertyDescription } from "@/components/property/PropertyDescription";
import { BuyingProcessAdvisor } from "@/components/property/BuyingProcessAdvisor";

/**
 * Public property view — the "wow moment" page (Block 4).
 *
 * No auth required. RLS allows public SELECT on properties.
 * arba_lookups is admin-only at the RLS level, but `getPropertyForPublicView`
 * runs server-side via the service-role-equivalent path, so the data is
 * available to derive the breakdown.
 *
 * Server Component by default — only client-side islands (tooltip popovers,
 * the breakdown sheet, the description toggle, the Leaflet map) are isolated
 * as "use client" components.
 *
 * Layout order is the progressive disclosure spelled out in the Block 4
 * design: hook (foto + precio), evidence (datos oficiales, mapa),
 * narrative (descripción, historial), action (CTAs).
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Decides whether the current request is an admin previewing a draft.
 * Admins can see borrador/vendida; anonymous and non-admin users can't.
 * Defined once and reused by both generateMetadata and the page itself.
 */
async function isAdminPreview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return (profile as { role?: string } | null)?.role === "admin";
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const allowDrafts = await isAdminPreview();
  const view = await getPropertyForPublicView(id, { allowDrafts });
  if (!view) return { title: "Propiedad no encontrada — Jotaeme" };
  const { property } = view;
  const title = property.address
    ? `${property.address} — Jotaeme`
    : `Propiedad ${property.id.slice(0, 8)} — Jotaeme`;
  return {
    title,
    description: property.description?.slice(0, 200) ?? undefined,
  };
}

export default async function PublicPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const allowDrafts = await isAdminPreview();
  const view = await getPropertyForPublicView(id, { allowDrafts });
  if (!view) notFound();

  const { property, arbaLookup } = view;

  // Sibling units on the same parcel. Its own await rather than part of
  // getPropertyForPublicView because it depends on the row we just read.
  const buildingUnits = await getBuildingUnits(
    property.nomenclatura_catastral,
    property.id,
  );
  const altText = property.address ?? "Propiedad";

  // Still read for the buying-process advisor below, which is rendered only
  // for a signed-in user and takes `current_stage` from here. It no longer
  // feeds the match.
  const profile = await getPrimarySearchProfile();

  // The match is computed in the browser now, against preferences the visitor
  // sets on the page itself (see PropertyMatchPanel). It used to be computed
  // here against `search_profiles`, which needs a logged-in user who finished
  // onboarding — and with no public registration on this site, that is the
  // broker and nobody else. The card was in the panel behind a condition no
  // visitor could satisfy.
  //
  // So the server's job is now just handing down the fields to score against.
  const propertyForMatching: PropertyForMatching = {
    partido: property.partido,
    property_type: property.property_type,
    operation_type: property.operation_type,
    price_amount: property.price_amount,
    price_currency: property.price_currency,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    surface_total: property.surface_total,
    surface_arba: property.surface_arba,
    garages: property.garages,
    description: property.description,
    year_built: property.year_built,
  };
  // Favorite state — `isFavorited` returns false for anonymous, so the
  // heart button just degrades to a "login required" toast on click.
  const userId = await getCurrentUserId();
  const favorited = userId ? await isFavorited(userId, property.id) : false;

  // Preview banner: only shows when an admin is looking at a non-publicada
  // property. Anonymous visitors never reach this branch (the strict
  // listing_status filter 404s them before this code runs).
  const showPreviewBanner =
    allowDrafts && property.listing_status !== "publicada";

  // Derived display data for the hero + panel.
  const TYPE_LABELS: Record<string, string> = {
    casa: "Casa",
    departamento: "Departamento",
    ph: "PH",
    lote: "Lote",
    local: "Local",
  };
  const OP_LABELS: Record<string, string> = {
    venta: "en venta",
    alquiler: "en alquiler",
  };
  const typeLabel = property.property_type
    ? TYPE_LABELS[property.property_type] ?? property.property_type
    : "Propiedad";
  const opLabel = property.operation_type
    ? OP_LABELS[property.operation_type] ?? property.operation_type
    : null;

  // Verified = we matched the parcel against the cadastral service. The chip
  // it drives no longer names the agency; the check is the same one.
  const arbaVerified =
    !!property.partida || arbaLookup?.match_strategy === "intersects" ||
    arbaLookup?.match_strategy === "dwithin";

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-0">
      {showPreviewBanner && (
        <PreviewBanner
          propertyId={property.id}
          listingStatus={
            (property.listing_status as
              | "borrador"
              | "vendida"
              | "publicada"
              | null) ?? "borrador"
          }
        />
      )}
      <PropertyTopBar title={altText} />

      <div className="max-w-6xl mx-auto px-4 py-5 sm:py-7">
        {/* Two-column on desktop: scrolling content left, sticky data panel
            right. Single column on mobile (panel flows inline after the
            hero + supporting sections). */}
        <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-8 lg:items-start">
          {/* LEFT — hero + evidence + narrative.

              `min-w-0` is load-bearing: a `1fr` grid track defaults to
              `min-width: auto`, so its min-content wins over its share. The
              thumbnail strip is a flex row of eighteen 80px photos — about
              1500px of min-content — and without this it dragged the whole
              column, and the hero with it, to 1576px inside a 1120px grid.
              That is what made the cover look bigger after the gallery
              landed, not the aspect ratio. */}
          <div className="min-w-0 space-y-12 lg:space-y-14">
            <PropertyHero
              photos={property.photos}
              alt={altText}
              address={property.address}
              partido={property.partido}
              typeLabel={typeLabel}
              opLabel={opLabel}
              arbaVerified={arbaVerified}
            />

            {/* On mobile the data panel comes right after the hero, before
                the supporting sections. On desktop it lives in the sticky
                right column instead (rendered once, below). */}
            <div className="lg:hidden pt-3">
              <PropertyDataPanel
                propertyId={property.id}
                address={property.address}
                priceAmount={property.price_amount}
                priceCurrency={property.price_currency}
                rooms={property.rooms}
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                garages={property.garages}
                surfaceTotal={property.surface_total}
                surfaceArba={property.surface_arba}
                yearBuilt={property.year_built}
                propertyForMatching={propertyForMatching}
                source={property.source}
                sourceUrl={property.url}
                isFavorited={favorited}
                signedOut={!userId}
              />
            </div>

            {userId && (
              <BuyingProcessAdvisor
                propertyId={property.id}
                currentStage={profile?.current_stage ?? null}
                showSetupPrompt={!profile?.current_stage}
              />
            )}

            <EditorialSection
              title="Datos oficiales"
              subtitle="Lo que pudimos verificar contra los registros oficiales, dato por dato."
            >
              <VerifiedDataList property={property} arbaLookup={arbaLookup} />
            </EditorialSection>

            {buildingUnits.length > 0 && (
              <EditorialSection
                title="Otras unidades en este edificio"
                subtitle={`${buildingUnits.length} ${
                  buildingUnits.length === 1
                    ? "unidad más está publicada"
                    : "unidades más están publicadas"
                } sobre la misma parcela catastral.`}
              >
                <BuildingUnits units={buildingUnits} />
              </EditorialSection>
            )}

            <EditorialSection title="Ubicación">
              <PropertyMapSection
                lat={property.lat}
                lng={property.lng}
                address={property.address}
                partido={property.partido}
                arbaGeoJson={arbaLookup?.raw_response ?? null}
              />
            </EditorialSection>

            <EditorialSection title="Descripción">
              <PropertyDescription description={property.description} />
            </EditorialSection>

            {/* El "Historial" salió de acá. Decía cosas como "lo seguimos hace
                3 días" — lenguaje del portal agregador del upstream, donde
                seguir el aviso de otro a lo largo del tiempo ERA el producto y
                el visitante quería saber si el precio se había movido antes de
                que él llegara. Esta es la página de la inmobiliaria: la
                publicación es nuestra, la subimos nosotros, y contarle al
                comprador hace cuántos días la miramos no dice nada sobre la
                propiedad. `property_history` sigue registrando todo y sigue
                siendo la materia prima de /admin/mercado. */}
          </div>

          {/* RIGHT — sticky data panel (desktop only). When the panel is
              taller than the available viewport height, it scrolls
              internally instead of clipping its bottom (overflow-y-auto +
              max-height against the viewport minus the top offset). */}
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain">
            <PropertyDataPanel
              propertyId={property.id}
              address={property.address}
              priceAmount={property.price_amount}
              priceCurrency={property.price_currency}
              rooms={property.rooms}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              garages={property.garages}
              surfaceTotal={property.surface_total}
              surfaceArba={property.surface_arba}
              yearBuilt={property.year_built}
              propertyForMatching={propertyForMatching}
              source={property.source}
              sourceUrl={property.url}
              isFavorited={favorited}
              signedOut={!userId}
            />
          </aside>
        </div>
      </div>

      {/* Sticky bottom action bar — mobile only */}
      <PropertyMobileBar
        propertyId={property.id}
        address={property.address}
        priceAmount={property.price_amount}
        priceCurrency={property.price_currency}
        isFavorited={favorited}
        signedOut={!userId}
      />
    </main>
  );
}
