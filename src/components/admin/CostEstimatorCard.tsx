import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ChevronDown, ChevronUp, X, FileDown, MapPin, Calendar, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectEstimate,
  PropertyType,
  CostExtra,
  calculateTotalCosts,
  calculateEffectivePrice,
  formatCurrency,
} from "@/hooks/useCostEstimator";
import { CostEstimatorExtras } from "./CostEstimatorExtras";

interface CostEstimatorCardProps {
  estimate: ProjectEstimate;
  onUpdate: (updates: Partial<Omit<ProjectEstimate, "id" | "costs">>) => void;
  onRemove: () => void;
  onAddExtra: (extra: Omit<CostExtra, "id">) => void;
  onUpdateExtra: (extraId: string, updates: Partial<Omit<CostExtra, "id">>) => void;
  onRemoveExtra: (extraId: string) => void;
  onDownloadPdf: () => void;
}

export function CostEstimatorCard({
  estimate,
  onUpdate,
  onRemove,
  onAddExtra,
  onUpdateExtra,
  onRemoveExtra,
  onDownloadPdf,
}: CostEstimatorCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate effective price (base + non-included extras)
  const effectivePrice = calculateEffectivePrice(estimate.basePrice, estimate.extras);
  const totalCosts = calculateTotalCosts(estimate.costs);
  
  // Calculate totals for included and extra items
  const includedItems = estimate.extras.filter((e) => e.isIncluded && e.price > 0);
  const extraItems = estimate.extras.filter((e) => !e.isIncluded && e.price > 0);
  const extrasTotal = extraItems.reduce((sum, e) => sum + e.price, 0);
  
  const totalInvestment = effectivePrice + totalCosts;
  const percentageOfPrice = (totalCosts / effectivePrice) * 100;

  const CostRow = ({
    label,
    amount,
    tooltip,
  }: {
    label: string;
    amount: number;
    tooltip: string;
  }) => (
    <div className="flex justify-between items-center text-sm py-1">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <Card className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {estimate.projectImage && (
            <img
              src={estimate.projectImage}
              alt={estimate.projectName}
              className="w-16 h-16 object-cover rounded-md"
            />
          )}
          <div className="flex-1 min-w-0 pr-8">
            <CardTitle className="text-base truncate">
              {estimate.projectName}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{estimate.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={`price-${estimate.id}`} className="text-sm">
                Aankoopprijs
              </Label>
              <Input
                id={`price-${estimate.id}`}
                type="number"
                value={estimate.basePrice}
                onChange={(e) => onUpdate({ basePrice: Number(e.target.value) })}
                className="w-28 h-8 text-sm"
              />
            </div>
            <Slider
              value={[estimate.basePrice]}
              onValueChange={(value) => onUpdate({ basePrice: value[0] })}
              min={100000}
              max={1000000}
              step={5000}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={estimate.propertyType}
                onValueChange={(value) =>
                  onUpdate({ propertyType: value as PropertyType })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nieuwbouw">Nieuwbouw</SelectItem>
                  <SelectItem value="bestaand">Bestaand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {estimate.propertyType === "bestaand" && (
              <div className="space-y-1">
                <Label className="text-xs">ITP Tarief</Label>
                <Select
                  value={estimate.itpRate.toString()}
                  onValueChange={(value) => onUpdate({ itpRate: Number(value) })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7.75">7,75% (Murcia)</SelectItem>
                    <SelectItem value="10">10% (Valencia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          <div className="space-y-1">
            <Label htmlFor={`delivery-${estimate.id}`} className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Oplevertermijn
            </Label>
            <Input
              id={`delivery-${estimate.id}`}
              type="text"
              value={estimate.deliveryDate || ""}
              onChange={(e) => onUpdate({ deliveryDate: e.target.value })}
              placeholder="Bijv. Q2 2025 of Direct beschikbaar"
              className="h-8 text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor={`notes-${estimate.id}`} className="text-xs flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Eigen notities
            </Label>
            <Textarea
              id={`notes-${estimate.id}`}
              value={estimate.notes || ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Eigen opmerkingen voor deze indicatie..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>

        <Separator />

        {/* Costs Breakdown */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-semibold text-sm">Aankoopkosten</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-muted/30 p-3 rounded-lg space-y-0.5">
              <div className="flex justify-between text-sm pb-1">
                <span className="text-muted-foreground">Effectieve aankoopprijs</span>
                <span className="font-semibold">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>

              <Separator className="my-1" />

              <CostRow
                label={
                  estimate.propertyType === "nieuwbouw"
                    ? "BTW (10%)"
                    : `ITP (${estimate.itpRate}%)`
                }
                amount={estimate.costs.btwOrItp}
                tooltip={
                  estimate.propertyType === "nieuwbouw"
                    ? "BTW voor nieuwbouwwoningen in Spanje"
                    : "Overdrachtsbelasting voor bestaande woningen"
                }
              />

              <CostRow
                label="Zegelbelasting (AJD)"
                amount={estimate.costs.ajd}
                tooltip={
                  estimate.propertyType === "nieuwbouw"
                    ? "1,5% zegelbelasting voor nieuwbouw"
                    : "Geen zegelbelasting bij bestaande bouw"
                }
              />

              <CostRow
                label="Advocaatkosten"
                amount={estimate.costs.advocaat}
                tooltip="1% + 21% BTW"
              />

              <CostRow
                label="Notariskosten"
                amount={estimate.costs.notaris}
                tooltip="Vaste kosten voor notariële afhandeling"
              />

              <CostRow
                label="Registratiekantoor"
                amount={estimate.costs.registratie}
                tooltip="Kadasterregistratie"
              />

              <CostRow
                label="Volmacht"
                amount={estimate.costs.volmacht}
                tooltip="Optioneel, als je niet aanwezig kunt zijn"
              />

              <CostRow
                label="Nutsaansluitingen"
                amount={estimate.costs.nutsvoorzieningen}
                tooltip="Elektriciteit, water, gas"
              />

              <CostRow
                label="Bankkosten"
                amount={estimate.costs.bankkosten}
                tooltip="Spaanse bankrekening openen"
              />

              <CostRow
                label="Administratie"
                amount={estimate.costs.administratie}
                tooltip="Algemene administratiekosten"
              />

              <CostRow
                label="NIE-nummer"
                amount={estimate.costs.nie}
                tooltip="Belastingnummer voor buitenlanders"
              />

              <Separator className="my-1" />

              <div className="flex justify-between pt-1">
                <div>
                  <div className="font-medium text-sm">Bijkomende kosten</div>
                  <div className="text-xs text-muted-foreground">
                    {percentageOfPrice.toFixed(1)}% van aankoopprijs
                  </div>
                </div>
                <span className="font-bold text-primary">
                  {formatCurrency(totalCosts)}
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Extras */}
        <CostEstimatorExtras
          extras={estimate.extras}
          onAddExtra={onAddExtra}
          onUpdateExtra={onUpdateExtra}
          onRemoveExtra={onRemoveExtra}
        />

        <Separator />

        {/* Totals */}
        <div className="bg-primary/5 p-3 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Aankoopprijs</span>
            <span className="font-medium">{formatCurrency(estimate.basePrice)}</span>
          </div>

          {extrasTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span>Extra's & Meerwerk</span>
              <span className="font-medium">+ {formatCurrency(extrasTotal)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span>Effectieve aankoopprijs</span>
            <span className="font-medium">{formatCurrency(effectivePrice)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Bijkomende kosten ({percentageOfPrice.toFixed(1)}%)</span>
            <span className="font-medium">+ {formatCurrency(totalCosts)}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="font-bold">Totale Investering</span>
            <span className="font-bold text-lg text-primary">
              {formatCurrency(totalInvestment)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <Button onClick={onDownloadPdf} className="w-full" variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </CardContent>
    </Card>
  );
}
