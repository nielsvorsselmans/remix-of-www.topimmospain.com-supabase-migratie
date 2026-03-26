import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useDebounce } from "@/hooks/useDebounce";
import {
  calculateCosts,
  calculateTotalCosts,
  calculateExtrasCost,
  STANDARD_EXTRAS,
  type PropertyType,
  type CostExtra,
  type CostBreakdown,
} from "@/hooks/useCostEstimator";
import { formatCurrency } from "@/lib/utils";
import { Euro } from "lucide-react";
import { type PaymentPlan } from "./PaymentPlanSection";

export interface CostIndicationData {
  basePrice: number;
  propertyType: PropertyType;
  itpRate: number;
  extras: CostExtra[];
  costs: CostBreakdown;
  paymentPlan?: PaymentPlan;
}

interface CompanionCostIndicationProps {
  initialData: CostIndicationData | null;
  defaultPrice?: number;
  defaultPropertyType?: PropertyType;
  onSave: (data: CostIndicationData) => void;
}

function createDefaultData(price: number, propertyType: PropertyType): CostIndicationData {
  const itpRate = 7.75;
  const costs = calculateCosts(price, propertyType, itpRate);
  return {
    basePrice: price,
    propertyType,
    itpRate,
    extras: STANDARD_EXTRAS.map((e) => ({
      id: e.key,
      name: e.name,
      price: 0,
      isIncluded: false,
      viaDeveloper: true,
    })),
    costs,
    paymentPlan: {
      expectedDelivery: "",
      reservationAmount: 10000,
      reservationDate: "",
      installments: [],
    },
  };
}

export function CompanionCostIndication({
  initialData,
  defaultPrice = 250000,
  defaultPropertyType = "nieuwbouw",
  onSave,
}: CompanionCostIndicationProps) {
  const [data, setData] = useState<CostIndicationData>(
    () => initialData || createDefaultData(defaultPrice, defaultPropertyType)
  );

  // Sync if initialData changes from server
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const debouncedData = useDebounce(data, 1500);

  useEffect(() => {
    onSave(debouncedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedData]);

  const recalc = useCallback((updates: Partial<CostIndicationData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      next.costs = calculateCosts(next.basePrice, next.propertyType, next.itpRate);
      return next;
    });
  }, []);

  const updateExtra = useCallback((extraId: string, updates: Partial<CostExtra>) => {
    setData((prev) => {
      const newExtras = prev.extras.map((e) =>
        e.id === extraId ? { ...e, ...updates } : e
      );
      return {
        ...prev,
        extras: newExtras,
        costs: calculateCosts(prev.basePrice, prev.propertyType, prev.itpRate),
      };
    });
  }, []);

  const totalCosts = calculateTotalCosts(data.costs);
  const extrasCalc = calculateExtrasCost(data.extras);
  const totalInvestment = data.basePrice + totalCosts + extrasCalc.total;

  return (
    <div className="space-y-4">
      {/* Base price & type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Aankoopprijs</label>
          <div className="relative">
            <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={data.basePrice || ""}
              onChange={(e) => recalc({ basePrice: Number(e.target.value) || 0 })}
              className="pl-8 text-base"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <div className="flex gap-1 mt-1">
            {(["nieuwbouw", "bestaand"] as PropertyType[]).map((type) => (
              <button
                key={type}
                onClick={() => recalc({ propertyType: type })}
                className={`flex-1 text-xs py-2 px-2 rounded-md border transition-colors ${
                  data.propertyType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-input hover:bg-accent"
                }`}
              >
                {type === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ITP rate for bestaand */}
      {data.propertyType === "bestaand" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">ITP tarief (%)</label>
          <Input
            type="number"
            step="0.25"
            value={data.itpRate}
            onChange={(e) => recalc({ itpRate: Number(e.target.value) || 7.75 })}
            className="w-24 text-base"
          />
        </div>
      )}

      {/* Extras */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Extra's & inbegrepen items
        </p>
        <div className="space-y-1.5">
          {data.extras.map((extra) => (
            <div
              key={extra.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-md border bg-muted/20"
            >
              <span className="text-sm flex-1 min-w-0 truncate">{extra.name}</span>

              {!extra.isIncluded && (
                <Input
                  type="number"
                  value={extra.price || ""}
                  onChange={(e) =>
                    updateExtra(extra.id, { price: Number(e.target.value) || 0 })
                  }
                  placeholder="Prijs"
                  className="w-24 h-7 text-xs px-1.5"
                />
              )}
              {extra.isIncluded && (
                <span className="text-[10px] text-green-700 font-medium shrink-0">
                  Inbegrepen
                </span>
              )}

              <Switch
                checked={extra.isIncluded}
                onCheckedChange={(checked) => updateExtra(extra.id, { isIncluded: checked })}
                className="shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cost summary - 3 blocks */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Overzicht
        </p>

        {/* Block 1: Restbedrag */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Aankoopprijs</span>
            <span>{formatCurrency(data.basePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {data.propertyType === "nieuwbouw" ? "BTW (10%)" : `ITP (${data.itpRate}%)`}
            </span>
            <span>{formatCurrency(data.costs.btwOrItp)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-dashed">
            <span>Restbedrag</span>
            <span>{formatCurrency(data.basePrice + data.costs.btwOrItp)}</span>
          </div>
        </div>

        {/* Block 2: Aankoopkosten */}
        <div className="space-y-1 text-sm">
          {data.propertyType === "nieuwbouw" && data.costs.ajd > 0 && (
            <div className="flex justify-between">
              <span>Zegelbelasting (1,5%)</span>
              <span>{formatCurrency(data.costs.ajd)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Juridisch & administratie</span>
            <span>
              {formatCurrency(
                data.costs.advocaat +
                  data.costs.notaris +
                  data.costs.registratie +
                  data.costs.volmacht +
                  data.costs.nutsvoorzieningen +
                  data.costs.bankkosten +
                  data.costs.administratie +
                  data.costs.nie
              )}
            </span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-dashed">
            <span>Aankoopkosten</span>
            <span>
              {formatCurrency(
                data.costs.ajd +
                  data.costs.advocaat +
                  data.costs.notaris +
                  data.costs.registratie +
                  data.costs.volmacht +
                  data.costs.nutsvoorzieningen +
                  data.costs.bankkosten +
                  data.costs.administratie +
                  data.costs.nie
              )}
            </span>
          </div>
        </div>

        {/* Block 3: Extra's via ontwikkelaar */}
        {(extrasCalc.extraItems.length > 0 || extrasCalc.includedItems.length > 0) && (
          <div className="space-y-1 text-sm">
            {extrasCalc.extraItems.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Extra's (netto)</span>
                  <span>{formatCurrency(extrasCalc.totalExcludingVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BTW extra's (10%)</span>
                  <span>{formatCurrency(extrasCalc.totalVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Zegelbelasting extra's (1,5%)</span>
                  <span>{formatCurrency(extrasCalc.totalStampDuty)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-dashed">
                  <span>Totaal extra's</span>
                  <span>{formatCurrency(extrasCalc.total)}</span>
                </div>
              </>
            )}
            {extrasCalc.includedItems.length > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Inbegrepen ({extrasCalc.includedItems.length})</span>
                <span>✓</span>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between pt-2 border-t-2 border-foreground/20 font-semibold text-base">
          <span>Totale investering</span>
          <span className="text-primary">{formatCurrency(totalInvestment)}</span>
        </div>
      </div>

    </div>
  );
}
