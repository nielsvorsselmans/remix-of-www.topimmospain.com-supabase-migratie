import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCustomerSales, CustomerSaleSummary } from "@/hooks/useCustomerSales";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";

const STORAGE_KEY = 'viva-active-sale-id';

interface ActiveSaleContextType {
  activeSaleId: string | null;
  setActiveSaleId: (id: string) => void;
  sales: CustomerSaleSummary[];
  isLoading: boolean;
  hasMultipleSales: boolean;
}

export const ActiveSaleContext = createContext<ActiveSaleContextType | undefined>(undefined);

// Helper to get stored sale ID for a specific customer
function getStoredSaleId(crmLeadId: string | null): string | null {
  if (!crmLeadId) return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.crmLeadId === crmLeadId) {
        return parsed.saleId;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper to store sale ID for a specific customer
function storeSaleId(crmLeadId: string | null, saleId: string | null) {
  if (!crmLeadId || !saleId) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ crmLeadId, saleId }));
  } catch {
    // Ignore storage errors
  }
}

export function ActiveSaleProvider({ children }: { children: ReactNode }) {
  const { crmLeadId, isLoading: customerLoading } = useEffectiveCustomer();
  const { data: sales, isLoading: salesLoading } = useCustomerSales();
  
  // Initialize from sessionStorage if available
  const [activeSaleId, setActiveSaleIdState] = useState<string | null>(() => 
    getStoredSaleId(crmLeadId)
  );
  const [lastCrmLeadId, setLastCrmLeadId] = useState<string | null>(crmLeadId);

  // Wrapper to also persist to sessionStorage
  const setActiveSaleId = (id: string) => {
    setActiveSaleIdState(id);
    storeSaleId(crmLeadId, id);
  };

  // Handle customer changes - only reset if customer actually changed
  useEffect(() => {
    if (crmLeadId !== lastCrmLeadId) {
      setLastCrmLeadId(crmLeadId);
      
      // Try to restore from storage for this customer
      const stored = getStoredSaleId(crmLeadId);
      if (stored) {
        setActiveSaleIdState(stored);
      } else {
        setActiveSaleIdState(null);
      }
    }
  }, [crmLeadId, lastCrmLeadId]);

  // Auto-select first sale when sales load and no selection exists
  useEffect(() => {
    if (salesLoading || customerLoading) return;
    
    if (sales?.length && !activeSaleId) {
      // Check if stored ID is valid for current sales
      const stored = getStoredSaleId(crmLeadId);
      if (stored && sales.find(s => s.id === stored)) {
        setActiveSaleIdState(stored);
      } else {
        // Select first sale
        setActiveSaleId(sales[0].id);
      }
    } else if (activeSaleId && sales?.length && !sales.find(s => s.id === activeSaleId)) {
      // Current selection is invalid, select first
      setActiveSaleId(sales[0].id);
    }
  }, [sales, salesLoading, customerLoading, activeSaleId, crmLeadId]);

  // Optimized loading: only true during initial load, not when data is cached
  const isLoading = (salesLoading && !sales?.length) || 
                    (customerLoading && !crmLeadId) ||
                    (!!sales?.length && !activeSaleId);

  return (
    <ActiveSaleContext.Provider
      value={{
        activeSaleId,
        setActiveSaleId,
        sales: sales || [],
        isLoading,
        hasMultipleSales: (sales?.length || 0) > 1,
      }}
    >
      {children}
    </ActiveSaleContext.Provider>
  );
}

export function useActiveSale() {
  const context = useContext(ActiveSaleContext);
  if (context === undefined) {
    throw new Error("useActiveSale must be used within an ActiveSaleProvider");
  }
  return context;
}

// Optional version that returns defaults when not in provider
export function useOptionalActiveSale() {
  const context = useContext(ActiveSaleContext);
  if (!context) {
    return { activeSaleId: null, isLoading: false, sales: [], hasMultipleSales: false, setActiveSaleId: () => {} };
  }
  return context;
}
