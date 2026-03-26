import type { HypotheekFormData, Inkomenstype, Provincie, WoningType } from "@/types/hypotheekForm";

// Vaste parameters — Spanje
const MAX_AFLOSSINGSLEEFTIJD = 75;
const MAX_HYPOTHEEKDUUR = 25;
const MIN_HYPOTHEEKDUUR = 10;
const MAX_DTI = 35;
const MAX_LTV_NIET_RESIDENT = 70;
const MAX_LTV_RESIDENT = 80;
const ADVOCAATKOSTEN = 2500;
const BANKKOSTEN = 800;
const MIN_VRIJE_RUIMTE = 350;

// ITP percentages per provincie (bestaande woningen)
const ITP_PER_PROVINCIE: Record<Provincie, number> = {
  alicante: 10,
  valencia: 10,
  murcia: 8,
};

// Nieuwbouw belasting
const IVA_PERCENTAGE = 10;
const AJD_PERCENTAGE = 1.5;

type Grade = "A" | "B" | "C" | "D";

const NETTO_FACTOR: Record<string, number> = {
  nederland: 0.70,
  belgie: 0.65,
  duitsland: 0.60,
};

const PROVINCIE_LABELS: Record<Provincie, string> = {
  alicante: "Alicante (Costa Blanca)",
  valencia: "Valencia",
  murcia: "Murcia (Costa Cálida)",
};

const WONINGTYPE_LABELS: Record<WoningType, string> = {
  nieuwbouw: "Nieuwbouw",
  bestaand: "Bestaande woning",
};

function getBelastingPercentage(woningType: WoningType, provincie: Provincie): { label: string; percentage: number }[] {
  if (woningType === "nieuwbouw") {
    return [
      { label: `BTW (IVA) ${IVA_PERCENTAGE}%`, percentage: IVA_PERCENTAGE },
      { label: `AJD ${AJD_PERCENTAGE}%`, percentage: AJD_PERCENTAGE },
    ];
  }
  const itp = ITP_PER_PROVINCIE[provincie];
  return [{ label: `Overdrachtsbelasting (ITP) ${itp}%`, percentage: itp }];
}

function getNettoFactor(land: string): number {
  return NETTO_FACTOR[land] ?? 0.68;
}

export function getDefaultRente(plannen: string, inkomenstype: string): number {
  let rente = plannen === "permanent" ? 2.80 : 3.20;
  if (inkomenstype === "zzp") rente += 0.30;
  if (inkomenstype === "pensioen") rente += 0.15;
  return Math.round(rente * 100) / 100;
}

function getInkomenstypeScore(type: Inkomenstype): number {
  switch (type) {
    case "loondienst": return 98;
    case "pensioen": return 85;
    case "zzp": return 65;
    case "geen": return 20;
  }
}

function getInkomenstypeGrade(type: Inkomenstype): Grade {
  switch (type) {
    case "loondienst": return "A";
    case "pensioen": return "B";
    case "zzp": return "C";
    case "geen": return "D";
  }
}

function calculateMaxLooptijdFromYear(geboortejaar: number): number {
  const currentYear = new Date().getFullYear();
  const leeftijd = currentYear - geboortejaar;
  const maxJaren = MAX_AFLOSSINGSLEEFTIJD - leeftijd;
  return Math.max(MIN_HYPOTHEEKDUUR, Math.min(MAX_HYPOTHEEKDUUR, maxJaren));
}

function calculateAnnuity(maandlast: number, jaarRente: number, looptijdJaren: number): number {
  const r = jaarRente / 100 / 12;
  const n = looptijdJaren * 12;
  if (r === 0) return maandlast * n;
  return maandlast * ((1 - Math.pow(1 + r, -n)) / r);
}

function calculateMaandlast(hoofdsom: number, jaarRente: number, looptijdJaren: number): number {
  const r = jaarRente / 100 / 12;
  const n = looptijdJaren * 12;
  if (r === 0) return hoofdsom / n;
  return hoofdsom * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function gradeFromRange(value: number, a: number, b: number, c: number): Grade {
  if (value >= a) return "A";
  if (value >= b) return "B";
  if (value >= c) return "C";
  return "D";
}

function gradeDtiFromRange(value: number): Grade {
  if (value < 20) return "A";
  if (value < 28) return "B";
  if (value < 33) return "C";
  return "D";
}

function gradeToPercentage(grade: Grade): number {
  switch (grade) {
    case "A": return 95;
    case "B": return 78;
    case "C": return 55;
    case "D": return 25;
  }
}

export interface HypotheekReportResult {
  client: { naam: string; datum: string; referentie: string; land: string; regio: string; woningType: string };
  eindscore: { letter: Grade; percentage: number; label: string; toelichting: string };
  inkomen: {
    brutoJaarinkomenAanvrager1: number;
    brutoJaarinkomenAanvrager2: number;
    totaalBrutoJaarinkomen: number;
    nettoMaandinkomen: number;
    extraInkomsten: number;
    score: number;
    inkomenstypeGrade: Grade;
    inkomenstypeScore: number;
  };
  schulden: {
    bestaandeHypotheek: number;
    persoonlijkeLening: number;
    creditcardSchuld: number;
    totaalMaandlasten: number;
    dtiRatio: number;
    maxDtiSpanje: number;
    score: number;
    dtiGrade: Grade;
    vrijeMaandruimte: number;
    vrijeMaandruimteGrade: Grade;
  };
  hypotheek: {
    woningwaarde: number;
    maxLTV: number;
    maxHypotheekbedrag: number;
    gewensteHypotheek: number;
    looptijdJaren: number;
    rentepercentage: number;
    maandlast: number;
    totaalTerugteBetalen: number;
    totaalRente: number;
    score: number;
    maxHypotheekInkomen: number;
  };
  kosten: Array<{ omschrijving: string; bedrag: number }>;
  haalbaarheid: {
    eigenMiddelenNodig: number;
    eigenMiddelenBeschikbaar: number;
    verschil: number;
    dekkingspercentage: number;
    score: number;
    grade: Grade;
  };
  overwaarde: {
    tpikeeren: boolean;
    huidigeWoningWaarde: number;
    openstaandeHypotheek: number;
    overwaarde: number;
    inzetbaarVoorSpanje: number;
    score: number;
  } | null;
  aanbevelingen: string[];
  volgendeStappen: Array<{ stap: number; titel: string; beschrijving: string }>;
  faq: Array<{ vraag: string; antwoord: string }>;
}

export function generateHypotheekReport(data: HypotheekFormData): HypotheekReportResult {
  const isResident = data.plannen === "permanent";
  const maxLTV = isResident ? MAX_LTV_RESIDENT : MAX_LTV_NIET_RESIDENT;
  const provincieLabel = PROVINCIE_LABELS[data.provincie] || "Alicante";
  const woningTypeLabel = WONINGTYPE_LABELS[data.woningType] || "Bestaande woning";

  const effectieveRente = data.rentePercentage > 0
    ? data.rentePercentage
    : getDefaultRente(data.plannen, data.inkomenstype);

  const nettoFactor = getNettoFactor(data.landVanHerkomst);
  const partnerNetto = data.heeftCoAanvrager ? Math.round((data.partnerBrutoJaarinkomen * nettoFactor) / 12) : 0;
  const nettoMaandinkomen = Math.round((data.brutoJaarinkomen * nettoFactor) / 12) + partnerNetto;
  const totaalBrutoJaar = data.brutoJaarinkomen + (data.heeftCoAanvrager ? data.partnerBrutoJaarinkomen : 0);

  const totaalMaandlasten = data.woonlasten + data.overigeSchulden;
  const dtiRatio = nettoMaandinkomen > 0 ? Math.round((totaalMaandlasten / nettoMaandinkomen) * 100) : 0;
  const vrijeMaandruimte = Math.round(nettoMaandinkomen * (MAX_DTI / 100) - totaalMaandlasten);

  const looptijd = data.geboortejaar > 0 ? calculateMaxLooptijdFromYear(data.geboortejaar) : MAX_HYPOTHEEKDUUR;

  const maxHypotheekInkomen = vrijeMaandruimte > 0 ? Math.round(calculateAnnuity(vrijeMaandruimte, effectieveRente, looptijd)) : 0;

  const aankoopsom = data.heeftWoning ? data.aankoopsom : 0;
  const maxHypotheekWoning = Math.round(aankoopsom * (maxLTV / 100));

  const effectiefMax = aankoopsom > 0 ? Math.min(maxHypotheekInkomen, maxHypotheekWoning) : maxHypotheekInkomen;
  const gewensteHypotheek = aankoopsom > 0 ? maxHypotheekWoning : effectiefMax;

  const maandlast = effectiefMax > 0 ? Math.round(calculateMaandlast(effectiefMax, effectieveRente, looptijd)) : 0;
  const totaalTerugTeBetalen = Math.round(maandlast * looptijd * 12);
  const totaalRente = totaalTerugTeBetalen - effectiefMax;

  const belastingRegels = getBelastingPercentage(data.woningType, data.provincie);
  const belastingItems = belastingRegels.map((b) => ({
    omschrijving: b.label,
    bedrag: Math.round(aankoopsom * b.percentage / 100),
  }));
  const kostenItems = [
    ...belastingItems,
    { omschrijving: "Notariskosten", bedrag: 1800 },
    { omschrijving: "Kadasterkosten", bedrag: 900 },
    { omschrijving: "Advocaatkosten", bedrag: ADVOCAATKOSTEN },
    { omschrijving: "Taxatiekosten", bedrag: 450 },
    { omschrijving: "Bankkosten hypotheek", bedrag: BANKKOSTEN },
    { omschrijving: "Vertaalkosten", bedrag: 350 },
    { omschrijving: "NIE-nummer aanvraag", bedrag: 150 },
  ];

  const totaalKosten = kostenItems.reduce((sum, k) => sum + k.bedrag, 0);

  const eigenInbrengNodig = aankoopsom > 0 ? (aankoopsom - effectiefMax) + totaalKosten : 0;

  const overwaardeBedrag = data.heeftOverwaarde ? data.woningwaarde - data.openstaandeHypotheek : 0;
  const inzetbaar = data.heeftOverwaarde ? Math.min(overwaardeBedrag, data.eigenVermogen + overwaardeBedrag) : 0;
  const totaalBeschikbaar = data.eigenVermogen + (data.heeftOverwaarde ? inzetbaar : 0);

  const dekkingspercentage = eigenInbrengNodig > 0 ? Math.round((totaalBeschikbaar / eigenInbrengNodig) * 100) : (totaalBeschikbaar > 0 ? 200 : 0);

  const dtiGrade = gradeDtiFromRange(dtiRatio);
  const vrijeMaandruimteGrade = gradeFromRange(vrijeMaandruimte, 1500, 800, 350);
  const inkomenstypeGrade = getInkomenstypeGrade(data.inkomenstype);
  const maandinkomenGrade = gradeFromRange(nettoMaandinkomen, 5000, 3000, 2000);
  const haalbaarheidGrade = gradeFromRange(dekkingspercentage, 110, 100, 80);

  const hardeFail = vrijeMaandruimte < MIN_VRIJE_RUIMTE || dtiRatio > MAX_DTI;

  const scores = [
    gradeToPercentage(dtiGrade),
    gradeToPercentage(vrijeMaandruimteGrade),
    gradeToPercentage(inkomenstypeGrade),
    gradeToPercentage(maandinkomenGrade),
    gradeToPercentage(haalbaarheidGrade),
  ];
  let avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  if (hardeFail) avgScore = Math.min(avgScore, 25);

  const eindscoreLetter: Grade = hardeFail ? "D" : avgScore >= 85 ? "A" : avgScore >= 65 ? "B" : avgScore >= 45 ? "C" : "D";
  const labels: Record<Grade, string> = { A: "Uitstekend haalbaar", B: "Goed haalbaar", C: "Beperkt haalbaar", D: "Niet haalbaar" };

  const toelichtingen: Record<Grade, string> = {
    A: `Op basis van jullie financiële situatie is een hypotheek in Spanje uitstekend haalbaar. Het inkomen is ruim voldoende, de schuld-inkomensverhouding is gezond en er zijn voldoende eigen middelen beschikbaar.`,
    B: `Op basis van jullie financiële situatie is een hypotheek in Spanje goed haalbaar. Het gecombineerd inkomen is voldoende en de schuld-inkomensverhouding valt binnen de normen. Let op de bijkomende kosten (~12%) en zorg voor voldoende eigen middelen.`,
    C: `Een hypotheek in Spanje is beperkt haalbaar. Er zijn aandachtspunten bij het inkomen, de schuld-inkomensverhouding of de beschikbare eigen middelen. Overweeg de aankoopsom te verlagen of meer eigen vermogen in te brengen.`,
    D: `Op basis van de huidige financiële situatie is een hypotheek in Spanje niet haalbaar. ${vrijeMaandruimte < MIN_VRIJE_RUIMTE ? "De vrije maandruimte is onvoldoende (minimaal €350 vereist). " : ""}${dtiRatio > MAX_DTI ? "De schuld-inkomensverhouding overschrijdt de maximale 35%. " : ""}Neem contact op voor persoonlijk advies.`,
  };

  const referentie = `TI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;

  const result: HypotheekReportResult = {
    client: {
      naam: `${data.voornaam} ${data.achternaam}`.trim() || "Aanvrager",
      datum: new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }),
      referentie,
      land: "Spanje",
      regio: provincieLabel,
      woningType: woningTypeLabel,
    },
    eindscore: {
      letter: eindscoreLetter,
      percentage: avgScore,
      label: labels[eindscoreLetter],
      toelichting: toelichtingen[eindscoreLetter],
    },
    inkomen: {
      brutoJaarinkomenAanvrager1: data.brutoJaarinkomen,
      brutoJaarinkomenAanvrager2: data.heeftCoAanvrager ? data.partnerBrutoJaarinkomen : 0,
      totaalBrutoJaarinkomen: Math.round(totaalBrutoJaar),
      nettoMaandinkomen,
      extraInkomsten: 0,
      score: gradeToPercentage(maandinkomenGrade),
      inkomenstypeGrade,
      inkomenstypeScore: getInkomenstypeScore(data.inkomenstype),
    },
    schulden: {
      bestaandeHypotheek: data.woonlasten,
      persoonlijkeLening: 0,
      creditcardSchuld: 0,
      totaalMaandlasten,
      dtiRatio,
      maxDtiSpanje: MAX_DTI,
      score: gradeToPercentage(dtiGrade),
      dtiGrade,
      vrijeMaandruimte,
      vrijeMaandruimteGrade,
    },
    hypotheek: {
      woningwaarde: aankoopsom,
      maxLTV,
      maxHypotheekbedrag: effectiefMax,
      gewensteHypotheek,
      looptijdJaren: looptijd,
      rentepercentage: effectieveRente,
      maandlast,
      totaalTerugteBetalen: totaalTerugTeBetalen,
      totaalRente,
      score: gradeToPercentage(vrijeMaandruimteGrade),
      maxHypotheekInkomen,
    },
    kosten: aankoopsom > 0 ? kostenItems : [],
    haalbaarheid: {
      eigenMiddelenNodig: eigenInbrengNodig,
      eigenMiddelenBeschikbaar: totaalBeschikbaar,
      verschil: totaalBeschikbaar - eigenInbrengNodig,
      dekkingspercentage,
      score: gradeToPercentage(haalbaarheidGrade),
      grade: haalbaarheidGrade,
    },
    overwaarde: data.heeftOverwaarde ? {
      tpikeeren: true,
      huidigeWoningWaarde: data.woningwaarde,
      openstaandeHypotheek: data.openstaandeHypotheek,
      overwaarde: overwaardeBedrag,
      inzetbaarVoorSpanje: inzetbaar,
      score: gradeToPercentage(gradeFromRange(overwaardeBedrag, 200000, 100000, 50000)),
    } : null,
    aanbevelingen: [],
    volgendeStappen: [
      { stap: 1, titel: "NIE-nummer aanvragen", beschrijving: "Vraag een Spaans identificatienummer aan bij het consulaat of in Spanje zelf. Dit is verplicht voor elke vastgoedtransactie." },
      { stap: 2, titel: "Spaanse bankrekening openen", beschrijving: "Open een rekening bij een Spaanse bank voor de hypotheekbetalingen en nutsvoorzieningen." },
      { stap: 3, titel: "Advocaat inschakelen", beschrijving: "Schakel een onafhankelijke advocaat in die gespecialiseerd is in Spaans vastgoed en hypotheken." },
      { stap: 4, titel: "Hypotheekaanvraag indienen", beschrijving: "Dien de officiële hypotheekaanvraag in bij minimaal 2-3 Spaanse banken voor de beste voorwaarden." },
      { stap: 5, titel: "Taxatie laten uitvoeren", beschrijving: "Laat de woning taxeren door een door de bank goedgekeurde taxateur (tasador)." },
      { stap: 6, titel: "Koopcontract tekenen", beschrijving: "Onderteken het koopcontract (escritura) bij de notaris." },
    ],
    faq: [
      { vraag: "Hoeveel kan ik maximaal lenen als niet-resident in Spanje?", antwoord: `Als niet-resident kun je doorgaans maximaal ${MAX_LTV_NIET_RESIDENT}% van de taxatiewaarde of koopprijs lenen. Voor residenten kan dit oplopen tot ${MAX_LTV_RESIDENT}%. De overige ${100 - MAX_LTV_NIET_RESIDENT}% plus bijkomende kosten (~12%) moet je uit eigen middelen financieren.` },
      { vraag: "Welke documenten heb ik nodig voor een Spaanse hypotheek?", antwoord: "Je hebt nodig: paspoort, NIE-nummer, werkgeversverklaring, loonstroken (laatste 3 maanden), belastingaangiftes (laatste 2 jaar), bankafschriften (laatste 6 maanden), en eventueel een bestaand hypotheekoverzicht." },
      { vraag: "Hoe lang duurt het hypotheekproces in Spanje?", antwoord: "Het volledige proces duurt gemiddeld 6-8 weken vanaf de aanvraag tot de ondertekening bij de notaris. De voorlopige goedkeuring krijg je meestal binnen 2-3 weken." },
      { vraag: "Wat is de huidige hypotheekrente in Spanje?", antwoord: "De hypotheekrente voor niet-residenten varieert momenteel tussen 3,0% en 4,5% voor een vaste rente. Variabele rentes beginnen rond 2,5% + Euribor. De exacte rente hangt af van je profiel en de bank." },
      { vraag: "Moet ik een Spaanse bankrekening hebben?", antwoord: "Ja, een Spaanse bankrekening is verplicht voor de hypotheekbetalingen, belastingen en nutsvoorzieningen." },
    ],
  };

  result.aanbevelingen = generateAanbevelingen(data, result);
  return result;
}

function generateAanbevelingen(data: HypotheekFormData, r: HypotheekReportResult): string[] {
  if (r.eindscore.letter === "A" || r.eindscore.letter === "B") return [];

  const tips: string[] = [];
  const { schulden, haalbaarheid } = r;

  if (schulden.vrijeMaandruimte < MIN_VRIJE_RUIMTE) {
    const tekort = MIN_VRIJE_RUIMTE - schulden.vrijeMaandruimte;
    tips.push(`Verlaag uw maandelijkse lasten met €${tekort} om aan de minimale vrije ruimte van €${MIN_VRIJE_RUIMTE} te voldoen.`);
  }

  if (schulden.dtiRatio > MAX_DTI) {
    tips.push(`Uw schuld-inkomensverhouding is ${schulden.dtiRatio}%. Los €${Math.max(1, Math.ceil(Math.abs(schulden.totaalMaandlasten - r.inkomen.nettoMaandinkomen * MAX_DTI / 100)))}/maand aan schulden af om onder ${MAX_DTI}% te komen.`);
  }

  if (haalbaarheid.dekkingspercentage < 100 && haalbaarheid.eigenMiddelenNodig > 0) {
    const tekort = haalbaarheid.eigenMiddelenNodig - haalbaarheid.eigenMiddelenBeschikbaar;
    tips.push(`U heeft nog €${Math.round(tekort).toLocaleString("nl-NL")} aan eigen middelen nodig. Overweeg overwaarde uit uw huidige woning in te zetten.`);
  }

  if (data.inkomenstype === "zzp") {
    tips.push("Als ZZP'er kunt u uw kansen vergroten door minimaal 3 jaar jaarrekeningen te overleggen en een stabiel inkomen aan te tonen.");
  }

  return tips;
}
