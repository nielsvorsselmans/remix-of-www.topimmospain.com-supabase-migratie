import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Bed, Maximize, Euro, ChevronRight, CheckCircle2, Sun, TreePine, Eye, Compass, Waves, Building2, Wind, Car, Bath } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Unit } from "@/hooks/useProjectLandingData";

interface UnitConfiguratorProps {
  units: Unit[];
  projectName: string;
  onGenerateDescriptions?: () => void;
  isGeneratingDescriptions?: boolean;
}

function cleanDescription(text: string): string {
  return text
    .replace(/&#13;/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function UnitCard({ unit, onClick }: { unit: Unit; onClick: () => void }) {
  return (
    <Card
      className="group border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={unit.thumbnail}
          alt={`Woning ${unit.id}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">
          {unit.floorLabel || unit.type}
        </Badge>
      </div>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground">{unit.title}</h3>
          <span className="text-xl font-bold text-primary">{formatCurrency(unit.price, 0)}</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
          <span className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            {unit.bedrooms} slpk
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            {unit.sizeM2} m²
          </span>
          {unit.terrace && (
            <span className="flex items-center gap-1">
              + {unit.terrace} m² terras
            </span>
          )}
        </div>
        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          Details bekijken
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function UnitDetailModal({ unit, onClose, isGenerating }: { unit: Unit; onClose: () => void; isGenerating?: boolean }) {
  // Extra specs that are type-specific
  const extraSpecs = useMemo(() => {
    const specs: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
    if (unit.solarium) specs.push({ icon: <Sun className="h-5 w-5" />, label: "Solarium", value: "Privé dakterras" });
    if (unit.garden) specs.push({ icon: <TreePine className="h-5 w-5" />, label: "Tuin", value: unit.plotSize ? `${unit.plotSize} m²` : "Eigen tuin" });
    if (unit.seaViews) specs.push({ icon: <Eye className="h-5 w-5" />, label: "Zeezicht", value: "Ja" });
    if (unit.mountainViews) specs.push({ icon: <Eye className="h-5 w-5" />, label: "Bergzicht", value: "Ja" });
    if (unit.orientation) specs.push({ icon: <Compass className="h-5 w-5" />, label: "Oriëntatie", value: unit.orientation });
    if (unit.communalPool) specs.push({ icon: <Waves className="h-5 w-5" />, label: "Zwembad", value: "Gemeenschappelijk" });
    if (unit.elevator) specs.push({ icon: <Building2 className="h-5 w-5" />, label: "Lift", value: "Ja" });
    if (unit.airconditioning) specs.push({ icon: <Wind className="h-5 w-5" />, label: "Airco", value: "Ja" });
    if (unit.parking) specs.push({ icon: <Car className="h-5 w-5" />, label: "Parking", value: `${unit.parking} plaats${unit.parking > 1 ? 'en' : ''}` });
    return specs;
  }, [unit]);

  const descriptionParagraphs = useMemo(() => {
    if (!unit.description) return [];
    return cleanDescription(unit.description)
      .split('\n\n')
      .filter(p => p.trim().length > 0)
      .slice(0, 3);
  }, [unit.description]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {unit.title} — {unit.floorLabel || unit.type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Carousel */}
          {unit.images && unit.images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {unit.images.map((img, idx) => (
                  <CarouselItem key={idx}>
                    <div className="rounded-xl overflow-hidden bg-muted aspect-video">
                      <img
                        src={img}
                        alt={`${unit.title} - foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          ) : unit.floorplan ? (
            <div className="rounded-xl overflow-hidden bg-muted">
              <img
                src={unit.floorplan}
                alt={`Grondplan woning ${unit.id}`}
                className="w-full h-auto"
              />
            </div>
          ) : null}

          {/* AI Intro or cleaned description */}
          <div>
            {unit.aiIntro ? (
              <p className="text-muted-foreground leading-relaxed">{unit.aiIntro}</p>
            ) : isGenerating ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
              </div>
            ) : descriptionParagraphs.length > 0 ? (
              <div className="space-y-3">
                {descriptionParagraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            ) : null}
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted rounded-lg p-4 text-center">
              <Bed className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">{unit.bedrooms}</p>
              <p className="text-xs text-muted-foreground">Slaapkamers</p>
            </div>
            {unit.bathrooms && (
              <div className="bg-muted rounded-lg p-4 text-center">
                <Bath className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">{unit.bathrooms}</p>
                <p className="text-xs text-muted-foreground">Badkamers</p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-4 text-center">
              <Maximize className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">{unit.sizeM2} m²</p>
              <p className="text-xs text-muted-foreground">Woonoppervlakte</p>
            </div>
            {unit.terrace && (
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-lg font-bold">{unit.terrace} m²</p>
                <p className="text-xs text-muted-foreground">Terras</p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-4 text-center">
              <Euro className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">{formatCurrency(unit.price, 0)}</p>
              <p className="text-xs text-muted-foreground">Vraagprijs</p>
            </div>
          </div>

          {/* Extra Specs (type-specific) */}
          {extraSpecs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {extraSpecs.map((spec, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <span className="text-primary">{spec.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{spec.label}</p>
                    <p className="text-xs text-muted-foreground">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Highlights */}
          {unit.aiHighlights && unit.aiHighlights.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Wat maakt dit type bijzonder</h4>
              <ul className="space-y-2">
                {unit.aiHighlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Living Advantage */}
          {unit.aiLivingAdvantage && (
            <div className="bg-accent/30 rounded-xl p-5">
              <p className="text-foreground italic leading-relaxed">
                "{unit.aiLivingAdvantage}"
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-primary/10 rounded-xl p-6 text-center">
            <p className="text-lg font-semibold mb-2">
              Interesse in {unit.title}?
            </p>
            <p className="text-muted-foreground mb-4">
              Vraag vrijblijvend meer informatie aan
            </p>
            <Button size="lg">
              Info aanvragen over {unit.title}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UnitConfigurator({ units, projectName, onGenerateDescriptions, isGeneratingDescriptions }: UnitConfiguratorProps) {
  const [bedroomFilter, setBedroomFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    // Trigger AI generation on-demand if no AI content exists yet
    if (!unit.aiIntro && onGenerateDescriptions) {
      onGenerateDescriptions();
    }
  };

  const bedroomOptions = useMemo(() => {
    const uniqueBedrooms = [...new Set(units.map(u => u.bedrooms))].sort((a, b) => a - b);
    return [
      { value: "all" as const, label: "Alle" },
      ...uniqueBedrooms.map(b => ({
        value: b,
        label: `${b} slaapkamer${b !== 1 ? 's' : ''}`
      }))
    ];
  }, [units]);

  const typeOptions = useMemo(() => {
    const uniqueTypes = [...new Set(units.map(u => u.type))];
    return [
      { value: "all", label: "Alle types" },
      ...uniqueTypes.map(t => ({ value: t, label: t }))
    ];
  }, [units]);

  const filteredUnits = units.filter((unit) => {
    const matchesBedrooms = bedroomFilter === "all" || unit.bedrooms === bedroomFilter;
    const matchesType = typeFilter === "all" || unit.type === typeFilter;
    return matchesBedrooms && matchesType;
  });

  return (
    <section id="units-section" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Woningen & Prijzen
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ontdek het aanbod en vind de woning die perfect bij jou past
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4 mb-10">
          <div className="flex items-center gap-2 bg-background rounded-lg p-1 shadow-sm border overflow-x-auto scrollbar-hide flex-nowrap">
            {bedroomOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBedroomFilter(option.value)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  bedroomFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-background rounded-lg p-1 shadow-sm border overflow-x-auto scrollbar-hide flex-nowrap">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTypeFilter(option.value)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  typeFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-center text-muted-foreground mb-6">
          {filteredUnits.length} woning{filteredUnits.length !== 1 ? "en" : ""} gevonden
        </p>

        {/* Units Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} onClick={() => handleSelectUnit(unit)} />
          ))}
        </div>

        {filteredUnits.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Geen woningen gevonden met de huidige filters.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setBedroomFilter("all");
                setTypeFilter("all");
              }}
            >
              Filters resetten
            </Button>
          </div>
        )}

        {/* Unit Detail Modal */}
        {selectedUnit && (
          <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} isGenerating={isGeneratingDescriptions} />
        )}
      </div>
    </section>
  );
}
