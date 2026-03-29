import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Mail, Calendar, MapPin, Clock, CheckCircle2, Compass, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { z } from "zod";
import { trackEvent } from "@/lib/tracking";
import larsProfile from "@/assets/lars-profile.webp";
import { supabase } from "@/integrations/supabase/client";
import { CTASection } from "@/components/CTASection";
const contactFormSchema = z.object({
  name: z.string().trim().min(1, {
    message: "We willen je graag bij naam kennen"
  }).max(100, {
    message: "Naam mag maximaal 100 karakters zijn"
  }),
  email: z.string().trim().email({
    message: "We hebben een geldig e-mailadres nodig om te antwoorden"
  }).max(255, {
    message: "E-mailadres mag maximaal 255 karakters zijn"
  }),
  phone: z.string().trim().max(20, {
    message: "Telefoonnummer mag maximaal 20 karakters zijn"
  }).optional(),
  message: z.string().trim().min(1, {
    message: "Je kunt je vraag in je eigen woorden stellen"
  }).max(2000, {
    message: "Bericht mag maximaal 2000 karakters zijn"
  })
});
type ContactFormData = z.infer<typeof contactFormSchema>;
export default function Contact() {
  const {
    toast
  } = useToast();
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [pageLoadTime] = useState(Date.now());
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const validatedData = contactFormSchema.parse(formData);

      // Create contact in GoHighLevel CRM
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const crmResponse = await supabase.functions.invoke('create-ghl-contact', {
        body: {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          message: validatedData.message
        }
      });
      if (crmResponse.error) {
        console.error('Failed to create CRM contact:', crmResponse.error);
        // Continue with form submission even if CRM fails
      }
      const whatsappMessage = encodeURIComponent(`Naam: ${validatedData.name}\n` + `Email: ${validatedData.email}\n` + `Telefoon: ${validatedData.phone || 'Niet opgegeven'}\n\n` + `Bericht:\n${validatedData.message}`);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=32468132903&text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');
      trackEvent('contact_form_submitted', {
        has_phone: !!validatedData.phone,
        message_length: validatedData.message.length,
        crm_synced: !crmResponse.error
      });
      toast({
        title: "Bedankt voor je bericht!",
        description: "We nemen zo spoedig mogelijk contact met je op."
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: ""
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Er ging iets mis",
          description: "Probeer het later opnieuw of neem direct contact met ons op.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Track first interaction
    if (!formStarted && e.target.value.length > 0) {
      setFormStarted(true);
      trackEvent('contact_form_started', {
        first_field: e.target.name,
        time_to_start_seconds: Math.round((Date.now() - pageLoadTime) / 1000)
      });
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name as keyof ContactFormData]) {
      setErrors({
        ...errors,
        [e.target.name]: undefined
      });
    }
  };

  // Helper function for completion percentage
  const calculateCompletionPercentage = () => {
    let score = 0;
    if (formData.name.length > 0) score += 33;
    if (formData.email.length > 0) score += 34;
    if (formData.message.length > 0) score += 33;
    return score;
  };

  // Track form abandonment
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only track if form was started but not submitted
      if (formStarted && !isSubmitting) {
        trackEvent('contact_form_abandoned', {
          fields_filled: {
            name: formData.name.length > 0,
            email: formData.email.length > 0,
            phone: formData.phone?.length > 0 || false,
            message: formData.message.length > 0
          },
          completion_percentage: calculateCompletionPercentage(),
          time_on_page_seconds: Math.round((Date.now() - pageLoadTime) / 1000)
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formStarted, formData, isSubmitting, pageLoadTime]);
  const openWhatsApp = () => {
    trackEvent('contact_method_clicked', {
      method: 'whatsapp'
    });
    window.open('https://wa.me/32468132903', '_blank');
  };
  const openEmail = () => {
    trackEvent('contact_method_clicked', {
      method: 'email'
    });
    window.location.href = 'mailto:info@topimmospain.com';
  };
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-8">
        <div className="pl-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Contact</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Hero Section - Split Layout */}
      <section className="relative pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Een Vraag? We Helpen Je Graag Verder
                </h1>
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  Je hoeft nog niet concreet te zijn om contact op te nemen. Soms is een eerste vraag al genoeg om helderheid te krijgen.
                </p>
                <p className="text-lg text-muted-foreground">
                  We luisteren graag mee en denken met je mee — zonder verplichtingen, zonder druk, zonder verkooppraatjes.
                </p>
              </div>

              {/* Right Column - Lars Card */}
              <div>
                <Card className="bg-card/80 backdrop-blur border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-6">
                      <Avatar className="w-24 h-24 border-2 border-primary/20">
                        <AvatarImage src={larsProfile} alt="Lars" />
                        <AvatarFallback>LS</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Lars Vorsselmans</p>
                        <p className="text-base text-foreground leading-relaxed italic">
                          "Neem gerust contact op. Of je nu net begint met oriënteren of al verder bent in je zoektocht – we denken graag met je mee."
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Reactie binnen 24 uur</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Kies de Manier die Bij Jou Past
            </h2>
            <p className="text-lg text-muted-foreground">
              Of je nu een snelle vraag hebt, persoonlijk wilt kennismaken, of zelfstandig wilt oriënteren: je kiest wat op dit moment het beste voor je is.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {/* Option 1: Quick Question */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Snelle Vraag</CardTitle>
                <CardDescription className="text-left mt-4">
                  <p className="mb-3 text-base">Voor een korte, specifieke vraag:</p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Direct antwoord, geen wachttijd</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Via WhatsApp of e-mail</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Reactie binnen 24 uur</span>
                    </li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => {
                trackEvent('contact_method_clicked', {
                  method: 'whatsapp'
                });
                window.open('https://wa.me/32468132903', '_blank');
              }} className="w-full" variant="default" size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={openEmail} className="w-full" variant="outline" size="lg">
                  <Mail className="w-4 h-4 mr-2" />
                  E-mail
                </Button>
              </CardContent>
            </Card>

            {/* Option 2: Plan een Gesprek */}
            <Card className="text-center hover:shadow-lg transition-shadow border-primary/20">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Plan een Gesprek</CardTitle>
                <CardDescription className="text-left mt-4">
                  <p className="mb-3 text-base">Voor wie persoonlijk wil kennismaken:</p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Kennismaken met Lars, Niels of Filip</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Bespreek je wensen en mogelijkheden</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>30 minuten videocall</span>
                    </li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg" onClick={() => trackEvent('cta_clicked', {
                cta_location: 'contact_options',
                cta_type: 'plan_gesprek',
                cta_text: 'Plan een Gesprek'
              })}>
                  <Link to="/afspraak">
                    <Calendar className="w-4 h-4 mr-2" />
                    Plan een Gesprek
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Vrijblijvend · Geen verkoopgesprek
                </p>
              </CardContent>
            </Card>

            {/* Option 3: Start in het Portaal */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Compass className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Start in het Portaal</CardTitle>
                <CardDescription className="text-left mt-4">
                  <p className="mb-3 text-base">Voor wie zelfstandig wil oriënteren:</p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Ontdek projecten en bereken rendement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Vergelijk regio's en gemeenten</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>In je eigen tempo</span>
                    </li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline" size="lg" onClick={() => trackEvent('cta_clicked', {
                cta_location: 'contact_options',
                cta_type: 'ontdek_portaal',
                cta_text: 'Ontdek het Portaal'
              })}>
                  <Link to="/portaal">
                    <Compass className="w-4 h-4 mr-2" />
                    Ontdek het Portaal
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Gratis · Vrijblijvend
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Of Stel Je Vraag via het Formulier
              </h2>
              <p className="text-lg text-muted-foreground mb-2">
                Liever even rustig je vraag formuleren? Vul onderstaand formulier in.
              </p>
              <p className="text-sm text-muted-foreground">
                Lars of een van onze collega's neemt persoonlijk contact met je op.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">
                      Hoe mogen we je aanspreken? <span className="text-destructive">*</span>
                    </Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Je voornaam" className={errors.name ? "border-destructive" : ""} disabled={isSubmitting} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">
                      Je e-mailadres <span className="text-destructive">*</span>
                    </Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="naam@voorbeeld.nl" className={errors.email ? "border-destructive" : ""} disabled={isSubmitting} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-base">
                      Telefoonnummer <span className="text-muted-foreground text-sm">(optioneel)</span>
                    </Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+32 468 13 29 03" className={errors.phone ? "border-destructive" : ""} disabled={isSubmitting} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                    <p className="text-xs text-muted-foreground">
                      Als je een telefoonnummer achterlaat, kunnen we je eventueel ook bellen.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-base">
                      Je vraag <span className="text-destructive">*</span>
                    </Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Je kunt je vraag in je eigen woorden stellen. Er is geen druk — we zijn er om mee te denken." rows={6} className={errors.message ? "border-destructive" : ""} disabled={isSubmitting} />
                    {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Verzenden..." : "Verstuur via WhatsApp"}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    Je bericht wordt via WhatsApp verstuurd naar ons team.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Wat Anderen Zeggen
              </h2>
              <p className="text-lg text-muted-foreground">
                Je bent niet de enige die deze stap overweegt.
              </p>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <Avatar className="w-20 h-20 border-2 border-primary/20 flex-shrink-0">
                    <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/review-images/reviews/1764110330821-customer.jpg`} alt="Jordi & Sharona" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                    </div>
                    
                    <p className="text-lg text-foreground mb-4 leading-relaxed">
                      "Van jongs af aan droomden we van een leven onder de Spaanse zon. Top Immo Spain heeft onze droom, zelfs met een kindje op komst en op jonge leeftijd, werkelijkheid gemaakt. Hun persoonlijke begeleiding gaf ons het vertrouwen dat we nodig hadden om deze grote stap te zetten."
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Jordi & Sharona</p>
                        <p className="text-sm text-muted-foreground">Santiago de la Ribera</p>
                      </div>
                      
                      <Button asChild variant="outline" size="sm" onClick={() => trackEvent('cta_clicked', {
                      cta_location: 'social_proof',
                      cta_type: 'read_story',
                      cta_text: 'Lees hun verhaal'
                    })}>
                        <Link to="/klantverhalen/sharona-jordi-jonge-dromers-vastberaden-investeerders-in-spanje">
                          Lees hun verhaal →
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <Button asChild variant="link">
                <Link to="/klantverhalen">
                  Meer klantverhalen →
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Practical Information - Compact */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-foreground">
              Praktische Informatie
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Bereikbaarheid */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    Bereikbaarheid
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">WhatsApp</p>
                    <a href="https://wa.me/32468132903" className="text-foreground hover:text-primary transition-colors">
                      +32 468 13 29 03
                    </a>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">E-mail</p>
                    <a href="mailto:info@topimmospain.com" className="text-foreground hover:text-primary transition-colors">
                      info@topimmospain.com
                    </a>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Reactietijd</p>
                    <p className="text-foreground">Binnen 24 uur op werkdagen</p>
                  </div>
                </CardContent>
              </Card>

              {/* Over Ons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    Over Ons
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground leading-relaxed">
                    Top Immo Spain is een familiebedrijf dat zich richt op de Costa Blanca Zuid en Costa Cálida. We kennen elk project persoonlijk en blijven ook na de aankoop je vaste partner voor beheer en verhuur.
                  </p>
                  
                  <Button asChild variant="outline" className="w-full" onClick={() => trackEvent('cta_clicked', {
                  cta_location: 'practical_info',
                  cta_type: 'about_us',
                  cta_text: 'Lees meer over ons'
                })}>
                    <Link to="/over-ons">
                      Lees meer over ons →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection />

      <Footer />
    </div>;
}