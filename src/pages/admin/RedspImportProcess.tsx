import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, CheckCircle2, Code, Database, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";


export default function RedspImportProcess() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/process-documentation")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar Proces Overzicht
              </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">RedSP Property Import Proces</h1>
          <Badge variant="default">Actief</Badge>
        </div>
        <p className="text-muted-foreground">
          Complete proces documentatie voor het importeren van vastgoeddata vanuit RedSP XML feed
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Laatst bijgewerkt: 14 december 2024
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="steps">Stappen</TabsTrigger>
          <TabsTrigger value="technical">Technisch</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proces Overzicht</CardTitle>
              <CardDescription>
                Doel en werking van het RedSP property import systeem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Doel</h3>
                <p className="text-sm text-muted-foreground">
                  Het RedSP import proces synchroniseert vastgoeddata van de RedSP XML feed naar de database 
                  in een 3-staps architectuur: eerst metadata ophalen, dan properties batch-gewijs importeren, 
                  en tot slot properties automatisch linken aan projecten.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">Frequentie</div>
                  <div className="text-sm text-muted-foreground">Handmatig via Admin UI</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">Verantwoordelijk</div>
                  <div className="text-sm text-muted-foreground">Admin team (Properties.tsx)</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">Resultaat</div>
                  <div className="text-sm text-muted-foreground">~1149 properties / ~549 projecten</div>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>4-Staps Architectuur</AlertTitle>
                <AlertDescription>
                  Het sync proces is opgesplitst in 4 aparte edge functions voor betere performance en 
                  betrouwbaarheid: prepare (metadata), properties (batch upsert), link-projects (project linking),
                  en check-sold-properties (24-uur grace period voor sold-marking).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Proces Flow Diagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-6 rounded-lg overflow-x-auto">
                <pre className="text-xs">
{`┌─────────────────────────────────────────────────────────────────────┐
│                     RedSP Property Import Proces                    │
│                       (4-Staps Architectuur)                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Admin UI   │  (Properties.tsx - handmatig starten)
│  "Start Sync"│
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────┐
│ STAP 1: sync-redsp-prepare                                   │
│ ├─ Download XML (34MB, ~1149 properties)                     │
│ ├─ Parse en tel properties                                   │
│ ├─ Maak sync_log entry aan (status: 'running')               │
│ └─ Return: syncLogId, totalProperties, totalBatches          │
└──────┬───────────────────────────────────────────────────────┘
       │
       ↓ (loop: x12 batches van 100 properties)
┌──────────────────────────────────────────────────────────────┐
│ STAP 2: sync-redsp-properties (per batch)                    │
│ ├─ Download XML (CDN cached)                                 │
│ ├─ Slice batch: properties[offset..offset+limit]             │
│ ├─ Transform XML → database format                           │
│ └─ Upsert properties (onConflict: api_id)                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       ↓ (na ALLE batches voltooid)
┌──────────────────────────────────────────────────────────────┐
│ STAP 3: sync-redsp-link-projects                             │
│ ├─ Query unlinked properties (project_id IS NULL)            │
│ ├─ Groepeer per development_id                               │
│ ├─ Zoek/maak project (development_ref match)                 │
│ ├─ Update project metadata (prijzen, types, count)           │
│ └─ Link properties aan project_id                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────┐
│ STAP 4: check-sold-properties (24-uur grace period)          │
│ ├─ Vergelijk XML met database                                │
│ ├─ Nieuw missend → pending_sold_at = now()                   │
│ ├─ >24u missend → status = 'sold'                            │
│ ├─ Terug in XML → reset pending_sold_at                      │
│ └─ Update project status (sold_out als alles sold)           │
└──────┬───────────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────┐
│ Resultaat                               │
│ • ~1149 properties gesynchroniseerd     │
│ • ~549 projecten gelinkt                │
│ • Statistieken in sync_logs             │
└─────────────────────────────────────────┘`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step1">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 1</Badge>
                  <span>sync-redsp-prepare: Metadata Ophalen</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    De prepare function downloadt de complete XML, telt het aantal properties, 
                    maakt een sync_log entry aan, en berekent hoeveel batches nodig zijn.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Output</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm font-mono">
                    <p>syncLogId: UUID (voor tracking)</p>
                    <p>totalProperties: number (~1149)</p>
                    <p>totalBatches: number (~12 bij batch size 100)</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 2</Badge>
                  <span>sync-redsp-properties: Batch Upsert</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Voor elke batch van 100 properties wordt de XML gedownload (CDN cached), 
                    de juiste slice genomen, en properties ge-upsert naar de database.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Parameters</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm font-mono">
                    <p>offset: number (start positie, bijv. 0, 100, 200...)</p>
                    <p>limit: number (batch grootte, default 100)</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Upsert Logica</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Gebruikt <code className="bg-background px-1 py-0.5 rounded">api_id</code> als onConflict key</li>
                      <li>Bestaande properties worden geüpdatet</li>
                      <li>Nieuwe properties worden toegevoegd</li>
                      <li>project_id wordt NIET overschreven (behoud bestaande link)</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Geen mark_sold meer</AlertTitle>
                  <AlertDescription>
                    De sold-marking logica is verplaatst naar een aparte stap (check-sold-properties) 
                    met een 24-uur grace period voor meer betrouwbaarheid.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 3</Badge>
                  <span>sync-redsp-link-projects: Project Linking</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Na alle batches worden ongelinkte properties (project_id IS NULL) 
                    automatisch gelinkt aan bestaande of nieuwe projecten.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Project Matching Logica</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p>1. Query alle unieke development_ids waar project_id IS NULL</p>
                    <p>2. Per development_id: zoek project via development_ref</p>
                    <p>3. Als gevonden → link properties aan bestaand project</p>
                    <p>4. Als niet gevonden → maak nieuw project aan</p>
                    <p>5. Update project metadata (price_from, price_to, property_types, etc.)</p>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Aparte Edge Function</AlertTitle>
                  <AlertDescription>
                    Project linking is verplaatst naar een aparte edge function om CPU time limits 
                    te voorkomen. Dit wordt automatisch aangeroepen door Properties.tsx na alle batches.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 4</Badge>
                  <span>check-sold-properties: Sold Check (24u Grace Period)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Deze functie controleert welke properties niet meer in de XML voorkomen en markeert 
                    ze als sold, maar pas na een 24-uur grace period om false positives te voorkomen.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Grace Period Logica</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                    <p><strong>Nieuw missend:</strong> pending_sold_at = now()</p>
                    <p><strong>{'>'} 24 uur missend:</strong> status → 'sold'</p>
                    <p><strong>Terug in XML:</strong> reset pending_sold_at</p>
                    <p><strong>Project update:</strong> sold_out als alle properties sold</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Safety Checks</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Abort als XML {'<'} 50% van verwachte properties bevat</li>
                      <li>Abort als {'>'} 50 properties tegelijk nieuw missend zijn</li>
                      <li>Optimalisatie: hergebruik xml_api_ids van daily sync</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>24-uur Grace Period</AlertTitle>
                  <AlertDescription>
                    Properties worden pas als 'sold' gemarkeerd als ze meer dan 24 uur niet in de XML 
                    voorkomen. Dit voorkomt false positives bij tijdelijke XML problemen.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Schema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Properties Tabel</h4>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  <p>api_id: text (unique, RedSP identifier)</p>
                  <p>development_id: text (voor project grouping)</p>
                  <p>project_id: uuid (FK naar projects)</p>
                  <p>api_source: text ('redsp')</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Projects Tabel</h4>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  <p>development_ref: text (link naar development_id)</p>
                  <p>project_key: text (unieke key bijv. "dev-p00579")</p>
                  <p>price_from, price_to: numeric (berekend uit properties)</p>
                  <p>status: text ('active', 'sold_out')</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sync Logs Tabel</h4>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  <p>started_at: timestamp</p>
                  <p>completed_at: timestamp</p>
                  <p>status: text ('running', 'completed', 'error')</p>
                  <p>stats: jsonb (processed, new, updated, errors, etc.)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Edge Functions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">sync-redsp-prepare</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Bereidt de sync voor en retourneert metadata.
                </p>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p><strong>Input:</strong> batchSize (default 100)</p>
                  <p><strong>Output:</strong> syncLogId, totalProperties, totalBatches</p>
                  <p><strong>Actie:</strong> Download XML, tel properties, maak sync_log</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">sync-redsp-properties</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Voert de daadwerkelijke sync uit voor één batch properties.
                </p>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p><strong>Input:</strong> offset, limit, mark_sold</p>
                  <p><strong>Output:</strong> processed, new_properties, updated_properties, errors</p>
                  <p><strong>Actie:</strong> Download XML, slice batch, upsert properties</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">sync-redsp-link-projects</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Linkt ongelinkte properties aan projecten na alle batches.
                </p>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p><strong>Input:</strong> geen</p>
                  <p><strong>Output:</strong> projects_linked, projects_created, properties_linked</p>
                  <p><strong>Actie:</strong> Query unlinked, match/create projects, update metadata</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Veelvoorkomende Problemen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="cpu-timeout">
                  <AccordionTrigger>CPU Time Exceeded Error</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Probleem:</strong> Edge function overschrijdt CPU time limit.</p>
                      <p><strong>Oorzaak:</strong> Te veel database queries in één batch.</p>
                      <p><strong>Oplossing:</strong> De 3-staps architectuur voorkomt dit door project linking 
                      te verplaatsen naar een aparte edge function (sync-redsp-link-projects).</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="batch-failed">
                  <AccordionTrigger>Batch Failed</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Probleem:</strong> Eén of meerdere batches falen tijdens sync.</p>
                      <p><strong>Controleer:</strong></p>
                      <ul className="list-disc list-inside">
                        <li>Edge function logs voor specifieke errors</li>
                        <li>XML URL bereikbaarheid</li>
                        <li>Database verbinding</li>
                      </ul>
                      <p><strong>Oplossing:</strong> Sync opnieuw starten. Gefaalde batches worden opnieuw verwerkt.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="properties-not-linked">
                  <AccordionTrigger>Properties Niet Gelinkt aan Projecten</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Probleem:</strong> Properties hebben geen project_id na sync.</p>
                      <p><strong>Oorzaak:</strong> sync-redsp-link-projects is mogelijk niet aangeroepen.</p>
                      <p><strong>Controleer:</strong></p>
                      <ul className="list-disc list-inside">
                        <li>Of alle batches succesvol zijn afgerond</li>
                        <li>Of link-projects functie is aangeroepen</li>
                        <li>Edge function logs voor link-projects</li>
                      </ul>
                      <p><strong>Oplossing:</strong> Start sync opnieuw of roep link-projects handmatig aan.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="manual-sync">
                  <AccordionTrigger>Handmatige Sync Starten</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Ga naar Admin → Properties → klik "Start Sync" knop.</p>
                      <p>De sync dialoog toont real-time voortgang:</p>
                      <ul className="list-disc list-inside">
                        <li>Huidige batch nummer</li>
                        <li>Percentage voltooid</li>
                        <li>Nieuwe/geüpdatete properties</li>
                        <li>Errors (indien aanwezig)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
