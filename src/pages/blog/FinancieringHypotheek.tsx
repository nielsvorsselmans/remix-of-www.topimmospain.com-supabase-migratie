import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DashboardBackLink } from "@/components/DashboardBackLink";
import { Calculator, TrendingUp, FileCheck, AlertCircle, CheckCircle2 } from "lucide-react";

const FinancieringHypotheek = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DashboardBackLink />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Financiering & Hypotheek
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Alles wat u moet weten over het financieren van uw Spaanse vastgoed
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Hypotheekmogelijkheden als Nederlander
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Als Nederlandse investeerder heeft u meerdere opties om uw vastgoedaankoop in Spanje 
            te financieren. Wij werken samen met gespecialiseerde hypotheekadviseurs die u door 
            het hele proces begeleiden.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card p-8 rounded-2xl border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Spaanse Hypotheek
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">60-70% financiering voor niet-ingezetenen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Variabele en vaste rentepercentages</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Looptijd tot 25 jaar</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Hypotheek gekoppeld aan Spaanse woning</span>
              </li>
            </ul>
            <div className="bg-accent/50 p-4 rounded-lg">
              <p className="text-sm text-foreground font-medium">
                Let op: Spaanse banken eisen vaak dat u een Spaanse bankrekening opent en 
                inkomensdocumentatie van de afgelopen jaren overlegt.
              </p>
            </div>
          </div>

          <div className="bg-card p-8 rounded-2xl border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              Nederlandse Hypotheek
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Hogere financiering mogelijk (tot 90%)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Bekende procedures en voorwaarden</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Mogelijk gunstiger rente</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Nederlandse taal en begeleiding</span>
              </li>
            </ul>
            <div className="bg-accent/50 p-4 rounded-lg">
              <p className="text-sm text-foreground font-medium">
                Let op: Niet alle Nederlandse banken financieren buitenlands vastgoed. 
                Wij werken met gespecialiseerde adviseurs die dit wel doen.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-10 rounded-2xl border border-border mb-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Kosten bij Hypotheekaanvraag
              </h2>
              <p className="text-muted-foreground">
                Naast de hypotheek zijn er diverse kosten waarmee u rekening moet houden
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-foreground mb-3">Eenmalige kosten:</h4>
              <ul className="space-y-2">
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxatiekosten</span>
                  <span className="font-medium text-foreground">€300-€500</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Notariskosten hypotheekakte</span>
                  <span className="font-medium text-foreground">€600-€1.200</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Inschrijving hypotheek</span>
                  <span className="font-medium text-foreground">€200-€400</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bankkosten/afsluitprovisie</span>
                  <span className="font-medium text-foreground">0,5-1% v/d lening</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-3">Doorlopende kosten:</h4>
              <ul className="space-y-2">
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maandelijkse aflossing</span>
                  <span className="font-medium text-foreground">Variabel</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Overlijdensrisicoverzekering</span>
                  <span className="font-medium text-foreground">Vaak verplicht</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Opstalverzekering</span>
                  <span className="font-medium text-foreground">Meestal verplicht</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-card p-10 rounded-2xl border border-border mb-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Belangrijke Aandachtspunten
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-bold text-foreground mb-2">Inkomenstoets</h4>
              <p className="text-muted-foreground">
                Banken toetsen uw inkomen streng. U moet aantonen dat u de maandelijkse lasten 
                kunt dragen, ook als de woning leegstaat. Huurinkomsten worden meestal maar 
                voor 70-80% meegeteld.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-bold text-foreground mb-2">Wisselkoersrisico</h4>
              <p className="text-muted-foreground">
                Bij een Nederlandse hypotheek voor Spaans vastgoed loopt u wisselkoersrisico. 
                Overweeg een hypotheek in euro's of gebruik financiële instrumenten om dit 
                risico af te dekken.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-bold text-foreground mb-2">Vervroegde aflossing</h4>
              <p className="text-muted-foreground">
                Let op de voorwaarden voor vervroegde aflossing. Spaanse banken rekenen vaak 
                een boete bij vervroegde aflossing, terwijl dit in Nederland vaak gunstiger 
                geregeld is.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-warm p-10 rounded-2xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Persoonlijk Hypotheekadvies
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Elke situatie is uniek. Wij werken samen met gespecialiseerde hypotheekadviseurs 
            die u kunnen helpen met het vinden van de beste financieringsoptie voor uw situatie. 
            Plan een vrijblijvend gesprek om uw mogelijkheden te bespreken.
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Plan een oriënterend gesprek
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FinancieringHypotheek;
