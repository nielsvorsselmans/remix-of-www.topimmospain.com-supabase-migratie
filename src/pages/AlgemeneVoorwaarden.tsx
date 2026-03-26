import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const AlgemeneVoorwaarden = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Algemene Voorwaarden
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">1. Toepasselijkheid</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, diensten en overeenkomsten 
              van Top Immo Spain S.L. (B21899299), gevestigd te Calle Pable Picasso 1, planta 2, 03189 Orihuela Costa, Spanje, 
              en met kantoor in België te Handelslei 156, 2980 Zoersel. Door gebruik te maken van onze diensten, gaat u akkoord met deze voorwaarden.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm italic">
              Top Immo Spain is erkend als vastgoedmakelaar-bemiddelaar met BIV nr. 501 604 (land van erkenning: België) 
              en beschikt over een beroepsaansprakelijkheidsverzekering en financiële borgstelling via NV AXA Belgium 
              (polisnummer 730.390.160). RAICV 4482. BTW: BE 0475.175.581.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">2. Onze diensten</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Top Immo Spain biedt de volgende diensten aan:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Oriëntatiebegeleiding voor vastgoedinvesteringen in Spanje</li>
              <li>Vastgoedselectie en -presentatie</li>
              <li>Organisatie van bezichtigingen</li>
              <li>Juridische begeleiding bij aankoop</li>
              <li>Ondersteuning bij hypotheekaanvragen</li>
              <li>Verhuurbeheer en onderhoud</li>
              <li>Toegang tot het Viva Vastgoed Portaal</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Wij zijn een adviserende partij en fungeren als intermediair tussen u en eigenaren, ontwikkelaars 
              of andere partijen in Spanje.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">3. Totstandkoming van de overeenkomst</h2>
            <p className="text-muted-foreground leading-relaxed">
              Een overeenkomst komt tot stand wanneer u schriftelijk (per e-mail of via het portaal) toestemming 
              geeft voor onze dienstverlening en wij dit schriftelijk bevestigen. Voor het aankooptraject wordt 
              een aparte bemiddelingsovereenkomst opgesteld.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">4. Prijzen en betalingen</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Alle genoemde prijzen zijn indicatief en onder voorbehoud, tenzij anders vermeld. Voor vastgoed 
              gelden de prijzen zoals vermeld door de eigenaar of ontwikkelaar. Onze bemiddelingskosten worden 
              vooraf schriftelijk afgesproken.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Betalingen dienen te worden voldaan binnen de overeengekomen termijn. Bij te late betaling kunnen 
              wij wettelijke rente in rekening brengen.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">5. Verplichtingen van de klant</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Als klant bent u verplicht om:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Correcte en volledige informatie te verstrekken</li>
              <li>Tijdig benodigde documenten aan te leveren</li>
              <li>Zich te houden aan afspraken en deadlines</li>
              <li>Overeengekomen betalingen tijdig te voldoen</li>
              <li>Ons te informeren over relevante wijzigingen in uw situatie</li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">6. Onze verplichtingen en aansprakelijkheid</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Wij spannen ons maximaal in om u van kwalitatieve dienstverlening te voorzien. Echter:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Wij kunnen geen garanties geven over waardeontwikkeling of huurinkomsten</li>
              <li>Wij zijn niet aansprakelijk voor beslissingen van derden (notarissen, banken, overheden)</li>
              <li>Wij adviseren altijd onafhankig juridisch advies in te winnen bij grote transacties</li>
              <li>Onze aansprakelijkheid is beperkt tot het bedrag dat door onze verzekering wordt gedekt</li>
              <li>Wij zijn niet aansprakelijk voor indirecte schade of gevolgschade</li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">7. Intellectueel eigendom</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alle inhoud op onze website en in het Viva Vastgoed Portaal, inclusief teksten, afbeeldingen, 
              logo's en software, is eigendom van Top Immo Spain of haar licentiegevers. Het is niet toegestaan 
              om deze zonder schriftelijke toestemming te gebruiken, te kopiëren of te verspreiden.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">8. Beëindiging van de overeenkomst</h2>
            <p className="text-muted-foreground leading-relaxed">
              Beide partijen kunnen de overeenkomst beëindigen conform de afspraken in de bemiddelingsovereenkomst. 
              Bij vroegtijdige beëindiging door de klant kunnen reeds gemaakte kosten in rekening worden gebracht.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">9. Klachten en geschillen</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Bent u niet tevreden over onze dienstverlening? Wij stellen het op prijs als u dit zo snel mogelijk 
              met ons bespreekt via info@topimmospain.com. Wij zullen ons best doen om tot een oplossing te komen.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Als erkend vastgoedmakelaar zijn wij onderhevig aan de plichtenleer van de vastgoedmakelaar en 
              vallen onder het toezicht van het Beroepsinstituut van Vastgoedmakelaars (Luxemburgstraat 16B, 1000 Brussel). 
              U kunt bij een geschil ook contact opnemen met deze toezichthoudende autoriteit.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">10. Toepasselijk recht en geschillen</h2>
            <p className="text-muted-foreground leading-relaxed">
              Op alle overeenkomsten tussen Top Immo Spain en de klant is Nederlands recht van toepassing, 
              tenzij anders overeengekomen. Geschillen zullen bij voorkeur in onderling overleg worden opgelost. 
              Indien dit niet mogelijk is, zal het geschil worden voorgelegd aan de bevoegde rechter.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">11. Wijzigingen</h2>
            <p className="text-muted-foreground leading-relaxed">
              Top Immo Spain behoudt zich het recht voor deze algemene voorwaarden te wijzigen. De meest recente 
              versie is altijd te vinden op onze website. Wij zullen u van belangrijke wijzigingen op de hoogte 
              stellen.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">12. Contact</h2>
            <div className="p-6 bg-secondary/30 rounded-xl space-y-2">
              <p className="text-foreground font-medium text-lg mb-3">Top Immo Spain S.L.</p>
              <p className="text-muted-foreground"><strong>E-mail:</strong> info@topimmospain.com</p>
              <p className="text-muted-foreground"><strong>Telefoon:</strong> +32 468 13 29 03</p>
              <p className="text-muted-foreground"><strong>Spanje:</strong> Calle Pable Picasso 1, planta 2, 03189 Orihuela Costa</p>
              <p className="text-muted-foreground"><strong>België:</strong> Handelslei 156, 2980 Zoersel</p>
              <p className="text-muted-foreground text-sm mt-4"><strong>Bedrijfsgegevens:</strong></p>
              <p className="text-muted-foreground text-sm">Top Immo Spain S.L. B21899299 | RAICV 4482</p>
              <p className="text-muted-foreground text-sm">BTW: BE 0475.175.581</p>
              <p className="text-muted-foreground text-sm">Vastgoedmakelaar-bemiddelaar BIV nr. 501 604</p>
              <p className="text-muted-foreground text-sm">Openingsuren: steeds op afspraak</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AlgemeneVoorwaarden;
