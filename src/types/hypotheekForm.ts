export type Plannen = "vakantiewoning" | "permanent";
export type Inkomenstype = "loondienst" | "zzp" | "pensioen" | "geen";
export type AankoopStatus = "orienterend" | "actief_zoekend" | "woning_gevonden" | "bod_uitgebracht";
export type Provincie = "alicante" | "valencia" | "murcia";
export type WoningType = "nieuwbouw" | "bestaand";
export type BurgerlijkeStaat = "alleenstaand" | "getrouwd" | "samenwonend" | "gescheiden";

export interface HypotheekFormData {
  // Stap 1: Persoonlijke gegevens
  voornaam: string;
  achternaam: string;
  geboortejaar: number;
  landVanHerkomst: string;
  plannen: Plannen;

  // Stap 2: Inkomen + co-aanvrager
  burgerlijkeStaat: BurgerlijkeStaat;
  inkomenstype: Inkomenstype;
  brutoJaarinkomen: number;
  heeftCoAanvrager: boolean;
  partnerBrutoJaarinkomen: number;

  // Stap 3: Financiën
  eigenVermogen: number;
  woonlasten: number;
  overigeSchulden: number;
  heeftOverwaarde: boolean;
  woningwaarde: number;
  openstaandeHypotheek: number;

  // Stap 4: Woning in Spanje
  provincie: Provincie;
  woningType: WoningType;
  heeftWoning: boolean;
  aankoopsom: number;
  rentePercentage: number; // 0 = automatisch

  // Stap 5: Contact
  email: string;
  telefoonLandcode: string;
  telefoon: string;
  akkoordVoorwaarden: boolean;
}

export const initialHypotheekFormData: HypotheekFormData = {
  voornaam: "",
  achternaam: "",
  geboortejaar: 0,
  landVanHerkomst: "nederland",
  plannen: "vakantiewoning",
  burgerlijkeStaat: "alleenstaand",
  inkomenstype: "loondienst",
  brutoJaarinkomen: 0,
  heeftCoAanvrager: false,
  partnerBrutoJaarinkomen: 0,
  eigenVermogen: 0,
  woonlasten: 0,
  overigeSchulden: 0,
  heeftOverwaarde: false,
  woningwaarde: 0,
  openstaandeHypotheek: 0,
  provincie: "alicante",
  woningType: "bestaand",
  heeftWoning: false,
  aankoopsom: 0,
  rentePercentage: 0,
  email: "",
  telefoonLandcode: "+31",
  telefoon: "",
  akkoordVoorwaarden: false,
};
