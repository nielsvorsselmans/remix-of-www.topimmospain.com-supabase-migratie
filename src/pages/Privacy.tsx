import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Privacybeleid
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">1. Inleiding</h2>
            <p className="text-muted-foreground leading-relaxed">
              Top Immo Spain hecht veel waarde aan de bescherming van uw persoonsgegevens. In dit privacybeleid 
              leggen wij uit welke persoonsgegevens wij verzamelen, waarom wij deze verzamelen en hoe wij deze 
              gebruiken. Dit privacybeleid is van toepassing op alle diensten die wij aanbieden.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">2. Welke gegevens verzamelen wij?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Wij kunnen de volgende persoonsgegevens van u verzamelen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Voor- en achternaam</li>
              <li>E-mailadres</li>
              <li>Telefoonnummer</li>
              <li>Adresgegevens</li>
              <li>Geboortedatum en nationaliteit</li>
              <li>Financiële informatie (voor hypotheekaanvragen)</li>
              <li>Voorkeuren voor vastgoedinvesteringen</li>
              <li>Communicatie met onze adviseurs</li>
              <li>IP-adres en browsergegevens (voor websitegebruik)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">3. Waarom verzamelen wij deze gegevens?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Wij gebruiken uw persoonsgegevens voor de volgende doeleinden:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Het leveren van onze diensten en begeleiding bij vastgoedinvesteringen</li>
              <li>Het verstrekken van informatie over beschikbare woningen</li>
              <li>Het ondersteunen van het aankoopproces en juridische trajecten</li>
              <li>Het contacteren over uw aanvraag of vragen</li>
              <li>Het verbeteren van onze website en diensten</li>
              <li>Het voldoen aan wettelijke verplichtingen</li>
              <li>Het versturen van nieuwsbrieven (alleen met uw toestemming)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">4. Hoe lang bewaren wij uw gegevens?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk is voor de doeleinden waarvoor zij 
              zijn verzameld. Voor klanten die vastgoed via ons hebben aangekocht, bewaren wij gegevens gedurende 
              7 jaar na afloop van de dienstverlening, conform wettelijke verplichtingen. Voor oriëntatieaanvragen 
              zonder vervolgtraject bewaren wij gegevens maximaal 2 jaar.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">5. Delen wij uw gegevens met derden?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Wij verstrekken uw persoonsgegevens alleen aan derden indien dit noodzakelijk is voor de uitvoering 
              van onze diensten of als wij hiertoe wettelijk verplicht zijn. Dit kunnen zijn:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Notarissen en advocaten in Spanje</li>
              <li>Hypotheekadviseurs</li>
              <li>Verhuurbeheerders</li>
              <li>IT-dienstverleners</li>
              <li>Overheidsinstanties (indien wettelijk verplicht)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Wij verkopen uw gegevens nooit aan derden voor marketingdoeleinden.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">6. Uw rechten</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              U heeft de volgende rechten met betrekking tot uw persoonsgegevens:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Recht op inzage in uw gegevens</li>
              <li>Recht op rectificatie van onjuiste gegevens</li>
              <li>Recht op verwijdering van uw gegevens</li>
              <li>Recht op beperking van de verwerking</li>
              <li>Recht op gegevensoverdracht</li>
              <li>Recht van bezwaar tegen verwerking</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Om gebruik te maken van deze rechten, kunt u contact met ons opnemen via info@topimmospain.com.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">7. Beveiliging</h2>
            <p className="text-muted-foreground leading-relaxed">
              Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen 
              tegen verlies, ongeautoriseerde toegang, wijziging en openbaarmaking. Toegang tot uw gegevens is 
              beperkt tot medewerkers die deze nodig hebben voor hun werkzaamheden.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">8. Wijzigingen in dit privacybeleid</h2>
            <p className="text-muted-foreground leading-relaxed">
              Wij behouden ons het recht voor om dit privacybeleid aan te passen. De meest recente versie is 
              altijd te vinden op onze website. Wij raden u aan regelmatig te controleren of er wijzigingen zijn.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Heeft u vragen over dit privacybeleid of over hoe wij omgaan met uw persoonsgegevens? 
              Neem dan contact met ons op:
            </p>
            <div className="mt-4 p-6 bg-secondary/30 rounded-xl space-y-2">
              <p className="text-foreground font-medium text-lg mb-3">Top Immo Spain S.L.</p>
              <p className="text-muted-foreground"><strong>E-mail:</strong> info@topimmospain.com</p>
              <p className="text-muted-foreground"><strong>Telefoon:</strong> +32 468 13 29 03</p>
              <p className="text-muted-foreground"><strong>Spanje:</strong> Calle Pable Picasso 1, planta 2, 03189 Orihuela Costa</p>
              <p className="text-muted-foreground"><strong>België:</strong> Handelslei 156, 2980 Zoersel</p>
              <p className="text-muted-foreground text-sm mt-3">BTW: BE 0475.175.581 | BIV nr. 501 604</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
