import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Scale, Landmark, Network, HeartHandshake, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProjectFunnelCTA } from "@/components/ProjectFunnelCTA";
import { useActivePartners } from "@/hooks/useActivePartners";

interface CategoryConfig {
  category: string;
  dbCategory: string;
  icon: any;
  intro: string;
}

const categoryConfigs: CategoryConfig[] = [
  {
    category: "Vastgoedpartners (Nederland & België)",
    dbCategory: "vastgoed_nl_be",
    icon: Building2,
    intro: "We werken samen met betrouwbare makelaars in Nederland en België die het eerste contactpunt kunnen zijn voor wie zich oriënteert. Zij delen onze waarden van rust, begeleiding en transparantie, en helpen klanten zich voor te bereiden met lokale gesprekken voordat ze de stap naar Spanje zetten.",
  },
  {
    category: "Hypotheekpartners (Nederland & België)",
    dbCategory: "hypotheek_nl_be",
    icon: Landmark,
    intro: "Financiering vraagt expertise. We werken samen met hypotheekadviseurs in Nederland en België die je helpen je financiële mogelijkheden helder te krijgen. Dit versnelt de voorbereiding op een eventuele Spaanse hypotheek en zorgt voor een veilig en duidelijk proces.",
  },
  {
    category: "Juridische Partner: Confianz Advocaten",
    dbCategory: "juridisch",
    icon: Scale,
    intro: "Een advocaat is essentieel bij een Spaanse vastgoedaankoop. Confianz Advocaten is ons juridische ankerpunt: Nederlandstalig, meer dan 20 jaar ervaring, en volledig transparant. Zij voeren alle juridische checks uit, begeleiden de NIE-aanvraag, volmacht en notarisafspraken. We werken uitsluitend met betrouwbare advocaten die onze waarden delen.",
  },
  {
    category: "Spaanse Hypotheekpartner: HABENO",
    dbCategory: "hypotheek_spanje",
    icon: HeartHandshake,
    intro: "Spaanse financiering vraagt specialistische kennis. HABENO kent de Spaanse markt door en door en helpt klanten met bankdossiers, taxaties en voorwaarden. Ze werken aanvullend op de Nederlandse en Belgische hypotheekadviseurs en verhogen de kans op goedkeuring aanzienlijk.",
  },
];

export default function Partners() {
  const { data: partners = [], isLoading: loading } = useActivePartners();

  const getPartnersByCategory = (dbCategory: string) => {
    return partners.filter((partner) => partner.category === dbCategory);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Partners</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <section className="relative pb-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Onze Partners
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Ons netwerk van gespecialiseerde partners ondersteunt je in elk onderdeel van jouw vastgoedreis. Van juridisch advies en financiering tot lokale expertise – samen zorgen we voor een volledig A-tot-Z traject waarin jij centraal staat.
            </p>
            <p className="text-lg text-muted-foreground">
              Dit netwerk is niet toevallig ontstaan. Het is gebouwd op vertrouwen, ervaring en gedeelde waarden. Elke partner is geselecteerd omdat ze dezelfde missie delen als wij: heldere, zorgeloze begeleiding voor klanten die het verdienen.
            </p>
          </div>
        </div>
      </section>

      {/* Ons netwerk is jouw zekerheid */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Network className="h-10 w-10 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">
                Ons netwerk is jouw zekerheid
              </h2>
            </div>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Ons partnernetwerk is gebouwd op vertrouwen, transparantie en bewezen samenwerking. Elke partner is zorgvuldig geselecteerd op basis van expertise, betrouwbaarheid en de manier waarop ze met klanten omgaan.
              </p>
              <p>
                Dit netwerk stelt ons in staat om een volledig A-tot-Z traject aan te bieden: van de eerste oriëntatie in Nederland of België, via juridische controles en financiering, tot de sleuteloverdracht in Spanje. Elk onderdeel wordt gedragen door professionals die weten wat ze doen.
              </p>
              <p>
                Voor jou betekent dit: rust, duidelijkheid en de zekerheid dat je wordt omringd door mensen die jouw belang vooropstellen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading ? (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Partner Categories */}
          {categoryConfigs.map((config, idx) => {
            const categoryPartners = getPartnersByCategory(config.dbCategory);
            const Icon = config.icon;

            if (categoryPartners.length === 0) return null;

            return (
              <section
                key={config.dbCategory}
                className={idx % 2 === 0 ? "py-16 bg-muted/30" : "py-16 bg-background"}
              >
                <div className="container mx-auto px-4">
                  <div className="max-w-6xl mx-auto">
                    {/* Category Header */}
                    <div className="mb-12">
                      <div className="flex items-center gap-4 mb-6">
                        <Icon className="h-10 w-10 text-primary" />
                        <h2 className="text-3xl font-bold text-foreground">
                          {config.category}
                        </h2>
                      </div>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {config.intro}
                      </p>
                    </div>

                      {/* Partners Grid */}
                      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {categoryPartners.map((partner) => (
                          <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <CardTitle className="text-xl">{partner.company}</CardTitle>
                              <CardDescription className="text-base font-medium">
                                {partner.name}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-primary mb-2">
                                  {partner.role}
                                </p>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {partner.bio}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {partner.description}
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 pt-2">
                                {partner.website && (
                                  <Button asChild variant="outline" size="sm">
                                    <a href={partner.website} target="_blank" rel="noopener noreferrer">
                                      Website
                                    </a>
                                  </Button>
                                )}
                                {partner.email && (
                                  <Button asChild variant="outline" size="sm">
                                    <a href={`mailto:${partner.email}`}>
                                      Email
                                    </a>
                                  </Button>
                                )}
                                {partner.phone && (
                                  <Button asChild variant="outline" size="sm">
                                    <a href={`tel:${partner.phone}`}>
                                      Bel
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

          {/* CTA Sections */}
          <ProjectFunnelCTA />
        </>
      )}

      <Footer />
    </div>
  );
}
