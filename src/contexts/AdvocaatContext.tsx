import React, { createContext, useContext, useState } from 'react';

interface ImpersonatedAdvocaat {
  id: string;
  name: string;
  company: string | null;
  email: string;
}

interface AdvocaatContextValue {
  isImpersonating: boolean;
  impersonatedAdvocaat: ImpersonatedAdvocaat | null;
  setImpersonatedAdvocaat: (advocaat: ImpersonatedAdvocaat | null) => void;
  exitImpersonation: () => void;
}

const AdvocaatContext = createContext<AdvocaatContextValue | undefined>(undefined);

const STORAGE_KEY = 'viva_impersonated_advocaat';

export function AdvocaatProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedAdvocaat, setImpersonatedAdvocaatState] = useState<ImpersonatedAdvocaat | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const setImpersonatedAdvocaat = (advocaat: ImpersonatedAdvocaat | null) => {
    setImpersonatedAdvocaatState(advocaat);
    if (advocaat) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(advocaat));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const exitImpersonation = () => {
    setImpersonatedAdvocaat(null);
  };

  return (
    <AdvocaatContext.Provider value={{
      isImpersonating: impersonatedAdvocaat !== null,
      impersonatedAdvocaat,
      setImpersonatedAdvocaat,
      exitImpersonation,
    }}>
      {children}
    </AdvocaatContext.Provider>
  );
}

export function useAdvocaat() {
  const context = useContext(AdvocaatContext);
  if (context === undefined) {
    throw new Error('useAdvocaat must be used within an AdvocaatProvider');
  }
  return context;
}
