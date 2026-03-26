import { MapPin } from "lucide-react";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";

interface CompanionQuickFactsProps {
  viewing: EnrichedViewing;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);
}

export function CompanionQuickFacts({ viewing }: CompanionQuickFactsProps) {
  const facts: { emoji?: string; icon?: React.ReactNode; label: string; highlight?: boolean }[] = [];

  // Location
  const locationParts = [viewing.project_city, viewing.project_region].filter(Boolean);
  if (locationParts.length > 0) {
    facts.push({ icon: <MapPin className="h-3.5 w-3.5" />, label: locationParts.join(", ") });
  }

  // Price range
  if (viewing.price_from || viewing.price_to) {
    const label = viewing.price_from && viewing.price_to
      ? `${formatPrice(viewing.price_from)} – ${formatPrice(viewing.price_to)}`
      : viewing.price_from
        ? `Vanaf ${formatPrice(viewing.price_from)}`
        : `Tot ${formatPrice(viewing.price_to!)}`;
    facts.push({ emoji: "💰", label, highlight: true });
  }

  // Bedrooms
  if (viewing.min_bedrooms || viewing.max_bedrooms) {
    const min = viewing.min_bedrooms;
    const max = viewing.max_bedrooms;
    const label = min && max && min !== max ? `${min}–${max} slpk` : `${min || max} slpk`;
    facts.push({ emoji: "🛏", label });
  }

  // Surface area
  if (viewing.min_area || viewing.max_area) {
    const min = viewing.min_area;
    const max = viewing.max_area;
    const label = min && max && min !== max ? `${min}–${max}m²` : `${min || max}m²`;
    facts.push({ emoji: "📐", label });
  }

  // Pool
  if (viewing.has_private_pool) {
    facts.push({ emoji: "🏊", label: "Privézwembad" });
  } else if (viewing.has_communal_pool) {
    facts.push({ emoji: "🏊", label: "Gemeensch. zwembad" });
  }

  // Property types
  if (viewing.property_types?.length) {
    const typeMap: Record<string, string> = {
      apartment: "Appartement",
      villa: "Villa",
      townhouse: "Rijwoning",
      penthouse: "Penthouse",
      bungalow: "Bungalow",
      duplex: "Duplex",
    };
    const translated = viewing.property_types
      .slice(0, 2)
      .map((t) => typeMap[t.toLowerCase()] || t)
      .join(", ");
    facts.push({ emoji: "🏠", label: translated });
  }

  if (facts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {facts.map((fact, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${
            fact.highlight
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted/60 text-foreground"
          }`}
        >
          {fact.icon || <span>{fact.emoji}</span>}
          <span>{fact.label}</span>
        </span>
      ))}
    </div>
  );
}
