import { useState, useCallback, useMemo } from "react";

export type PropertyType = "nieuwbouw" | "bestaand";

export interface CostExtra {
  id: string;
  name: string;
  price: number;
  isIncluded: boolean; // true = already included in price, no extra cost
  viaDeveloper: boolean; // true = 10% BTW, false = 21% BTW
  notes?: string;
}

export interface CostBreakdown {
  btwOrItp: number;
  ajd: number;
  advocaat: number;
  notaris: number;
  registratie: number;
  volmacht: number;
  nutsvoorzieningen: number;
  bankkosten: number;
  administratie: number;
  nie: number;
}

export interface ProjectEstimate {
  id: string;
  projectId: string;
  projectName: string;
  projectImage: string | null;
  location: string;
  city?: string;
  basePrice: number;
  propertyType: PropertyType;
  itpRate: number;
  extras: CostExtra[];
  costs: CostBreakdown;
  deliveryDate?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

// Standard extras that are always visible (5 fixed items)
export const STANDARD_EXTRAS: { name: string; key: string }[] = [
  { name: "Lichtspots", key: "lichtspots" },
  { name: "Witgoed", key: "witgoed" },
  { name: "Airco", key: "airco" },
  { name: "Meubels", key: "meubels" },
];

// Calculate effective price (base price + non-included extras with amounts)
export function calculateEffectivePrice(basePrice: number, extras: CostExtra[]): number {
  const extrasTotal = extras
    .filter((e) => !e.isIncluded && e.price > 0)
    .reduce((sum, e) => sum + e.price, 0);
  return basePrice + extrasTotal;
}

export function calculateCosts(
  basePrice: number,
  propertyType: PropertyType,
  itpRate: number
): CostBreakdown {
  let btwOrItp = 0;
  let ajd = 0;
  let nutsvoorzieningen = 0;

  if (propertyType === "nieuwbouw") {
    btwOrItp = basePrice * 0.10; // 10% BTW
    ajd = basePrice * 0.015; // 1.5% AJD
    nutsvoorzieningen = 300;
  } else {
    btwOrItp = basePrice * (itpRate / 100); // ITP variable
    ajd = 0; // No AJD for bestaande bouw
    nutsvoorzieningen = 150;
  }

  // Calculate advocaat costs: 1% + 21% BTW
  const advocaatBase = basePrice * 0.01;
  const advocaat = advocaatBase * 1.21;

  return {
    btwOrItp,
    ajd,
    advocaat,
    notaris: 2000,
    registratie: 800,
    volmacht: 700,
    nutsvoorzieningen,
    bankkosten: 200,
    administratie: 250,
    nie: 20,
  };
}

export function calculateTotalCosts(costs: CostBreakdown): number {
  return Object.values(costs).reduce((sum, cost) => sum + cost, 0);
}

export function calculateExtrasCost(extras: CostExtra[]): {
  totalExcludingVat: number;
  totalVat: number;
  totalStampDuty: number;
  total: number;
  includedItems: CostExtra[];
  extraItems: CostExtra[];
} {
  const includedItems = extras.filter((e) => e.isIncluded);
  const extraItems = extras.filter((e) => !e.isIncluded && e.price > 0);

  let totalExcludingVat = 0;
  let totalVat = 0;
  let totalStampDuty = 0;

  extraItems.forEach((extra) => {
    totalExcludingVat += extra.price;
    const vatRate = extra.viaDeveloper ? 0.10 : 0.21;
    totalVat += extra.price * vatRate;
    if (extra.viaDeveloper) {
      totalStampDuty += extra.price * 0.015; // 1.5% zegelbelasting (AJD)
    }
  });

  return {
    totalExcludingVat,
    totalVat,
    totalStampDuty,
    total: totalExcludingVat + totalVat + totalStampDuty,
    includedItems,
    extraItems,
  };
}

export function useCostEstimator() {
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState<string | null>(null);

  const addEstimate = useCallback(
    (project: {
      id: string;
      name: string;
      featured_image: string | null;
      location: string;
      city?: string | null;
      price_from: number | null;
      property_type?: string;
      latitude?: number | null;
      longitude?: number | null;
      completion_date?: string | null;
    }) => {
      const propertyType: PropertyType =
        project.property_type === "bestaand" ? "bestaand" : "nieuwbouw";
      const basePrice = project.price_from || 250000;
      const itpRate = 7.75;
      const costs = calculateCosts(basePrice, propertyType, itpRate);

      // Format completion date if available
      let formattedDeliveryDate: string | undefined;
      if (project.completion_date) {
        const date = new Date(project.completion_date);
        formattedDeliveryDate = date.toLocaleDateString("nl-NL", { 
          month: "long", 
          year: "numeric" 
        });
      }

      const newEstimate: ProjectEstimate = {
        id: crypto.randomUUID(),
        projectId: project.id,
        projectName: project.name,
        projectImage: project.featured_image,
        location: project.location,
        city: project.city ?? undefined,
        basePrice,
        propertyType,
        itpRate,
        extras: [],
        costs,
        deliveryDate: formattedDeliveryDate,
        latitude: project.latitude ?? undefined,
        longitude: project.longitude ?? undefined,
      };

      setEstimates((prev) => [...prev, newEstimate]);
      return newEstimate.id;
    },
    []
  );

  const updateEstimate = useCallback(
    (estimateId: string, updates: Partial<Omit<ProjectEstimate, "id" | "costs">>) => {
      setEstimates((prev) =>
        prev.map((est) => {
          if (est.id !== estimateId) return est;

          const updated = { ...est, ...updates };

          // Recalculate effective price and costs
          const effectivePrice = calculateEffectivePrice(
            updated.basePrice,
            updated.extras
          );

          // Recalculate costs based on effective price
          updated.costs = calculateCosts(
            effectivePrice,
            updated.propertyType,
            updated.itpRate
          );

          return updated;
        })
      );
    },
    []
  );

  const removeEstimate = useCallback((estimateId: string) => {
    setEstimates((prev) => prev.filter((est) => est.id !== estimateId));
  }, []);

  const addExtra = useCallback(
    (estimateId: string, extra: Omit<CostExtra, "id">) => {
      setEstimates((prev) =>
        prev.map((est) => {
          if (est.id !== estimateId) return est;
          
          const newExtras = [...est.extras, { ...extra, id: crypto.randomUUID() }];
          const effectivePrice = calculateEffectivePrice(est.basePrice, newExtras);
          
          return {
            ...est,
            extras: newExtras,
            costs: calculateCosts(effectivePrice, est.propertyType, est.itpRate),
          };
        })
      );
    },
    []
  );

  const updateExtra = useCallback(
    (estimateId: string, extraId: string, updates: Partial<Omit<CostExtra, "id">>) => {
      setEstimates((prev) =>
        prev.map((est) => {
          if (est.id !== estimateId) return est;
          
          const newExtras = est.extras.map((e) =>
            e.id === extraId ? { ...e, ...updates } : e
          );
          const effectivePrice = calculateEffectivePrice(est.basePrice, newExtras);
          
          return {
            ...est,
            extras: newExtras,
            costs: calculateCosts(effectivePrice, est.propertyType, est.itpRate),
          };
        })
      );
    },
    []
  );

  const removeExtra = useCallback((estimateId: string, extraId: string) => {
    setEstimates((prev) =>
      prev.map((est) => {
        if (est.id !== estimateId) return est;
        
        const newExtras = est.extras.filter((e) => e.id !== extraId);
        const effectivePrice = calculateEffectivePrice(est.basePrice, newExtras);
        
        return {
          ...est,
          extras: newExtras,
          costs: calculateCosts(effectivePrice, est.propertyType, est.itpRate),
        };
      })
    );
  }, []);

  const clearAll = useCallback(() => {
    setEstimates([]);
  }, []);

  const reorderEstimates = useCallback((fromIndex: number, toIndex: number) => {
    setEstimates((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  // Load saved estimates from database into active state
  const loadSavedEstimates = useCallback(
    (savedEstimates: Array<{
      id: string;
      name: string;
      project_id: string | null;
      project_name: string;
      project_image: string | null;
      location: string | null;
      base_price: number;
      property_type: string;
      itp_rate: number | null;
      extras: CostExtra[];
      costs: CostBreakdown;
      delivery_date: string | null;
      notes: string | null;
      latitude: number | null;
      longitude: number | null;
    }>) => {
      const converted = savedEstimates.map((saved): ProjectEstimate => ({
        id: saved.id,
        projectId: saved.project_id || "",
        projectName: saved.project_name,
        projectImage: saved.project_image,
        location: saved.location || "Spanje",
        basePrice: saved.base_price,
        propertyType: (saved.property_type === "bestaand" ? "bestaand" : "nieuwbouw") as PropertyType,
        itpRate: saved.itp_rate || 7.75,
        extras: saved.extras || [],
        costs: saved.costs,
        deliveryDate: saved.delivery_date || undefined,
        notes: saved.notes || undefined,
        latitude: saved.latitude ?? undefined,
        longitude: saved.longitude ?? undefined,
      }));
      setEstimates(converted);
      if (savedEstimates.length > 0) {
        setEditingScenarioId(savedEstimates[0].id);
        setEditingScenarioName(savedEstimates[0].name);
      }
    },
    []
  );

  const cancelEditing = useCallback(() => {
    setEditingScenarioId(null);
    setEditingScenarioName(null);
    setEstimates([]);
  }, []);

  const clearEditingState = useCallback(() => {
    setEditingScenarioId(null);
    setEditingScenarioName(null);
  }, []);

  return {
    estimates,
    addEstimate,
    updateEstimate,
    removeEstimate,
    addExtra,
    updateExtra,
    removeExtra,
    clearAll,
    reorderEstimates,
    loadSavedEstimates,
    editingScenarioId,
    editingScenarioName,
    cancelEditing,
    clearEditingState,
  };
}

// Re-export formatCurrency from central utils
export { formatCurrency } from "@/lib/utils";
