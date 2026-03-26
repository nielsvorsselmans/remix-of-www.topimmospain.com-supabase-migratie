import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Euro, Plus, Trash2, CalendarDays, ArrowRightLeft } from "lucide-react";

export interface PaymentInstallment {
  id: string;
  label: string;
  mode: "percentage" | "fixed";
  value: number;
  vatIncluded: boolean;
  dueDate: string;
}

export interface PaymentPlan {
  expectedDelivery: string;
  reservationAmount: number;
  reservationDate: string;
  installments: PaymentInstallment[];
}

interface PaymentPlanSectionProps {
  paymentPlan: PaymentPlan;
  basePrice: number;
  totalCosts: number;
  extrasTotal: number;
  btwOrItp: number;
  onChange: (plan: PaymentPlan) => void;
}

function getInstallmentNetAmount(inst: PaymentInstallment, basePrice: number): number {
  if (inst.mode === "percentage") {
    const raw = basePrice * (inst.value / 100);
    return inst.vatIncluded ? raw / 1.10 : raw;
  }
  return inst.vatIncluded ? inst.value / 1.10 : inst.value;
}

function getInstallmentGrossAmount(inst: PaymentInstallment, basePrice: number): number {
  const net = getInstallmentNetAmount(inst, basePrice);
  return net * 1.10;
}

function getDisplayPercentage(inst: PaymentInstallment, basePrice: number): number {
  if (inst.mode === "percentage") return inst.value;
  if (basePrice <= 0) return 0;
  const net = getInstallmentNetAmount(inst, basePrice);
  return Math.round((net / basePrice) * 10000) / 100;
}

export function PaymentPlanSection({
  paymentPlan,
  basePrice,
  totalCosts,
  extrasTotal,
  btwOrItp,
  onChange,
}: PaymentPlanSectionProps) {
  const update = useCallback(
    (updates: Partial<PaymentPlan>) => {
      onChange({ ...paymentPlan, ...updates });
    },
    [paymentPlan, onChange]
  );

  const addInstallment = useCallback(() => {
    if (paymentPlan.installments.length >= 3) return;
    const num = paymentPlan.installments.length + 1;
    update({
      installments: [
        ...paymentPlan.installments,
        {
          id: crypto.randomUUID(),
          label: `${num}e schijf`,
          mode: "percentage",
          value: 20,
          vatIncluded: false,
          dueDate: "",
        },
      ],
    });
  }, [paymentPlan, update]);

  const updateInstallment = useCallback(
    (id: string, updates: Partial<PaymentInstallment>) => {
      update({
        installments: paymentPlan.installments.map((i) =>
          i.id === id ? { ...i, ...updates } : i
        ),
      });
    },
    [paymentPlan, update]
  );

  const removeInstallment = useCallback(
    (id: string) => {
      update({
        installments: paymentPlan.installments.filter((i) => i.id !== id),
      });
    },
    [paymentPlan, update]
  );

  // Calculate totals
  const totalInstallmentsNet = paymentPlan.installments.reduce(
    (sum, inst) => sum + getInstallmentNetAmount(inst, basePrice),
    0
  );

  const reservationNet = paymentPlan.reservationAmount / 1.10;
  const remainingBase = Math.max(0, basePrice - reservationNet - totalInstallmentsNet);
  const remainingBtw = remainingBase * 0.10;
  const purchaseCosts = totalCosts - btwOrItp;
  const closingTotal = remainingBase + remainingBtw + purchaseCosts + extrasTotal;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Betaalplan
        </p>
      </div>

      {/* Base price reference */}
      <div className="flex justify-between items-center px-2 py-1.5 rounded bg-muted/50">
        <span className="text-xs text-muted-foreground">Aankoopprijs (basis)</span>
        <span className="text-xs font-semibold">{formatCurrency(basePrice)}</span>
      </div>

      {/* Expected delivery */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Verwachte oplevering</label>
        <Input
          value={paymentPlan.expectedDelivery}
          onChange={(e) => update({ expectedDelivery: e.target.value })}
          placeholder="bv. Q3 2027"
          className="h-8 text-sm"
        />
      </div>

      {/* Timeline items */}
      <div className="space-y-2">
        {/* ① Reservation */}
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
              1
            </span>
            <div className="flex-1 w-px bg-border mt-1" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Reservatie <span className="text-[10px] text-muted-foreground/70">(incl. BTW)</span></span>
            <div className="relative">
              <Euro className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                value={paymentPlan.reservationAmount || ""}
                onChange={(e) => update({ reservationAmount: Number(e.target.value) || 0 })}
                className="pl-7 h-8 text-sm"
                placeholder="10000"
              />
            </div>
            <Input
              type="date"
              value={paymentPlan.reservationDate || ""}
              onChange={(e) => update({ reservationDate: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* ② Installments */}
        {paymentPlan.installments.map((inst, idx) => {
          const gross = getInstallmentGrossAmount(inst, basePrice);
          const pct = getDisplayPercentage(inst, basePrice);

          return (
            <div key={inst.id} className="relative pl-6">
              <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                  {idx + 2}
                </span>
                <div className="flex-1 w-px bg-border mt-1" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{inst.label}</span>
                  <button
                    onClick={() => removeInstallment(inst.id)}
                    className="text-destructive/60 hover:text-destructive p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Mode toggle */}
                  <button
                    onClick={() =>
                      updateInstallment(inst.id, {
                        mode: inst.mode === "percentage" ? "fixed" : "percentage",
                        value: inst.mode === "percentage"
                          ? Math.round(getInstallmentNetAmount(inst, basePrice))
                          : Math.round((inst.value / basePrice) * 100),
                      })
                    }
                    className="flex items-center justify-center w-8 h-8 rounded-md border bg-background hover:bg-accent text-xs font-medium shrink-0"
                    title="Wissel tussen % en €"
                  >
                    {inst.mode === "percentage" ? "%" : "€"}
                  </button>
                  <Input
                    type="number"
                    value={inst.value || ""}
                    onChange={(e) =>
                      updateInstallment(inst.id, { value: Number(e.target.value) || 0 })
                    }
                    className="h-8 text-sm flex-1"
                  />
                  <button
                    onClick={() => updateInstallment(inst.id, { vatIncluded: !inst.vatIncluded })}
                    className={`text-[10px] px-1.5 py-1 rounded border shrink-0 transition-colors ${
                      inst.vatIncluded
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-background text-muted-foreground border-input"
                    }`}
                  >
                    {inst.vatIncluded ? "incl." : "excl."} BTW
                  </button>
                </div>
                <Input
                  type="date"
                  value={inst.dueDate || ""}
                  onChange={(e) => updateInstallment(inst.id, { dueDate: e.target.value })}
                  className="h-7 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  → {formatCurrency(gross)} incl. BTW
                  {inst.mode === "fixed" && ` (${pct}%)`}
                  {inst.mode === "percentage" && ` (${formatCurrency(getInstallmentNetAmount(inst, basePrice))} netto)`}
                </p>
              </div>
            </div>
          );
        })}

        {/* Add installment button */}
        {paymentPlan.installments.length < 3 && (
          <button
            onClick={addInstallment}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 pl-6 py-1"
          >
            <Plus className="h-3 w-3" />
            Schijf toevoegen
          </button>
        )}

        {/* ③ Closing balance */}
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 flex flex-col items-center">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold shrink-0">
              {paymentPlan.installments.length + 2}
            </span>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Restbedrag bij akte</span>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Aankoopprijs rest</span>
                <span>{formatCurrency(remainingBase)}</span>
              </div>
              <div className="flex justify-between">
                <span>BTW restbedrag (10%)</span>
                <span>{formatCurrency(remainingBtw)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Aankoopkosten</span>
                <span>{formatCurrency(purchaseCosts)}</span>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between">
                  <span>+ Extra's</span>
                  <span>{formatCurrency(extrasTotal)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-1 border-t border-dashed text-sm font-semibold">
              <span>Totaal bij akte</span>
              <span className="text-primary">{formatCurrency(closingTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
