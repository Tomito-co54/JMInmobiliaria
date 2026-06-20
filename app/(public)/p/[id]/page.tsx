import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPropertyForPublicView } from "@/lib/db/properties";
import { getPrimarySearchProfile } from "@/lib/db/search-profiles";
import { computeMatchScore, type PropertyForMatching } from "@/lib/matching";
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
import { PropertyDescription } from "@/components/property/PropertyDescription";
import { PropertyHistory } from "@/components/property/PropertyHistory";
import { BuyingProcessAdvisor } from "@/components/property/BuyingProcessAdvisor";
import { getScoreBand } from "@/lib/scoring/bands";

/**
 * Public property view — the "wow moment" page (Block 4).
 *
 * No auth required. RLS allows public SELECT on properties + property_history.
 * arba_lookups is admin-only at the RLS level, but `getPropertyForPublicView`
 * runs server-side via the service-role-equivalent path, so the data is
 * available to derive the breakdown.
 *
 * Server Component by default — only client-side islands (tooltip popovers,
 * the breakdown sheet, the description toggle, the Leaflet map) are isolated
 * as "use client" components.
 *
 * Layout order is the progressive disclosure spelled out in the Block 4
 * design: hook (foto + precio + score), evidence (datos oficiales, mapa),
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

  const { property, arbaLookup, history } = view;
  const altText = property.address ?? "Propiedad";

  // Compute match against the buyer's primary search profile, if any.
  // getPrimarySearchProfile runs through the user-bound client; RLS ensures
  // we only see this user's own profile. Returns null when logged out or
  // when the buyer hasn't created a profile yet — in which case we skip
  // rendering the match card altogether.
  const profile = await getPrimarySearchProfile();
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
  };
  const matchBreakdown = profile
    ? computeMatchScore(propertyForMatching, profile)
    : null;

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

  const score = property.quality_score_breakdown?.score ?? null;
  const scoreBand = getScoreBand(score);
  // ARBA-verified = we matched the parcel against the cadastral service.
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
          {/* LEFT — hero + evidence + narrative */}
          <div className="space-y-12 lg:space-y-14">
            <PropertyHero
              photos={property.photos}
              alt={altText}
              address={property.address}
              partido={property.partido}
              typeLabel={typeLabel}
              opLabel={opLabel}
              score={score}
              scoreBandLabel={scoreBand.label}
              scoreBandHex={scoreBand.hex}
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
                qualityBreakdown={property.quality_score_breakdown}
                matchBreakdown={matchBreakdown}
                matchProfileName={profile?.name ?? null}
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
              subtitle="Lo que pudimos verificar contra ARBA, el organismo catastral de la provincia de Buenos Aires."
            >
              <VerifiedDataList property={property} arbaLookup={arbaLookup} />
            </EditorialSection>

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

            <EditorialSection title="Historial">
              <PropertyHistory
                history={history}
                firstSeenAt={property.first_seen_at}
                lastSeenAt={property.last_seen_at}
                isActive={property.is_active}
                priceCurrency={property.price_currency}
              />
            </EditorialSection>
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
              qualityBreakdown={property.quality_score_breakdown}
              matchBreakdown={matchBreakdown}
              matchProfileName={profile?.name ?? null}
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
