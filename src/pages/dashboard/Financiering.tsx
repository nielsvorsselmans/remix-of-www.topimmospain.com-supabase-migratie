import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, FileText, Calculator, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Financiering() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Financiering</h1>
        <p className="text-muted-foreground">
          Alles over je hypotheek en bankdocumenten
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Hypotheek in Spanje
            </CardTitle>
            <CardDescription>
              Informatie over je Spaanse hypotheek
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wil je een hypotheek afsluiten in Spanje? Wij werken samen met gespecialiseerde hypotheekadviseurs 
              die je kunnen helpen bij het verkrijgen van een Spaanse hypotheek onder gunstige voorwaarden.
            </p>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Belangrijke informatie</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maximaal 70% financiering voor niet-residenten</li>
                <li>• Vaste of variabele rente mogelijk</li>
                <li>• Looptijd tot 25 jaar (afhankelijk van leeftijd)</li>
                <li>• Minimaal inkomen van €2.500 netto per maand vereist</li>
              </ul>
            </div>

            <Button variant="outline" asChild>
              <Link to="/dashboard/calculators/lening">
                <Calculator className="h-4 w-4 mr-2" />
                Lening berekenen
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Bank Documenten
            </CardTitle>
            <CardDescription>
              Benodigde documenten voor je financiering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Voor een hypotheekaanvraag in Spanje zijn verschillende documenten nodig. 
              Hieronder vind je een overzicht van wat je moet verzamelen.
            </p>

            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-1">Identiteitsdocumenten</h4>
                <p className="text-xs text-muted-foreground">Paspoort, NIE (Número de Identificación de Extranjero)</p>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-1">Inkomensbewijzen</h4>
                <p className="text-xs text-muted-foreground">Loonstroken (laatste 3 maanden), arbeidscontract</p>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-1">Bankafschriften</h4>
                <p className="text-xs text-muted-foreground">Laatste 6 maanden van je hoofdrekening</p>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-1">Belastingaangifte</h4>
                <p className="text-xs text-muted-foreground">Laatste aangifte inkomstenbelasting</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Je contactpersoon bij Top Immo Spain kan je helpen bij het verzamelen en vertalen van deze documenten.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Calculator className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Financiële calculators</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Bereken je maandlasten, aankoopkosten en rendement met onze handige tools.
                </p>
                <Button asChild>
                  <Link to="/dashboard/calculators">
                    Naar calculators
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
