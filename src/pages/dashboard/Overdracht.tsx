import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { usePortalArticles } from "@/hooks/usePortalArticles";
import { PortalArticleCard } from "@/components/PortalArticleCard";
import { Loader2, Calendar, MapPin, CheckCircle2, Circle, FileText, Download, AlertCircle, Clock, Building2, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, isPast } from "date-fns";
import { nl } from "date-fns/locale";

// Statuses that qualify for showing Overdracht content
const OVERDRACHT_STATUSES = ['notary_scheduled', 'completed'];

export default function Overdracht() {
  const { data: sale, isLoading } = useCustomerSale();
  const { data: portalArticles } = usePortalArticles("overdracht");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No active sale or not at overdracht phase yet
  if (!sale || !OVERDRACHT_STATUSES.includes(sale.status)) {
    return (
      <LockedPhaseContent
        phaseName="Overdracht"
        phaseNumber={5}
        title="Overdracht Planning"
        description="Deze sectie wordt beschikbaar tijdens het overdrachtproces van jouw woning."
        comingSoonFeatures={[
          "Planning van de notarisakte",
          "Checklist voor de overdracht",
          "Betaalinstructies en deadlines",
          "Contactgegevens notaris en betrokken partijen"
        ]}
        ctaText="Plan een oriëntatiegesprek"
        ctaLink="/afspraak"
      />
    );
  }

  const notaryDate = sale.notary_date ? new Date(sale.notary_date) : null;
  const daysUntilNotary = notaryDate ? differenceInDays(notaryDate, new Date()) : null;
  const isCompleted = sale.status === 'afgerond';
  const notaryPassed = notaryDate ? isPast(notaryDate) : false;

  // Filter documents for overdracht-related types
  const overdrachtDocuments = sale.documents.filter(doc => 
    ['legal', 'contract', 'financial'].includes(doc.document_type)
  );

  // Overdracht-related milestones (filter for relevant ones)
  const overdrachtMilestones = sale.milestones.filter(m => 
    m.title.toLowerCase().includes('notaris') ||
    m.title.toLowerCase().includes('overdracht') ||
    m.title.toLowerCase().includes('akte') ||
    m.title.toLowerCase().includes('betaling') ||
    m.title.toLowerCase().includes('sleutel')
  );

  const completedCount = overdrachtMilestones.filter(m => m.completed_at).length;
  const progressPercentage = overdrachtMilestones.length > 0 
    ? (completedCount / overdrachtMilestones.length) * 100 
    : 0;

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Overdracht</h1>
          <p className="text-muted-foreground mt-1">
            {sale.project?.name || 'Jouw woning'} · {sale.project?.city}
          </p>
        </div>

        {/* Countdown / Completed Card */}
        {isCompleted ? (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                Gefeliciteerd met je nieuwe woning!
              </h2>
              <p className="text-green-600 dark:text-green-500">
                De overdracht is succesvol afgerond
                {sale.completion_date && (
                  <> op {format(new Date(sale.completion_date), 'd MMMM yyyy', { locale: nl })}</>
                )}
              </p>
            </CardContent>
          </Card>
        ) : notaryDate ? (
          <Card className={notaryPassed ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" : "border-primary/20 bg-primary/5"}>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground uppercase tracking-wide text-sm mb-2">
                {notaryPassed ? 'Notarisdatum was' : 'Notarisdatum'}
              </p>
              <h2 className="text-3xl font-bold mb-1">
                {format(notaryDate, 'd MMMM yyyy', { locale: nl })}
              </h2>
              {!notaryPassed && daysUntilNotary !== null && (
                <div className="mt-4">
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {daysUntilNotary === 0 
                      ? 'Vandaag!' 
                      : daysUntilNotary === 1 
                        ? 'Nog 1 dag'
                        : `Nog ${daysUntilNotary} dagen`}
                  </Badge>
                </div>
              )}
              {notaryPassed && !isCompleted && (
                <p className="text-amber-600 dark:text-amber-400 mt-4 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Wachtend op bevestiging van afronding
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground">
                Notarisdatum nog niet gepland
              </h2>
              <p className="text-muted-foreground mt-2">
                We nemen contact met je op zodra de notarisdatum bekend is.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress & Checklist */}
        {overdrachtMilestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checklist Overdracht</CardTitle>
              <CardDescription>
                {completedCount} van {overdrachtMilestones.length} stappen afgerond
              </CardDescription>
              <Progress value={progressPercentage} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdrachtMilestones.map((milestone) => (
                  <div 
                    key={milestone.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      milestone.completed_at ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/50'
                    }`}
                  >
                    {milestone.completed_at ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.completed_at ? '' : 'text-muted-foreground'}`}>
                        {milestone.title}
                      </p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
                      )}
                      {milestone.completed_at ? (
                        <p className="text-xs text-green-600 mt-1">
                          Afgerond op {format(new Date(milestone.completed_at), 'd MMMM', { locale: nl })}
                        </p>
                      ) : milestone.target_date ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Streefdatum: {format(new Date(milestone.target_date), 'd MMMM', { locale: nl })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Practical Info - Dynamic from blog */}
        {portalArticles && portalArticles.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Praktische Informatie
              </CardTitle>
              <CardDescription>
                Handige artikelen voor de oplevering van jouw woning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {portalArticles.map((article) => (
                  <PortalArticleCard
                    key={article.id}
                    title={article.title}
                    slug={article.slug}
                    intro={article.intro}
                    category={article.category}
                    featured_image={article.featured_image}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Praktische Informatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Wat moet je meenemen naar de notaris?</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Geldig identiteitsbewijs (paspoort of ID-kaart)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    NIE-nummer (Spaans fiscaal nummer)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Bewijs van betaling / bankafschriften
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Spaans bankrekeningnummer voor domiciliëring nutsbedrijven
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {sale.customer_visible_notes && (
          <Card>
            <CardContent className="p-6">
              <h4 className="font-medium mb-2">Notities van Top Immo Spain</h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {sale.customer_visible_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {overdrachtDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documenten
              </CardTitle>
              <CardDescription>
                Belangrijke documenten voor de overdracht
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdrachtDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.file_name}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact CTA */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Vragen over de overdracht?</h3>
                <p className="text-muted-foreground">
                  We begeleiden je graag door het volledige proces.
                </p>
              </div>
              <Button asChild>
                <a href="/contact">Contact opnemen</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
