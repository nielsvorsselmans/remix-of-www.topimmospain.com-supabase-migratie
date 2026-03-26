import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OTPLoginForm } from "@/components/auth/OTPLoginForm";
import { Check } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

interface ProjectContext {
  id: string;
  name: string;
  city?: string;
  image?: string;
}

interface SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  // Optional explicit redirect URL
  redirectUrl?: string;
  // Project context for onboarding
  projectContext?: ProjectContext;
}

const benefits = [
  "Gratis en vrijblijvend",
  "Volledige projectanalyses",
  "Persoonlijke begeleiding"
];

export function SignupDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  defaultValues,
  redirectUrl,
  projectContext
}: SignupDialogProps) {
  // Store project context in session storage when dialog opens
  useEffect(() => {
    if (open && projectContext) {
      sessionStorage.setItem("onboarding_project", JSON.stringify(projectContext));
      
      // Track signup dialog opened from landing page
      trackEvent('signup_dialog_opened', {
        source: 'landing_page',
        project_id: projectContext.id,
        project_name: projectContext.name,
        project_city: projectContext.city
      });
    }
  }, [open, projectContext]);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  // Determine redirect URL based on context
  const getRedirectUrl = () => {
    if (redirectUrl) return redirectUrl;
    if (typeof window !== "undefined" && window.location.pathname === "/portaal") {
      return `${window.location.origin}/dashboard`;
    }
    return typeof window !== "undefined" ? window.location.href : "/dashboard";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Direct toegang tot je persoonlijke portaal</DialogTitle>
          <DialogDescription className="sr-only">
            Log in om toegang te krijgen tot je persoonlijke portaal
          </DialogDescription>
        </DialogHeader>

        {/* Benefit bullets */}
        <div className="flex flex-col gap-2 py-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <OTPLoginForm 
          defaultEmail={defaultValues?.email}
          redirectUrl={getRedirectUrl()}
          onSuccess={handleSuccess}
          minimal
        />
      </DialogContent>
    </Dialog>
  );
}
