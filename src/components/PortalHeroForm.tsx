import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, Check, Shield } from "lucide-react";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { LoginProgressIndicator } from "@/components/auth/LoginProgressIndicator";
import { EmailHelpSection } from "@/components/auth/EmailHelpSection";

type Step = "email" | "code" | "name";

interface PortalHeroFormProps {
  onNeedDialog?: () => void;
  variant?: "dark" | "light";
}

const emailSchema = z.string().trim().email("Ongeldig e-mailadres").max(255);
const nameSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
});

export function PortalHeroForm({ onNeedDialog, variant = "light" }: PortalHeroFormProps) {
  const isDark = variant === "dark";
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");

  const handleSendOTP = async () => {
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }
    setEmailError("");

    setIsLoading(true);
    try {
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

      toast.success("Code verstuurd! Check je inbox.");
      setStep("code");
      setResendCooldown(60);
      
      // Start cooldown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
      const { data, error } = await supabase.functions.invoke("verify-otp-code", {
        body: { 
          email: email.trim().toLowerCase(),
          code: otpCode,
        },
      });

      if (error) {
        console.error("Error verifying OTP:", error);
        toast.error("Er is iets misgegaan. Probeer het opnieuw.");
        setOtpCode("");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setOtpCode("");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        console.error("Error setting session:", sessionError);
        toast.error("Kon sessie niet instellen. Probeer opnieuw.");
        return;
      }

      if (data.needs_name) {
        setStep("name");
        return;
      }

      // Success - redirect (partners go to partner dashboard)
      toast.success("Welkom terug!");
      
      if (data.is_partner) {
        navigate("/partner/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
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
        toast.error("Sessie verlopen. Probeer opnieuw.");
        setStep("email");
        return;
      }

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

      toast.success("Welkom! Je account is klaar.");
      navigate("/dashboard");
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

  // Step 1: Email input
  if (step === "email") {
    return (
      <div className="space-y-6">
        <LoginProgressIndicator currentStep={step} showNameStep={false} variant={isDark ? "dark" : "light"} />
        
        <div className="text-center">
          <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-foreground"}`}>
            Start je oriëntatie
          </h2>
          <p className={`text-sm sm:text-base ${isDark ? "text-white/80" : "text-muted-foreground"}`}>
            Voer je e-mailadres in. We sturen je een <strong>6-cijferige code</strong> om veilig in te loggen.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => handleKeyDown(e, handleSendOTP)}
              disabled={isLoading}
              className={isDark ? "bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-primary" : ""}
              autoFocus
            />
            {emailError && (
              <p className={`text-sm ${isDark ? "text-red-300" : "text-destructive"}`}>{emailError}</p>
            )}
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <div className={`flex items-center justify-center gap-4 text-xs ${isDark ? "text-white/70" : "text-muted-foreground"}`}>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" />
              <span>Gratis</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" />
              <span>Geen creditcard</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" />
              <span>Direct toegang</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 text-xs ${isDark ? "text-white/50" : "text-muted-foreground/70"}`}>
            <Shield className="w-3 h-3" />
            <span>Geen wachtwoord nodig - veilig inloggen via e-mail</span>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: OTP Code input
  if (step === "code") {
    return (
      <div className="space-y-6">
        <LoginProgressIndicator currentStep={step} showNameStep={false} variant={isDark ? "dark" : "light"} />
        
        <div className="text-center">
          <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-foreground"}`}>
            Voer je code in
          </h2>
          <p className={`text-sm sm:text-base ${isDark ? "text-white/80" : "text-muted-foreground"}`}>
            We hebben een <strong className={isDark ? "text-white" : "text-foreground"}>6-cijferige code</strong> gestuurd naar<br />
            <strong className={isDark ? "text-white" : "text-foreground"}>{email}</strong>
          </p>
          <p className={`text-xs mt-2 ${isDark ? "text-white/50" : "text-muted-foreground/70"}`}>
            De code staat ook in het onderwerp van de e-mail
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            onComplete={handleVerifyOTP}
            className="gap-2"
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <InputOTPSlot key={i} index={i} className={isDark ? "bg-white/10 border-white/30 text-white" : ""} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
            className={`text-sm flex items-center justify-center gap-1 mx-auto ${isDark ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowLeft className="h-3 w-3" />
            Ander e-mailadres gebruiken
          </button>
          
          <EmailHelpSection
            email={email}
            resendCooldown={resendCooldown}
            onResend={handleResendOTP}
            isLoading={isLoading}
            variant={isDark ? "dark" : "light"}
          />
        </div>
      </div>
    );
  }

  // Step 3: Name input (new users only)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-foreground"}`}>
          Welkom! 👋
        </h2>
        <p className={`text-sm sm:text-base ${isDark ? "text-white/80" : "text-muted-foreground"}`}>
          Vertel ons nog even je naam.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className={isDark ? "text-white/80" : "text-foreground"}>Voornaam</Label>
          <Input
            id="firstName"
            placeholder="Jan"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleSaveName)}
            disabled={isLoading}
            className={isDark ? "bg-white/10 border-white/30 text-white placeholder:text-white/50" : ""}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className={isDark ? "text-white/80" : "text-foreground"}>Achternaam</Label>
          <Input
            id="lastName"
            placeholder="Jansen"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleSaveName)}
            disabled={isLoading}
            className={isDark ? "bg-white/10 border-white/30 text-white placeholder:text-white/50" : ""}
          />
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          size="lg"
          onClick={handleSaveName}
          disabled={isLoading || !firstName || !lastName}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ga naar mijn Portaal
        </Button>
      </div>
    </div>
  );
}
