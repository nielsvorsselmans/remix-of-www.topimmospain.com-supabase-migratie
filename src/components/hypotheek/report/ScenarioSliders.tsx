import { useState, useMemo, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { generateHypotheekReport, type HypotheekReportResult } from "@/lib/hypotheekCalculations";
import type { HypotheekFormData } from "@/types/hypotheekForm";
import ScoreIndicator from "./ScoreIndicator";
import SectionWrapper from "./SectionWrapper";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { originalFormData: HypotheekFormData; originalReport: HypotheekReportResult; onScenarioChange: (report: HypotheekReportResult) => void; }

const fmt = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ScenarioSliders = ({ originalFormData, originalReport, onScenarioChange }: Props) => {
  const [aankoopsom, setAankoopsom] = useState(originalFormData.aankoopsom || 300000);
  const [eigenVermogen, setEigenVermogen] = useState(originalFormData.eigenVermogen);
  const [woonlasten, setWoonlasten] = useState(originalFormData.woonlasten);

  const isModified = aankoopsom !== (originalFormData.aankoopsom || 300000) || eigenVermogen !== originalFormData.eigenVermogen || woonlasten !== originalFormData.woonlasten;

  const scenarioReport = useMemo(() => {
    const modified: HypotheekFormData = { ...originalFormData, aankoopsom, eigenVermogen, woonlasten, heeftWoning: aankoopsom > 0 };
    return generateHypotheekReport(modified);
  }, [originalFormData, aankoopsom, eigenVermogen, woonlasten]);

  const handleReset = useCallback(() => {
    setAankoopsom(originalFormData.aankoopsom || 300000);
    setEigenVermogen(originalFormData.eigenVermogen);
    setWoonlasten(originalFormData.woonlasten);
  }, [originalFormData]);

  useMemo(() => { if (isModified) onScenarioChange(scenarioReport); }, [scenarioReport, isModified]);

  const scoreDiff = scenarioReport.eindscore.percentage - originalReport.eindscore.percentage;
  const maandlastDiff = scenarioReport.hypotheek.maandlast - originalReport.hypotheek.maandlast;

  return (
    <SectionWrapper id="scenario" nummer={11} titel="Wat Als? Scenario">
      <p className="text-muted-foreground mb-6 font-sans">Verschuif de sliders om direct te zien hoe wijzigingen je haalbaarheid beïnvloeden.</p>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card><CardContent className="pt-6"><label className="text-sm font-medium font-sans text-foreground block mb-1">Aankoopsom</label><p className="text-2xl font-bold font-sans text-primary mb-4">{fmt(aankoopsom)}</p><Slider value={[aankoopsom]} onValueChange={([v]) => setAankoopsom(v)} min={50000} max={1000000} step={10000} /><div className="flex justify-between text-xs text-muted-foreground mt-1 font-sans"><span>€50k</span><span>€1M</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><label className="text-sm font-medium font-sans text-foreground block mb-1">Eigen vermogen</label><p className="text-2xl font-bold font-sans text-primary mb-4">{fmt(eigenVermogen)}</p><Slider value={[eigenVermogen]} onValueChange={([v]) => setEigenVermogen(v)} min={0} max={500000} step={5000} /><div className="flex justify-between text-xs text-muted-foreground mt-1 font-sans"><span>€0</span><span>€500k</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><label className="text-sm font-medium font-sans text-foreground block mb-1">Huidige woonlasten</label><p className="text-2xl font-bold font-sans text-primary mb-4">{fmt(woonlasten)}/mnd</p><Slider value={[woonlasten]} onValueChange={([v]) => setWoonlasten(v)} min={0} max={3000} step={50} /><div className="flex justify-between text-xs text-muted-foreground mt-1 font-sans"><span>€0</span><span>€3.000</span></div></CardContent></Card>
      </div>
      <Card className="border-accent/30 bg-accent/5"><CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-accent-foreground" /><h3 className="text-lg font-sans font-semibold text-foreground">{isModified ? "Scenario resultaat" : "Huidig resultaat"}</h3></div>
          {isModified && (<Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground"><RotateCcw className="w-4 h-4" /> Reset</Button>)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          <div className="flex flex-col items-center"><ScoreIndicator percentage={scenarioReport.eindscore.percentage} size="md" /><span className="text-sm font-sans font-medium mt-2 text-foreground">{scenarioReport.eindscore.label}</span>{isModified && scoreDiff !== 0 && (<span className={`text-xs font-sans font-bold mt-1 ${scoreDiff > 0 ? "text-green-500" : "text-destructive"}`}>{scoreDiff > 0 ? "+" : ""}{scoreDiff}%</span>)}</div>
          <div className="text-center"><p className="text-sm text-muted-foreground font-sans">Maandlast</p><p className="text-xl font-bold font-sans text-foreground">{fmt(scenarioReport.hypotheek.maandlast)}</p>{isModified && maandlastDiff !== 0 && (<span className={`text-xs font-sans font-bold ${maandlastDiff < 0 ? "text-green-500" : "text-destructive"}`}>{maandlastDiff > 0 ? "+" : ""}{fmt(maandlastDiff)}</span>)}</div>
          <div className="text-center"><p className="text-sm text-muted-foreground font-sans">Max. hypotheek</p><p className="text-xl font-bold font-sans text-foreground">{fmt(scenarioReport.hypotheek.maxHypotheekbedrag)}</p></div>
          <div className="text-center"><p className="text-sm text-muted-foreground font-sans">Eigen inbreng nodig</p><p className="text-xl font-bold font-sans text-foreground">{fmt(scenarioReport.haalbaarheid.eigenMiddelenNodig)}</p></div>
        </div>
      </CardContent></Card>
    </SectionWrapper>
  );
};

export default ScenarioSliders;
