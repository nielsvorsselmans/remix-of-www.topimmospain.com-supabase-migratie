import React, { createContext, useContext, useState } from 'react';

interface Partner {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  slug: string;
  referral_code: string;
  landing_page_title: string | null;
  landing_page_intro: string | null;
}

interface PartnerContextValue {
  currentPartner: Partner | null;
  setCurrentPartner: (partner: Partner | null) => void;
  clearPartner: () => void;
  // Impersonation for admins
  isImpersonating: boolean;
  impersonatedPartner: Partner | null;
  setImpersonatedPartner: (partner: Partner | null) => void;
  exitImpersonation: () => void;
}

const PartnerContext = createContext<PartnerContextValue | undefined>(undefined);

const PARTNER_STORAGE_KEY = 'viva_current_partner';
const IMPERSONATION_STORAGE_KEY = 'viva_impersonated_partner';

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [currentPartner, setCurrentPartnerState] = useState<Partner | null>(() => {
    const stored = localStorage.getItem(PARTNER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const [impersonatedPartner, setImpersonatedPartnerState] = useState<Partner | null>(() => {
    const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const setCurrentPartner = (partner: Partner | null) => {
    setCurrentPartnerState(partner);
    if (partner) {
      localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partner));
    } else {
      localStorage.removeItem(PARTNER_STORAGE_KEY);
    }
  };

  const clearPartner = () => {
    setCurrentPartner(null);
  };

  const setImpersonatedPartner = (partner: Partner | null) => {
    setImpersonatedPartnerState(partner);
    if (partner) {
      localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(partner));
    } else {
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
  };

  const exitImpersonation = () => {
    setImpersonatedPartner(null);
  };

  const isImpersonating = impersonatedPartner !== null;

  return (
    <PartnerContext.Provider value={{ 
      currentPartner, 
      setCurrentPartner, 
      clearPartner,
      isImpersonating,
      impersonatedPartner,
      setImpersonatedPartner,
      exitImpersonation,
    }}>
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  const context = useContext(PartnerContext);
  if (context === undefined) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return context;
}