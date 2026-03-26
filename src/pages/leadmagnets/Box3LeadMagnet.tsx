import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LeadMagnetLayout } from "@/components/leadmagnets/LeadMagnetLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingDown, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Mail,
  Calculator,
  BarChart3
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import larsProfile from "@/assets/lars-profile.webp";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Box3LeadMagnet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // UTM parameters for tracking
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";
  
  // If user is already logged in, redirect to calculator
  useEffect(() => {
    if (user) {
      navigate("/rekentools/box3");
    }
  }, [user, navigate]);
  
  // Track page view
  useEffect(() => {
    trackEvent("leadmagnet_page_view", {
      leadmagnet_type: "box3_calculator",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });
  }, [utmSource, utmMedium, utmCampaign]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Vul een geldig e-mailadres in");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      trackEvent("leadmagnet_conversion_attempt", {
        leadmagnet_type: "box3_calculator",
        email: email,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      });
      
      const { error } = await supabase.functions.invoke("send-otp-email", {
        body: { 
          email,
          source: "box3_leadmagnet",
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        },
      });
      
      if (error) throw error;
      
      setShowOTP(true);
      toast.success("Verificatiecode verzonden naar je e-mail");
      
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error("Voer de volledige 6-cijferige code in");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp-code", {
        body: { 
          email, 
          code: otpCode,
          source: "box3_leadmagnet",
        },
      });
      
      if (error) throw error;
      
      if (data?.success && data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        
        trackEvent("leadmagnet_conversion_success", {
          leadmagnet_type: "box3_calculator",
          email: email,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        });
        
        toast.success("Welkom! Je wordt doorgestuurd naar de calculator...");
        
        setTimeout(() => {
          navigate("/rekentools/box3");
        }, 1000);
        
      } else {
        throw new Error("Verificatie mislukt");
      }
      
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Ongeldige code. Probeer het opnieuw.");
    } finally {
      setIsVerifying(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };
  
  return (
    <LeadMagnetLayout
      title="Bereken je Box 3 Besparing met Spaans Vastgoed | Viva Vastgoed"
      description="Ontdek in 30 seconden hoeveel Box 3 vermogensbelasting je kunt besparen door te investeren in Spaans vastgoed. Gratis en vrijblijvend."
      keywords="box 3 calculator, vermogensbelasting besparen, spaans vastgoed belasting, box 3 2025"
      canonicalUrl="https://vivavastgoed.com/lp/box3-calculator"
    >
      {/* Hero Section - Mobile First, Above the Fold */}
      <section className="py-6 px-4 bg-gradient-to-b from-primary/5 to-background" id="lead-form">
        <div className="container mx-auto max-w-5xl">
          
          {/* Mobile-First: Badge + Headline + Combined Card */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            
            {/* Left Column - Desktop only intro text */}
            <div className="hidden lg:block space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                2025 Update – Gratis
              </div>
              
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Betaal jij te veel{" "}
                <span className="text-primary">Box 3 belasting</span>?
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Ontdek in 30 seconden je persoonlijke besparing met Spaans vastgoed.
              </p>
              
              {/* Social Proof - Desktop */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">8.000+</strong> investeerders gingen je voor
                </p>
              </div>
              
              {/* Lars Trust - Desktop */}
              <div className="flex items-center gap-3 pt-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={larsProfile} alt="Lars" />
                  <AvatarFallback className="bg-primary/10 text-primary">L</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground italic">
                    "Ik leg je uit hoe dit werkt – zonder verplichtingen."
                  </p>
                  <p className="text-sm font-semibold">Lars van Viva Vastgoed</p>
                </div>
              </div>
            </div>
            
            {/* Right Column / Mobile: Combined Result + Form Card */}
            <div className="space-y-4">
              
              {/* Mobile Badge */}
              <div className="lg:hidden flex justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  2025 – Gratis
                </div>
              </div>
              
              {/* Mobile Headline */}
              <h1 className="lg:hidden text-2xl sm:text-3xl font-bold text-center leading-tight">
                Betaal jij te veel <span className="text-primary">Box 3 belasting</span>?
              </h1>
              
              {/* Combined Result + Form Card - THE HERO */}
              <Card className="border-2 border-primary/30 shadow-2xl overflow-hidden">
                {/* Result Preview Header */}
                <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-5 text-center border-b border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Gemiddelde besparing
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <TrendingDown className="h-7 w-7 text-primary" />
                    <span className="text-4xl sm:text-5xl font-bold text-primary">
                      €2.500
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">per jaar</p>
                </div>
                
                {/* Form Section */}
                <CardContent className="p-5">
                  {!showOTP ? (
                    <div className="space-y-4">
                      <p className="text-center text-sm text-muted-foreground">
                        Vul je e-mail in voor je persoonlijke berekening
                      </p>
                      
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="jouw@email.nl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 pl-10 text-base"
                            required
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          size="lg"
                          className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow animate-pulse hover:animate-none"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Bezig...
                            </>
                          ) : (
                            <>
                              BEREKEN MIJN BESPARING
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </form>
                      
                      <p className="text-[11px] text-center text-muted-foreground">
                        🔒 Gratis • Geen spam • Geen verplichtingen
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold mb-1">Check je inbox</h2>
                        <p className="text-sm text-muted-foreground">
                          Code gestuurd naar <strong className="text-foreground">{email}</strong>
                        </p>
                      </div>
                      
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
                        onClick={handleVerifyOTP}
                        size="lg"
                        className="w-full h-12 text-base font-semibold"
                        disabled={isVerifying || otpCode.length !== 6}
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Verifiëren...
                          </>
                        ) : (
                          <>
                            Ga naar calculator
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                      
                      <button
                        type="button"
                        onClick={() => { setShowOTP(false); setOtpCode(""); }}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Ander e-mailadres gebruiken
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Mobile Trust Badges - Compact */}
              <div className="lg:hidden flex justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Gratis
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 30 sec
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Vrijblijvend
                </span>
              </div>
              
              {/* Mobile Social Proof */}
              <div className="lg:hidden flex items-center justify-center gap-2 pt-2">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">8.000+</strong> geholpen
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Visual Example Calculation */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Zo werkt het in de praktijk
            </h2>
            <p className="text-muted-foreground">
              Voorbeeld berekening bij €500.000 vermogen
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <Card className="text-center p-6 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">
                Zonder Spaans vastgoed
              </p>
              <p className="text-4xl font-bold text-red-600 dark:text-red-400">€8.250</p>
              <p className="text-sm text-muted-foreground mt-2">Box 3 per jaar</p>
            </Card>
            
            <Card className="text-center p-6 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/30">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">
                Met Spaans vastgoed
              </p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">€5.750</p>
              <p className="text-sm text-muted-foreground mt-2">Box 3 per jaar</p>
            </Card>
            
            <Card className="text-center p-6 border-primary bg-primary/10">
              <p className="text-sm font-medium text-primary mb-3">
                Jouw besparing
              </p>
              <div className="flex items-center justify-center gap-2">
                <TrendingDown className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold text-primary">€2.500</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">per jaar minder</p>
            </Card>
          </div>
        </div>
      </section>
      
      {/* How it Works - 3 Steps */}
      <section className="py-12 md:py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            In 3 stappen naar jouw resultaat
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-lg mb-2">1. E-mail invoeren</h3>
              <p className="text-muted-foreground">
                Zodat we je resultaten kunnen bewaren
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calculator className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Vermogen invullen</h3>
              <p className="text-muted-foreground">
                Spaargeld, beleggingen en schulden
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Direct resultaat</h3>
              <p className="text-muted-foreground">
                Zie je besparingspotentieel
              </p>
            </div>
          </div>
          
          {/* CTA */}
          <div className="text-center mt-10">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg font-semibold"
              onClick={scrollToForm}
            >
              Start mijn berekening
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* FAQ */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Veelgestelde vragen
          </h2>
          
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="gratis" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-medium text-left">Is dit echt gratis?</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground">
                Ja, de calculator is 100% gratis en vrijblijvend. We vragen alleen je 
                e-mail om je berekening te bewaren zodat je later terug kunt komen.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="data" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-medium text-left">Wat gebeurt er met mijn gegevens?</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground">
                We delen je gegevens nooit met derden. Je ontvangt mogelijk waardevolle 
                tips over vastgoedbeleggen, maar je kunt je altijd uitschrijven.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="kopen" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-medium text-left">Moet ik daarna iets kopen?</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground">
                Nee, absoluut niet. De calculator geeft je inzicht in de mogelijkheden. 
                Als je later meer wilt weten, kun je vrijblijvend contact met ons opnemen.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-12 md:py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Klaar om te ontdekken hoeveel je kunt besparen?
          </h2>
          <p className="text-muted-foreground mb-8">
            Het is gratis, duurt 30 seconden en je zit nergens aan vast.
          </p>
          <Button 
            size="lg" 
            className="h-14 px-10 text-lg font-semibold"
            onClick={scrollToForm}
          >
            Bereken mijn besparing
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </LeadMagnetLayout>
  );
}
