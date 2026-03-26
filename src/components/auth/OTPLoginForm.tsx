import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, Shield } from "lucide-react";
import { z } from "zod";
import { LoginProgressIndicator } from "@/components/auth/LoginProgressIndicator";
import { EmailHelpSection } from "@/components/auth/EmailHelpSection";

type Step = "email" | "code" | "name";

interface OTPLoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
  defaultEmail?: string;
  showCard?: boolean;
  /** Minimal mode - hides redundant headers for use in dialogs */
  minimal?: boolean;
}

const emailSchema = z.string().trim().email("Ongeldig e-mailadres").max(255);
const nameSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
});

export function OTPLoginForm({ 
  onSuccess, 
  redirectUrl,
  defaultEmail = "",
  showCard = false,
  minimal = false
}: OTPLoginFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [otpCode, setOtpCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");
  // Preserve role status for redirect after name step
  const [pendingIsPartner, setPendingIsPartner] = useState(false);
  const [pendingIsAdvocaat, setPendingIsAdvocaat] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const getRedirectUrl = () => {
    if (redirectUrl) return redirectUrl;
    if (typeof window !== "undefined" && window.location.pathname === "/portaal") {
      return `${window.location.origin}/dashboard`;
    }
    return `${window.location.origin}/dashboard`;
  };

  const handleSendOTP = async () => {
    // Validate email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }
    setEmailError("");

    setIsLoading(true);
    try {
      // Send OTP via our custom edge function
      const { data, error } = await supabase.functions.invoke("send-otp-email", {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) {
        console.error("Error sending OTP:", error);
        toast.error("Er is iets misgegaan. Probeer het opnieuw.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setIsNewUser(data?.is_new_user ?? false);
      toast.success("Code verstuurd! Check je inbox.");
      setStep("code");
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error("Voer de volledige 6-cijferige code in");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[OTPLoginForm] Starting OTP verification for:", email.trim().toLowerCase());
      
      // Verify OTP via our custom edge function
      const { data, error } = await supabase.functions.invoke("verify-otp-code", {
        body: { 
          email: email.trim().toLowerCase(),
          code: otpCode,
        },
      });

      console.log("[OTPLoginForm] Verify response:", { 
        hasData: !!data, 
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        errorMessage: error?.message,
      });

      if (error) {
        console.error("[OTPLoginForm] Edge function error:", error);
        toast.error("Verbindingsfout. Controleer je internet en probeer opnieuw.");
        setOtpCode("");
        return;
      }

      if (data?.error) {
        console.error("[OTPLoginForm] Verification error from server:", data.error);
        toast.error(data.error);
        setOtpCode("");
        return;
      }

      // Validate we have the required session tokens
      if (!data?.access_token || !data?.refresh_token) {
        console.error("[OTPLoginForm] Missing session tokens in response:", {
          hasAccessToken: !!data?.access_token,
          hasRefreshToken: !!data?.refresh_token,
        });
        toast.error("Kon geen geldige sessie ontvangen. Probeer opnieuw.");
        setOtpCode("");
        return;
      }

      console.log("[OTPLoginForm] Setting session with tokens...");
      
      // Set the session manually with tokens from edge function
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        console.error("[OTPLoginForm] Error setting session:", sessionError);
        toast.error(`Sessie kon niet worden ingesteld: ${sessionError.message}`);
        return;
      }

      if (!sessionData?.session) {
        console.error("[OTPLoginForm] No session returned after setSession");
        toast.error("Sessie niet aangemaakt. Probeer opnieuw.");
        return;
      }

      console.log("[OTPLoginForm] Session set successfully:", {
        userId: sessionData.user?.id,
        email: sessionData.user?.email,
      });

      // Check if we need to collect name
      if (data.needs_name) {
        console.log("[OTPLoginForm] User needs to provide name, showing name step. isPartner:", !!data.is_partner, "isAdvocaat:", !!data.is_advocaat);
        // Preserve role status for redirect after name step
        setPendingIsPartner(!!data.is_partner);
        setPendingIsAdvocaat(!!data.is_advocaat);
        setStep("name");
        return;
      }

      // Success - redirect (partners go to partner dashboard)
      toast.success("Succesvol ingelogd!");
      onSuccess?.();
      
      if (data.is_partner) {
        console.log("[OTPLoginForm] User is partner, redirecting to partner dashboard");
        navigate("/partner/dashboard");
      } else if (data.is_advocaat) {
        console.log("[OTPLoginForm] User is advocaat, redirecting to advocaat dashboard");
        navigate("/advocaat/dashboard");
      } else {
        const redirectPath = getRedirectUrl().replace(window.location.origin, "");
        console.log("[OTPLoginForm] Redirecting to:", redirectPath);
        navigate(redirectPath);
      }
    } catch (error: any) {
      console.error("[OTPLoginForm] Unexpected error:", error);
      toast.error("Er is een onverwachte fout opgetreden. Probeer opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    const validation = nameSchema.safeParse({ firstName, lastName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Sessie verlopen. Log opnieuw in.");
        setStep("email");
        return;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Kon profiel niet opslaan. Probeer het opnieuw.");
        return;
      }

      // Also update user metadata
      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

      // Sync naam naar crm_leads zodat het zichtbaar is in klantbeheer
      await supabase
        .from("crm_leads")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("user_id", user.id);

      // Check if there's a project context and add to favorites immediately
      const projectContextStr = sessionStorage.getItem("onboarding_project");
      if (projectContextStr) {
        try {
          const projectContext = JSON.parse(projectContextStr);
          if (projectContext?.id) {
            // Add project to favorites immediately
            await supabase.from("user_favorites").upsert({
              user_id: user.id,
              project_id: projectContext.id,
            }, { onConflict: 'user_id,project_id' });
          }
        } catch (e) {
          console.error("Error adding project to favorites:", e);
        }
      }

      toast.success("Welkom! Je account is klaar.");
      onSuccess?.();
      
      // Navigate based on context - role-based redirect
      if (pendingIsPartner) {
        console.log("[OTPLoginForm] Partner completed name step, redirecting to partner dashboard");
        navigate("/partner/dashboard");
      } else if (pendingIsAdvocaat) {
        console.log("[OTPLoginForm] Advocaat completed name step, redirecting to advocaat dashboard");
        navigate("/advocaat/dashboard");
      } else if (projectContextStr) {
        // New user with project context -> go to quick onboarding
        navigate("/onboarding");
      } else {
        // No project context -> go to original redirect
        navigate(getRedirectUrl().replace(window.location.origin, ""));
      }
    } catch (error: any) {
      console.error("Error saving name:", error);
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    await handleSendOTP();
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Step 1: Email Input */}
      {step === "email" && (
        <>
          {!minimal && (
            <>
              <LoginProgressIndicator currentStep={step} showNameStep={false} variant="light" />
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Toegang krijgen</h2>
                <p className="text-sm text-muted-foreground">
                  Voer je e-mailadres in. We sturen je een <strong>6-cijferige code</strong> om veilig in te loggen.
                </p>
              </div>
            </>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyDown={(e) => handleKeyDown(e, handleSendOTP)}
                disabled={isLoading}
                autoFocus
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSendOTP}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Verstuur toegangscode
            </Button>
            
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Geen wachtwoord nodig - veilig inloggen via e-mail</span>
            </div>
          </div>
        </>
      )}

      {/* Step 2: OTP Code Input */}
      {step === "code" && (
        <>
          <LoginProgressIndicator currentStep={step} showNameStep={false} variant="light" />
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Voer je code in</h2>
            <p className="text-sm text-muted-foreground">
              We hebben een <strong>6-cijferige code</strong> gestuurd naar<br />
              <strong>{email}</strong>
            </p>
            <p className="text-xs text-muted-foreground/70">
              De code staat ook in het onderwerp van de e-mail
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleVerifyOTP}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerifyOTP}
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verifiëren en doorgaan
            </Button>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtpCode("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-3 w-3" />
                Ander e-mailadres gebruiken
              </button>
              
              <EmailHelpSection
                email={email}
                resendCooldown={resendCooldown}
                onResend={handleResendOTP}
                isLoading={isLoading}
                variant="light"
              />
            </div>
          </div>
        </>
      )}

      {/* Step 3: Name Input (new users only) */}
      {step === "name" && (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Welkom! 👋</h2>
            <p className="text-sm text-muted-foreground">
              Vertel ons nog even je naam.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam</Label>
              <Input
                id="firstName"
                placeholder="Jan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveName)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Achternaam</Label>
              <Input
                id="lastName"
                placeholder="Jansen"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveName)}
                disabled={isLoading}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSaveName}
              disabled={isLoading || !firstName || !lastName}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ga naar mijn Portaal
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (showCard) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-card border rounded-lg shadow-sm">
        {content}
      </div>
    );
  }

  return content;
}