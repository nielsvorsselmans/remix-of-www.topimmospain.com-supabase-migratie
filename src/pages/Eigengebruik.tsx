import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

export default function Eigengebruik() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  const projectId = searchParams.get("project");

  return (
    <>
      <Helmet>
        <title>Kostenoverzicht | Viva Vastgoed</title>
        <meta name="description" content="Bekijk de totale aankoopkosten en jaarlijkse kosten voor je tweede verblijf in Spanje" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                Welkom{name ? `, ${name}` : ""}! 🏡
              </h1>
              <p className="text-xl text-muted-foreground">
                Je persoonlijke kostenoverzicht
              </p>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Totale Aankoopkosten & Jaarlijkse Kosten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-accent/10 rounded-lg p-6">
                  <p className="text-center text-muted-foreground">
                    🚧 Dit overzicht wordt binnenkort beschikbaar gesteld met:
                  </p>
                  <ul className="mt-4 space-y-2 text-muted-foreground">
                    <li>• Complete breakdown van aankoopkosten</li>
                    <li>• Notariskosten en belastingen</li>
                    <li>• Jaarlijkse vaste kosten (IBI, afvalwater, etc.)</li>
                    <li>• Gemeenschapskosten</li>
                    <li>• Onderhoudskosten inschatting</li>
                    <li>• Nutsvoorzieningen (gas, water, elektriciteit)</li>
                  </ul>
                </div>

                {email && (
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <p className="text-sm text-foreground">
                      ✉️ We hebben je gegevens ontvangen en sturen binnenkort een gedetailleerd overzicht naar <strong>{email}</strong>
                    </p>
                  </div>
                )}

                {projectId && (
                  <div className="text-sm text-muted-foreground">
                    <p>Project ID: {projectId}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Wat je Moet Weten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">💰</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Aankoopkosten</h3>
                      <p className="text-sm text-muted-foreground">In Spanje betaal je ongeveer 10-13% van de aankoopprijs aan extra kosten (belastingen, notaris, advocaat)</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">📅</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Jaarlijkse Kosten</h3>
                      <p className="text-sm text-muted-foreground">Reken op ongeveer €2.000-€4.000 per jaar aan vaste kosten (afhankelijk van de grootte en locatie)</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">🔑</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Sleutels-Op-De-Deur</h3>
                      <p className="text-sm text-muted-foreground">Wij begeleiden je van A tot Z zodat je zorgeloos kunt genieten van je tweede thuis in Spanje</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Volgende Stappen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Plan een oriëntatiegesprek</h3>
                      <p className="text-sm text-muted-foreground">Bespreek je wensen en mogelijkheden met onze experts</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Bekijk de aankoopgids</h3>
                      <p className="text-sm text-muted-foreground">Download onze gratis gids over kopen in Spanje</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Ontdek het Viva Portaal</h3>
                      <p className="text-sm text-muted-foreground">Krijg toegang tot exclusieve projecten en persoonlijk advies</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
