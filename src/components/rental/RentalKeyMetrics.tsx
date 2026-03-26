import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, TrendingUp, Calendar, MapPin, Home, Phone, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RentalSeasonalChart } from "./RentalSeasonalChart";
import { ComparablesMap } from "../ComparablesMap";
import { RentalComparablesTable } from "./RentalComparablesTable";

interface RentalKeyMetricsProps {
  monthlyRevenue: number;
  annualRevenue: number;
  occupancy: number;
  averageDailyRate: number;
  currency: string;
  monthlyDistributions: number[];
  comparables: any[];
  centerLat: number;
  centerLng: number;
}

export function RentalKeyMetrics({
  monthlyRevenue,
  annualRevenue,
  occupancy,
  averageDailyRate,
  currency,
  monthlyDistributions,
  comparables,
  centerLat,
  centerLng,
}: RentalKeyMetricsProps) {
  const currencySymbol = currency === 'EUR' ? '€' : currency;

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Maandelijkse Opbrengst</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {currencySymbol}{monthlyRevenue?.toLocaleString() ?? '0'}
          </p>
          <p className="text-xs text-muted-foreground">
            {currencySymbol}{annualRevenue?.toLocaleString() ?? '0'} per jaar
          </p>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-6 border border-accent/40">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Bezettingsgraad</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {occupancy ?? 0}%
          </p>
          <p className="text-xs text-muted-foreground">
            ~{Math.round(365 * (occupancy ?? 0) / 100)} dagen per jaar
          </p>
        </div>

        {/* Average Daily Rate */}
        <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl p-6 border border-secondary/40">
          <div className="flex items-center gap-2 mb-3">
            <Euro className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Gemiddelde Nachtprijs</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {currencySymbol}{averageDailyRate ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            per nacht
          </p>
        </div>
      </div>

      {/* Detailed Analysis Accordion */}
      <Accordion type="single" collapsible className="space-y-4">
        {/* Seasonal Distribution */}
        <AccordionItem value="seasonal" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Seizoensverdeling Opbrengsten</p>
                <p className="text-sm text-muted-foreground">Maandelijkse analyse van verhuurinkomsten</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <RentalSeasonalChart
              monthlyDistributions={monthlyDistributions}
              annualRevenue={annualRevenue}
              currency={currency}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Location Comparison */}
        <AccordionItem value="location" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Locatievergelijking</p>
                <p className="text-sm text-muted-foreground">Interactieve kaart met vergelijkbare woningen</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <ComparablesMap
              comparables={comparables}
              centerLat={centerLat}
              centerLng={centerLng}
              currency={currency}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Comparable Properties */}
        <AccordionItem value="comparables" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Vergelijkbare Woningen</p>
                <p className="text-sm text-muted-foreground">Tabel met prestaties van {comparables.length} accommodaties</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <RentalComparablesTable
              comparables={comparables}
              currency={currency}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Calculation Method */}
        <AccordionItem value="calculation" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Hoe zijn deze cijfers berekend?</p>
                <p className="text-sm text-muted-foreground">Transparantie over onze berekeningsmethode</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Onze verhuurschattingen zijn gebaseerd op actuele marktdata van vergelijkbare accommodaties 
                in de regio. We analyseren woningen binnen een straal van 5 km met dezelfde kenmerken 
                (aantal slaapkamers, badkamers, type accommodatie).
              </p>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">De berekening omvat:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Gemiddelde bezettingsgraden per maand</li>
                  <li>Marktconforme prijzen per nacht</li>
                  <li>Seizoensverschillen en lokale vraagpatronen</li>
                  <li>Prestaties van actieve verhuurwoningen in de omgeving</li>
                </ul>
              </div>
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mt-4">
                <p className="text-sm text-foreground">
                  <strong>Let op:</strong> Dit zijn schattingen op basis van marktdata. 
                  Werkelijke opbrengsten kunnen variëren afhankelijk van factoren zoals 
                  seizoen, marketing, beheer, onderhoud en lokale marktomstandigheden.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Call to Action Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Wil je meer weten over verhuurpotentieel?</h3>
              <p className="text-muted-foreground">
                Plan een gratis oriëntatiegesprek met onze verhuurspecialist
              </p>
            </div>
            <Button size="lg" variant="default" className="gap-2">
              <Calendar className="w-4 h-4" />
              Plan Verhuur Oriëntatiegesprek
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
