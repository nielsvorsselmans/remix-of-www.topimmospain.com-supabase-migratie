import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import IntakeForm from "@/components/hypotheek/IntakeForm";
import ReportHeader from "@/components/hypotheek/report/ReportHeader";
import TableOfContents from "@/components/hypotheek/report/TableOfContents";
import Introduction from "@/components/hypotheek/report/Introduction";
import MortgageAdvice from "@/components/hypotheek/report/MortgageAdvice";
import AISummary from "@/components/hypotheek/report/AISummary";
import PurchaseProfile from "@/components/hypotheek/report/PurchaseProfile";
import MortgageDetails from "@/components/hypotheek/report/MortgageDetails";
import CostOverview from "@/components/hypotheek/report/CostOverview";
import Feasibility from "@/components/hypotheek/report/Feasibility";
import EquitySection from "@/components/hypotheek/report/EquitySection";
import NextSteps from "@/components/hypotheek/report/NextSteps";
import FAQ from "@/components/hypotheek/report/FAQ";
import ScenarioSliders from "@/components/hypotheek/report/ScenarioSliders";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCrmLead } from "@/hooks/useCrmLead";
import { useCustomerHypotheekData } from "@/hooks/useCustomerHypotheekData";
import type { HypotheekReportResult } from "@/lib/hypotheekCalculations";
import type { HypotheekFormData } from "@/types/hypotheekForm";

export default function HypotheekSimulator() {
  const [report, setReport] = useState<HypotheekReportResult | null>(null);
  const [formData, setFormData] = useState<HypotheekFormData | null>(null);
  const [aiAdvies, setAiAdvies] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { user, profile } = useAuth();
  const { data: crmLead } = useCrmLead();
  const { data: hypotheekData } = useCustomerHypotheekData();
  const [searchParams] = useSearchParams();

  const isLoggedIn = !!user;
  const hasExistingData = !!(hypotheekData && hypotheekData.bruto_jaarinkomen && hypotheekData.bruto_jaarinkomen > 0);

  const prefillData = useMemo((): Partial<HypotheekFormData> => {
    const prefill: Partial<HypotheekFormData> = {};

    // From profile / auth
    if (profile?.first_name) prefill.voornaam = profile.first_name;
    if (profile?.last_name) prefill.achternaam = profile.last_name;
    if (user?.email) prefill.email = user.email;

    // From CRM lead — extract geboortejaar from date_of_birth
    if (crmLead?.phone) prefill.telefoon = crmLead.phone;
    if (crmLead?.date_of_birth) {
      prefill.geboortejaar = new Date(crmLead.date_of_birth).getFullYear();
    }

    // From customer_hypotheek_data
    if (hypotheekData) {
      if (hypotheekData.burgerlijke_staat) prefill.burgerlijkeStaat = hypotheekData.burgerlijke_staat as any;
      if (hypotheekData.plannen) prefill.plannen = hypotheekData.plannen as any;
      if (hypotheekData.inkomenstype) prefill.inkomenstype = hypotheekData.inkomenstype as any;
      if (hypotheekData.bruto_jaarinkomen) prefill.brutoJaarinkomen = Number(hypotheekData.bruto_jaarinkomen);
      prefill.heeftCoAanvrager = hypotheekData.heeft_co_aanvrager;
      if (hypotheekData.partner_bruto_jaarinkomen) prefill.partnerBrutoJaarinkomen = Number(hypotheekData.partner_bruto_jaarinkomen);
      if (hypotheekData.eigen_vermogen) prefill.eigenVermogen = Number(hypotheekData.eigen_vermogen);
      if (hypotheekData.woonlasten) prefill.woonlasten = Number(hypotheekData.woonlasten);
      // Combine legacy separate debt fields into overigeSchulden
      const autolening = Number(hypotheekData.autolening) || 0;
      const persoonlijkeLening = Number(hypotheekData.persoonlijke_lening) || 0;
      const alimentatie = Number(hypotheekData.alimentatie) || 0;
      prefill.overigeSchulden = autolening + persoonlijkeLening + alimentatie;
      prefill.heeftOverwaarde = hypotheekData.heeft_overwaarde;
      if (hypotheekData.woningwaarde) prefill.woningwaarde = Number(hypotheekData.woningwaarde);
      if (hypotheekData.openstaande_hypotheek) prefill.openstaandeHypotheek = Number(hypotheekData.openstaande_hypotheek);
    }

    // From URL query params (e.g. from project detail page)
    const qAankoopsom = searchParams.get("aankoopsom");
    const qProvincie = searchParams.get("provincie");
    if (qAankoopsom) {
      const val = Number(qAankoopsom);
      if (val > 0) { prefill.aankoopsom = val; prefill.heeftWoning = true; }
    }
    if (qProvincie && ["alicante", "valencia", "murcia"].includes(qProvincie)) {
      prefill.provincie = qProvincie as any;
    }

    return prefill;
  }, [profile, user, crmLead, hypotheekData, searchParams]);

  const handleComplete = useCallback(async (r: HypotheekReportResult, fd: HypotheekFormData) => {
    setReport(r);
    setFormData(fd);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const schuldenTotaal = fd.woonlasten + fd.overigeSchulden;

      // Insert hypotheek_leads for tracking
      await (supabase as any).from("hypotheek_leads").insert({
        user_id: currentUser?.id || null,
        voornaam: fd.voornaam,
        achternaam: fd.achternaam,
        email: fd.email,
        telefoon_landcode: fd.telefoonLandcode,
        telefoon: fd.telefoon,
        geboortedatum: fd.geboortejaar > 0 ? `${fd.geboortejaar}-01-01` : null,
        land: fd.landVanHerkomst,
        burgerlijke_staat: fd.burgerlijkeStaat,
        plannen: fd.plannen,
        inkomenstype: fd.inkomenstype,
        bruto_jaarinkomen: fd.brutoJaarinkomen,
        heeft_co_aanvrager: fd.heeftCoAanvrager,
        partner_bruto_jaarinkomen: fd.heeftCoAanvrager ? fd.partnerBrutoJaarinkomen : 0,
        eigen_vermogen: fd.eigenVermogen,
        schulden_totaal: schuldenTotaal,
        provincie: fd.provincie,
        woning_type: fd.woningType,
        aankoopsom: fd.aankoopsom,
        eindscore_letter: r.eindscore.letter,
        eindscore_percentage: r.eindscore.percentage,
        is_pep: false,
        rapport_json: r,
      });

      // Upsert customer_hypotheek_data if logged in
      if (currentUser?.id) {
        await (supabase as any).from("customer_hypotheek_data").upsert({
          user_id: currentUser.id,
          burgerlijke_staat: fd.burgerlijkeStaat,
          plannen: fd.plannen,
          inkomenstype: fd.inkomenstype,
          bruto_jaarinkomen: fd.brutoJaarinkomen,
          heeft_co_aanvrager: fd.heeftCoAanvrager,
          partner_bruto_jaarinkomen: fd.heeftCoAanvrager ? fd.partnerBrutoJaarinkomen : 0,
          eigen_vermogen: fd.eigenVermogen,
          woonlasten: fd.woonlasten,
          autolening: 0,
          persoonlijke_lening: 0,
          alimentatie: fd.overigeSchulden,
          heeft_overwaarde: fd.heeftOverwaarde,
          woningwaarde: fd.woningwaarde,
          openstaande_hypotheek: fd.openstaandeHypotheek,
          is_pep: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } catch (e) {
      console.error("Lead opslaan mislukt:", e);
    }
  }, []);

  useEffect(() => {
    if (!report) { setAiAdvies(null); setAiError(null); return; }
    const fetchAiAdvies = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const { data, error } = await supabase.functions.invoke("hypotheek-ai-advies", { body: { reportData: report } });
        if (error) throw error;
        setAiAdvies(data.advies);
      } catch (e: any) {
        console.error("AI advies error:", e);
        setAiError("De AI-analyse kon niet worden geladen. Probeer het later opnieuw.");
      } finally {
        setAiLoading(false);
      }
    };
    fetchAiAdvies();
  }, [report]);

  if (!report || !formData) {
    return (
      <div className="py-8">
        <div className="text-center mb-10 max-w-lg mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif text-primary mb-3">
            Ontdek in 60 seconden hoeveel je kunt lenen
          </h1>
          <p className="text-muted-foreground font-sans text-base md:text-lg mb-5">
            Bereken je maximale hypotheek voor een woning in Spanje — volledig vrijblijvend.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> Gratis</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> Geen verplichtingen</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> Direct resultaat</span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-3">Al 2.400+ simulaties uitgevoerd</p>
        </div>
        <IntakeForm
          onComplete={handleComplete}
          initialData={prefillData}
          isLoggedIn={isLoggedIn}
          hasExistingData={hasExistingData}
        />
      </div>
    );
  }

  const sections = [
    { id: "introductie", nummer: 1, titel: "Introductie" },
    { id: "hypotheekadvies", nummer: 2, titel: "Hypotheekadvies" },
    { id: "ai-advies", nummer: 3, titel: "AI-analyse" },
    { id: "aankoopprofiel", nummer: 4, titel: "Aankoopprofiel" },
    { id: "jouw-hypotheek", nummer: 5, titel: "Jouw Hypotheek" },
    ...(report.kosten.length > 0 ? [{ id: "kostenoverzicht", nummer: 6, titel: "Kostenoverzicht" }] : []),
    { id: "haalbaarheid", nummer: 7, titel: "Eigen Middelen" },
    ...(report.overwaarde ? [{ id: "overwaarde", nummer: 8, titel: "Overwaarde" }] : []),
    { id: "volgende-stappen", nummer: 9, titel: "Volgende Stappen" },
    { id: "faq", nummer: 10, titel: "Veelgestelde Vragen" },
    { id: "scenario", nummer: 11, titel: "Wat Als? Scenario" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => { setReport(null); setFormData(null); }} className="mb-4 gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Nieuw rapport
      </Button>
      <ReportHeader data={report} />
      <TableOfContents sections={sections} />
      <div className="space-y-10">
        <Introduction land={report.client.land} />
        <MortgageAdvice data={report} />
        <AISummary advies={aiAdvies} isLoading={aiLoading} error={aiError} />
        <PurchaseProfile data={report} />
        <MortgageDetails data={report} />
        <CostOverview data={report} />
        <Feasibility data={report} eindscoreGrade={report.eindscore.letter} />
        <EquitySection data={report} />
        <NextSteps data={report} />
        <FAQ data={report} />
        <ScenarioSliders originalFormData={formData} originalReport={report} onScenarioChange={() => {}} />
      </div>
      <footer className="mt-12 pt-8 border-t text-center">
        <p className="text-sm text-muted-foreground font-sans">
          Dit rapport is een indicatie en geen bindend hypotheekaanbod. Raadpleeg altijd een erkend hypotheekadviseur voor definitief advies.
        </p>
      </footer>
    </div>
  );
}
