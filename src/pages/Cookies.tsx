import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getCookieConsent, setCookieConsent } from "@/lib/tracking";

const Cookies = () => {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    setConsent(getCookieConsent());
  }, []);

  const handleToggleConsent = () => {
    const newConsent = consent === "accepted" ? "declined" : "accepted";
    setCookieConsent(newConsent);
    setConsent(newConsent);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Cookiebeleid
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">1. Wat zijn cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies zijn kleine tekstbestanden die worden opgeslagen op uw computer, tablet of smartphone wanneer 
              u onze website bezoekt. Deze cookies helpen ons om de website beter te laten functioneren en uw 
              gebruikservaring te verbeteren.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">2. Welke cookies gebruiken wij?</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-card rounded-xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-3">Functionele cookies (noodzakelijk)</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Deze cookies zijn essentieel voor het goed functioneren van onze website. Zonder deze cookies 
                  kan de website niet goed werken.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                  <li>Sessie-cookies voor inloggen op het Viva Vastgoed Portaal</li>
                  <li>Beveiligingscookies</li>
                  <li>Voorkeursinstellingen (taal, formuliergegevens)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Bewaartermijn: Sessie of maximaal 1 jaar
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-3">Analytische cookies</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Deze cookies helpen ons te begrijpen hoe bezoekers onze website gebruiken, zodat wij deze kunnen 
                  verbeteren. Alle verzamelde gegevens zijn geanonimiseerd.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                  <li>Google Analytics (geanonimiseerd)</li>
                  <li>Aantal bezoekers en paginaweergaven</li>
                  <li>Populairste pagina's en zoekgedrag</li>
                  <li>Apparaatinformatie (desktop/mobiel)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Bewaartermijn: Maximaal 2 jaar
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-3">Marketing cookies</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Deze cookies worden gebruikt om advertenties relevanter te maken voor u en uw interesses. 
                  Deze cookies plaatsen wij alleen met uw toestemming.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                  <li>Social media cookies (Facebook, Instagram, LinkedIn)</li>
                  <li>Retargeting cookies</li>
                  <li>Conversie tracking</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Bewaartermijn: Maximaal 1 jaar
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">3. Cookies van derden</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Op onze website maken wij gebruik van diensten van derden, zoals:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Google Analytics:</strong> Voor websitestatistieken (geanonimiseerd)</li>
              <li><strong>Social Media:</strong> Voor het delen van content op Facebook, Instagram en LinkedIn</li>
              <li><strong>YouTube:</strong> Voor het tonen van informatieve video's</li>
              <li><strong>Google Maps:</strong> Voor locatie-informatie van vastgoed</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Deze partijen kunnen cookies plaatsen op uw apparaat. Wij hebben hier geen controle over. 
              Raadpleeg de privacyverklaringen van deze partijen voor meer informatie.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">4. Cookies beheren</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              U kunt cookies op verschillende manieren beheren:
            </p>
            
            <div className="space-y-4">
              <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-bold text-foreground mb-3 text-lg">Uw huidige voorkeur</h4>
                {consent ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-4">
                      U heeft cookies momenteel <strong>{consent === "accepted" ? "geaccepteerd" : "geweigerd"}</strong>.
                      {consent === "declined" && " Dit betekent dat wij geen analytische cookies plaatsen en uw bezoek niet tracken."}
                      {consent === "accepted" && " Wij kunnen uw websitegebruik analyseren om onze diensten te verbeteren."}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleToggleConsent}
                      className="hover-scale"
                    >
                      {consent === "accepted" ? "Cookies weigeren" : "Cookies accepteren"}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    U heeft nog geen keuze gemaakt. Bij uw eerste bezoek verschijnt een cookiebanner.
                  </p>
                )}
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-bold text-foreground mb-2">Via onze website</h4>
                <p className="text-muted-foreground text-sm">
                  Bij uw eerste bezoek krijgt u een cookiebanner te zien waarin u uw voorkeuren kunt instellen. 
                  U kunt deze instellingen later altijd wijzigen via de sectie hierboven.
                </p>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-bold text-foreground mb-2">Via uw browser</h4>
                <p className="text-muted-foreground text-sm">
                  De meeste browsers accepteren automatisch cookies, maar u kunt uw browserinstellingen meestal 
                  aanpassen om cookies te weigeren of te verwijderen. Let op: als u cookies uitschakelt, 
                  werken sommige delen van onze website mogelijk niet goed.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">5. Cookies uitschakelen per browser</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong>Google Chrome:</strong> Menu → Instellingen → Privacy en beveiliging → Cookies en andere sitegegevens
              </p>
              <p>
                <strong>Mozilla Firefox:</strong> Menu → Opties → Privacy en beveiliging → Cookies en sitegegevens
              </p>
              <p>
                <strong>Safari:</strong> Voorkeuren → Privacy → Cookies en websitegegevens
              </p>
              <p>
                <strong>Microsoft Edge:</strong> Menu → Instellingen → Cookies en sitemachtigingen
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">6. Wijzigingen in dit cookiebeleid</h2>
            <p className="text-muted-foreground leading-relaxed">
              Wij kunnen dit cookiebeleid van tijd tot tijd aanpassen. De meest recente versie is altijd te 
              vinden op deze pagina. Wij raden u aan regelmatig deze pagina te raadplegen.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">7. Vragen?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Heeft u vragen over ons cookiebeleid? Neem dan contact met ons op:
            </p>
            <div className="p-6 bg-secondary/30 rounded-xl space-y-2">
              <p className="text-foreground font-medium text-lg mb-3">Top Immo Spain S.L.</p>
              <p className="text-muted-foreground"><strong>E-mail:</strong> info@topimmospain.com</p>
              <p className="text-muted-foreground"><strong>Telefoon:</strong> +32 468 13 29 03</p>
              <p className="text-muted-foreground"><strong>Spanje:</strong> Calle Pable Picasso 1, planta 2, 03189 Orihuela Costa</p>
              <p className="text-muted-foreground"><strong>België:</strong> Handelslei 156, 2980 Zoersel</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Cookies;
