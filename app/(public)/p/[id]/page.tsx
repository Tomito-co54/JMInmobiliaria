import { notFound } from "next/navigation";
import { getPropertyForPublicView } from "@/lib/db/properties";
import { getPrimarySearchProfile } from "@/lib/db/search-profiles";
import { computeMatchScore, type PropertyForMatching } from "@/lib/matching";
import { getCurrentUserId } from "@/lib/db/users";
import { isFavorited } from "@/lib/db/favorites";
import { PropertyTopBar } from "@/components/property/PropertyTopBar";
import { PropertyCover } from "@/components/property/PropertyCover";
import { PropertyPriceBlock } from "@/components/property/PropertyPriceBlock";
import { VerifiedDataList } from "@/components/property/VerifiedDataList";
import { PropertyMapSection } from "@/components/property/PropertyMapSection";
import { PropertyDescription } from "@/components/property/PropertyDescription";
import { PropertyHistory } from "@/components/property/PropertyHistory";
import { PropertyCTAs } from "@/components/property/PropertyCTAs";
import { QualityScoreCard } from "@/components/scoring/QualityScoreCard";
import { MatchScoreCard } from "@/components/matching/MatchScoreCard";

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

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const view = await getPropertyForPublicView(id);
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
  const view = await getPropertyForPublicView(id);
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

  return (
    <main className="min-h-screen bg-background">
      <PropertyTopBar />

      <article className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        <PropertyCover photos={property.photos} alt={altText} />

        <PropertyPriceBlock
          priceAmount={property.price_amount}
          priceCurrency={property.price_currency}
          propertyType={property.property_type}
          operationType={property.operation_type}
          partido={property.partido}
          address={property.address}
          rooms={property.rooms}
          bedrooms={property.bedrooms}
          bathrooms={property.bathrooms}
          garages={property.garages}
          surfaceTotal={property.surface_total}
          surfaceArba={property.surface_arba}
        />

        {matchBreakdown && profile && (
          <MatchScoreCard breakdown={matchBreakdown} profileName={profile.name} />
        )}

        <QualityScoreCard breakdown={property.quality_score_breakdown} />

        <VerifiedDataList property={property} arbaLookup={arbaLookup} />

        <PropertyMapSection
          lat={property.lat}
          lng={property.lng}
          address={property.address}
          partido={property.partido}
          arbaGeoJson={arbaLookup?.raw_response ?? null}
        />

        <PropertyDescription description={property.description} />

        <PropertyHistory
          history={history}
          firstSeenAt={property.first_seen_at}
          lastSeenAt={property.last_seen_at}
          isActive={property.is_active}
          priceCurrency={property.price_currency}
        />

        <PropertyCTAs
          propertyId={property.id}
          sourceUrl={property.url}
          source={property.source}
          isFavorited={favorited}
          signedOut={!userId}
        />
      </article>
    </main>
  );
}
