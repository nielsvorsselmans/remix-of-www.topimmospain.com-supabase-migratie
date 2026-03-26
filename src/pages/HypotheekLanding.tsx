import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText, Brain, Zap, Shield, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";

const HypotheekLanding = () => {
  const navigate = useNavigate();

  const usps = [
    { icon: <Zap className="w-6 h-6" />, title: "Direct resultaat", description: "Binnen 2 minuten weet je hoeveel je kunt lenen voor een woning in Spanje." },
    { icon: <Brain className="w-6 h-6" />, title: "AI-analyse", description: "Onze AI analyseert je situatie en geeft persoonlijk advies." },
    { icon: <FileText className="w-6 h-6" />, title: "Compleet rapport", description: "Ontvang een gedetailleerd rapport met kosten, haalbaarheid en volgende stappen." },
  ];

  const steps = [
    { nummer: 1, titel: "Vul het formulier in", beschrijving: "Beantwoord een paar vragen over je inkomen, financiën en droomwoning." },
    { nummer: 2, titel: "Ontvang direct je rapport", beschrijving: "Krijg een compleet hypotheekrapport met maximale leencapaciteit en AI-analyse." },
    { nummer: 3, titel: "Plan je volgende stap", beschrijving: "Neem contact op voor persoonlijk advies of ga direct op woningjacht." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-primary-foreground px-4 py-1.5 rounded-full mb-6 text-sm font-sans">
              <Shield className="w-4 h-4" /> 100% gratis — geen verplichtingen
            </div>
            <h1 className="text-4xl md:text-6xl font-serif text-primary-foreground mb-6 leading-tight">
              Ontdek je hypotheekkansen<br className="hidden md:block" /> in Spanje
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 font-sans max-w-2xl mx-auto mb-8">
              Bereken in 2 minuten hoeveel je kunt lenen voor een woning aan de Costa Blanca, Costa Cálida of Valencia. Inclusief AI-analyse en kostenoverzicht.
            </p>
            <Button size="lg" onClick={() => navigate("/dashboard/calculators/hypotheek")} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6 rounded-xl shadow-lg">
              Start je gratis hypotheekcheck <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-primary-foreground/50 text-sm font-sans mt-4">Geen account nodig · Geen kosten · Direct resultaat</p>
          </motion.div>
        </div>
      </section>

      {/* USPs */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Waarom deze tool?</h2>
          <p className="text-muted-foreground font-sans">De snelste manier om je hypotheekmogelijkheden in Spanje te verkennen.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {usps.map((usp, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
              <Card className="border-0 shadow-md h-full">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 text-accent-foreground mb-4">{usp.icon}</div>
                  <h3 className="text-lg font-serif text-foreground mb-2">{usp.title}</h3>
                  <p className="text-muted-foreground font-sans text-sm">{usp.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/50">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Hoe werkt het?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.4 }} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-serif text-xl mb-4">{step.nummer}</div>
                <h3 className="text-lg font-serif text-foreground mb-2">{step.titel}</h3>
                <p className="text-muted-foreground font-sans text-sm">{step.beschrijving}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground mb-4">Klaar om te beginnen?</h2>
          <p className="text-primary-foreground/70 font-sans mb-8 max-w-lg mx-auto">Ontdek binnen 2 minuten wat je hypotheekmogelijkheden zijn in Spanje.</p>
          <Button size="lg" onClick={() => navigate("/dashboard/calculators/hypotheek")} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6 rounded-xl shadow-lg">
            Start je gratis hypotheekcheck <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground font-sans max-w-xl mx-auto">
            Dit is een indicatieve tool en geen bindend hypotheekaanbod. Raadpleeg altijd een erkend hypotheekadviseur voor definitief advies.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HypotheekLanding;
