import React, { createContext, useContext, useState, ReactNode } from "react";
import { JourneyPhase } from "@/hooks/useUserJourneyPhase";

interface OnboardingPreviewOptions {
  withProjectContext: boolean;
  withUserName: boolean;
}

interface AdminPhasePreviewContextType {
  // Phase preview
  isPhasePreviewMode: boolean;
  previewPhase: JourneyPhase | null;
  previewHasSale: boolean;
  setPreviewPhase: (phase: JourneyPhase | null) => void;
  setPreviewHasSale: (hasSale: boolean) => void;
  exitPhasePreview: () => void;
  
  // Onboarding preview
  isOnboardingPreview: boolean;
  onboardingPreviewOptions: OnboardingPreviewOptions;
  startOnboardingPreview: (options: OnboardingPreviewOptions) => void;
  exitOnboardingPreview: () => void;
}

const AdminPhasePreviewContext = createContext<AdminPhasePreviewContextType | undefined>(undefined);

export function AdminPhasePreviewProvider({ children }: { children: ReactNode }) {
  // Phase preview state
  const [previewPhase, setPreviewPhaseState] = useState<JourneyPhase | null>(null);
  const [previewHasSale, setPreviewHasSale] = useState(false);

  // Onboarding preview state
  const [isOnboardingPreview, setIsOnboardingPreview] = useState(false);
  const [onboardingPreviewOptions, setOnboardingPreviewOptions] = useState<OnboardingPreviewOptions>({
    withProjectContext: true,
    withUserName: true,
  });

  const isPhasePreviewMode = previewPhase !== null;

  const setPreviewPhase = (phase: JourneyPhase | null) => {
    setPreviewPhaseState(phase);
  };

  const exitPhasePreview = () => {
    setPreviewPhaseState(null);
    setPreviewHasSale(false);
  };

  const startOnboardingPreview = (options: OnboardingPreviewOptions) => {
    setOnboardingPreviewOptions(options);
    setIsOnboardingPreview(true);
  };

  const exitOnboardingPreview = () => {
    setIsOnboardingPreview(false);
  };

  return (
    <AdminPhasePreviewContext.Provider
      value={{
        isPhasePreviewMode,
        previewPhase,
        previewHasSale,
        setPreviewPhase,
        setPreviewHasSale,
        exitPhasePreview,
        isOnboardingPreview,
        onboardingPreviewOptions,
        startOnboardingPreview,
        exitOnboardingPreview,
      }}
    >
      {children}
    </AdminPhasePreviewContext.Provider>
  );
}

export function useAdminPhasePreview() {
  const context = useContext(AdminPhasePreviewContext);
  if (context === undefined) {
    throw new Error("useAdminPhasePreview must be used within an AdminPhasePreviewProvider");
  }
  return context;
}
