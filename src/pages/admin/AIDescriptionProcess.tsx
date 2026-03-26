import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, CheckCircle2, Code, Database, GitBranch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";


export default function AIDescriptionProcess() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/process-documentation")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar Proces Overzicht
              </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">AI Project Beschrijving Generatie</h1>
          <Badge variant="default">Actief</Badge>
        </div>
        <p className="text-muted-foreground">
          Complete proces documentatie voor het automatisch genereren van professionele project beschrijvingen met AI
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Laatst bijgewerkt: 23 januari 2025
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
                Doel en werking van het AI beschrijving generatie systeem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Doel</h3>
                <p className="text-sm text-muted-foreground">
                  Het AI beschrijving generatie proces creëert automatisch professionele, aantrekkelijke en menselijke 
                  project beschrijvingen voor projecten die nog geen goede beschrijving hebben. Dit zorgt voor consistente, 
                  hoogwaardige content die de Viva Vastgoed tone-of-voice volgt (adviserend, warm, niet pusherig) en 
                  investeerders helpt om projecten beter te begrijpen.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">Trigger</div>
                  <div className="text-sm text-muted-foreground">Automatisch bij page load</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">AI Model</div>
                  <div className="text-sm text-muted-foreground">Google Gemini 2.5 Flash</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">Resultaat</div>
                  <div className="text-sm text-muted-foreground">Beschrijving + 5 highlights</div>
                </div>
              </div>

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Volledig Onzichtbaar voor Eindgebruikers</AlertTitle>
                <AlertDescription>
                  Het proces werkt volledig automatisch en onzichtbaar op de achtergrond. Eindgebruikers zien alleen 
                  een standaard laad-skeleton tijdens generatie, geen AI-specifieke meldingen. Na generatie verschijnt 
                  de beschrijving naadloos zonder toast notificaties. Het proces werkt volledig lokaal met de database 
                  via Lovable Cloud.
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
{`┌──────────────────────────────────────────────────────────────────────┐
│              AI Project Beschrijving Generatie Proces                │
└──────────────────────────────────────────────────────────────────────┘

TRIGGER: Gebruiker opent project detail pagina
┌──────────────────────┐
│ ProjectDetail.tsx    │
│ useEffect trigger    │
└──────┬───────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Fetch project from LOCAL database   │
│ • Check: active = true              │
│ • Use: supabase.from('projects')    │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Check beschrijving kwaliteit:       │
│ • Bestaat beschrijving?             │
│ • Is het generiek/placeholder?      │
│ • Is het langer dan 100 chars?     │
└──────┬──────────────────────────────┘
       │
       ├─► JA: Goede beschrijving aanwezig → STOP
       │
       └─► NEE: Generatie nodig → Ga door
              │
              ↓
       ┌────────────────────────────────────────┐
       │ Invoke generate-project-description    │
       │ Edge Function (Lovable Cloud)          │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ STAP 1: Data Ophalen                   │
       │ • Fetch project van LOCAL database     │
       │ • Error als niet gevonden              │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ Check existing description (recheck)   │
       │ • Race condition preventie             │
       │ • Return existing als al gegenereerd   │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ STAP 2: Properties Ophalen             │
       │ • Fetch ALL properties for project_id  │
       │ • Van LOCAL database (RedSP sync)      │
       │ • Error als geen properties            │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ STAP 3: Data Analyse                   │
       │ • Bereken price range (min/max)        │
       │ • Bereken bedroom range                │
       │ • Verzamel property types              │
       │ • Verzamel unique features (top 10)    │
       │ • Selecteer beste descriptions (top 3) │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ STAP 4: AI Prompt Samenstellen         │
       │ Prompt bevat:                          │
       │ • Locatie (city, country)              │
       │ • Property types & counts              │
       │ • Price range & bedroom range          │
       │ • Unique features                      │
       │ • Voorbeelden van property details     │
       │ • Tone-of-voice instructies            │
       │   (warm, adviserend, niet pusherig)    │
       └──────┬─────────────────────────────────┘
              │
              ↓
       ┌────────────────────────────────────────┐
       │ STAP 5: AI Generatie                   │
       │ Lovable AI Gateway                     │
       │ • Model: google/gemini-2.5-flash       │
       │ • System prompt: tone-of-voice         │
       │ • User prompt: project details         │
       │ • Response format: JSON                │
       │   { description, highlights[] }        │
       └──────┬─────────────────────────────────┘
              │
              ├─► Success → Ga door
              │
              └─► Error → FALLBACK MECHANISME
                     │
                     ↓
              ┌──────────────────────────────────┐
              │ Gebruik langste property         │
              │ description als fallback         │
              │ (geen highlights)                │
              └──────┬───────────────────────────┘
                     │
                     ↓
              ┌──────────────────────────────────┐
              │ Save fallback to LOCAL database  │
              └──────┬───────────────────────────┘
                     │
                     └─► Return fallback

       ↓
┌────────────────────────────────────────┐
│ STAP 6: Race Condition Check           │
│ • Recheck of description al bestaat    │
│ • Return existing als ander request    │
│   al description genereerde            │
└──────┬─────────────────────────────────┘
       │
       ↓
┌────────────────────────────────────────┐
│ STAP 7: Opslaan in Database            │
│ Update projects table:                 │
│ • description (150-250 woorden)        │
│ • highlights (array van 5 items)       │
│ WHERE id = project_id                  │
└──────┬─────────────────────────────────┘
       │
       ↓
┌────────────────────────────────────────┐
│ STAP 8: Response naar Frontend         │
│ Return: { description, highlights }    │
└──────┬─────────────────────────────────┘
       │
       ↓
┌────────────────────────────────────────┐
│ Frontend Update (Silent)               │
│ • Update local state                   │
│ • Display nieuwe beschrijving          │
│ • GEEN toast/melding naar gebruiker    │
│   (volledig onzichtbaar proces)        │
└────────────────────────────────────────┘
└────────────────────────────────────────┘`}
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
                  <span>Trigger Detection (Frontend)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Wanneer een gebruiker de project detail pagina opent, controleert het systeem automatisch 
                    of het project een goede beschrijving heeft. Zo niet, dan wordt de generatie gestart.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Technisch</h4>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <p><strong>Component:</strong> ProjectDetail.tsx</p>
                    <p><strong>Trigger:</strong> useEffect op page load</p>
                    <p><strong>Data Source:</strong> Lokale Supabase database</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Conditie Check</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Het systeem controleert of generatie nodig is:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Geen beschrijving:</strong> description is null/undefined/leeg</li>
                    <li><strong>Generieke beschrijving:</strong> Bevat tekst "Automatisch gegenereerd project"</li>
                    <li><strong>Te korte beschrijving:</strong> Minder dan 100 karakters</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Als één van deze waar is → Generatie wordt gestart
                  </p>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Volledig Onzichtbaar</AlertTitle>
                  <AlertDescription>
                    Dit gebeurt volledig automatisch en onzichtbaar voor eindgebruikers. Ze zien alleen een 
                    standaard laad-skeleton (3 skeletons onder "Over dit project"), geen AI-specifieke meldingen. 
                    Na generatie verschijnt de beschrijving naadloos zonder toast notificaties.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 2</Badge>
                  <span>Data Ophalen (Edge Function)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    De edge function haalt alle benodigde data op van de lokale database. 
                    Eerst het project zelf, dan alle properties die bij het project horen.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Project Ophalen</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="mb-2">Query:</p>
                    <code className="block bg-background p-2 rounded">
                      supabase.from('projects')<br/>
                      &nbsp;&nbsp;.select('*')<br/>
                      &nbsp;&nbsp;.eq('id', projectId)<br/>
                      &nbsp;&nbsp;.maybeSingle()
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Als project niet gevonden → Error: "Project not found in database"
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Properties Ophalen</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="mb-2">Query:</p>
                    <code className="block bg-background p-2 rounded">
                      supabase.from('properties')<br/>
                      &nbsp;&nbsp;.select('*')<br/>
                      &nbsp;&nbsp;.eq('project_id', projectId)
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Als geen properties gevonden → Error: "No properties found for this project"
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Belangrijk</AlertTitle>
                  <AlertDescription>
                    Properties moeten al via RedSP sync geïmporteerd zijn. Dit proces creëert GEEN properties, 
                    het gebruikt alleen bestaande data.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 3</Badge>
                  <span>Data Analyse & Prompt Samenstellen</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Alle property data wordt geanalyseerd om de belangrijkste kenmerken te extraheren 
                    en samen te stellen tot een gestructureerde AI prompt.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Berekeningen</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Price Range:</strong> Math.min/max van alle property prices</li>
                    <li><strong>Bedroom Range:</strong> Min/max aantal slaapkamers</li>
                    <li><strong>Property Types:</strong> Unique lijst (Appartement, Villa, etc.)</li>
                    <li><strong>Unique Features:</strong> Top 10 meest voorkomende features (pool, sea_views, etc.)</li>
                    <li><strong>Best Descriptions:</strong> Top 3 langste property descriptions als voorbeelden</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Prompt Structuur</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    De AI prompt bevat:
                  </p>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-2">
                    <p><strong>Context:</strong> Locatie (city, Spanje)</p>
                    <p><strong>Details:</strong> Property types, aantal units, prijsrange, slaapkamers</p>
                    <p><strong>Features:</strong> Unique kenmerken (pool, zeezicht, etc.)</p>
                    <p><strong>Voorbeelden:</strong> Excerpts van beste property descriptions</p>
                    <p><strong>Instructies:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Schrijf in Nederlands</li>
                      <li>Lengte: 150-250 woorden</li>
                      <li>Focus op: locatie voordelen, woningtypes, investering, lifestyle, unieke features</li>
                      <li>Tone: warm, adviserend, menselijk - NIET pusherig</li>
                      <li>Ook 5 highlights (max 6 woorden elk)</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 4</Badge>
                  <span>AI Generatie via Lovable AI</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    De prompt wordt gestuurd naar Lovable AI Gateway die Google Gemini 2.5 Flash gebruikt 
                    om een professionele beschrijving en highlights te genereren.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Technisch</h4>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <p><strong>Endpoint:</strong> https://ai.gateway.lovable.dev/v1/chat/completions</p>
                    <p><strong>Model:</strong> google/gemini-2.5-flash</p>
                    <p><strong>API Key:</strong> LOVABLE_API_KEY (automatisch geconfigureerd)</p>
                    <p><strong>Response Format:</strong> JSON</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Messages Structuur</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="mb-2"><strong>System Message:</strong></p>
                    <p className="italic mb-3">
                      "Je bent een professionele vastgoedcopywriter gespecialiseerd in Spaanse vastgoedprojecten. 
                      Je schrijft altijd warm, adviserend en menselijk - nooit pusherig."
                    </p>
                    <p className="mb-2"><strong>User Message:</strong></p>
                    <p>Complete prompt met alle project details en instructies</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Expected Output</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <code className="block">
                      {`{
  "description": "Een professionele beschrijving van 150-250 woorden...",
  "highlights": [
    "Zeezicht vanaf alle units",
    "10 min van strand",
    "Moderne luxe afwerking",
    "Hoogrendementslocatie",
    "Direct beschikbaar"
  ]
}`}
                    </code>
                  </div>
                </div>

                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Geen API Key Nodig</AlertTitle>
                  <AlertDescription>
                    Lovable AI werkt out-of-the-box. De LOVABLE_API_KEY wordt automatisch geconfigureerd 
                    via Lovable Cloud. Geen externe accounts of API keys nodig.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step5">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 5</Badge>
                  <span>Race Condition Check & Opslaan</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Voordat de nieuwe beschrijving wordt opgeslagen, checkt het systeem nogmaals of er 
                    niet inmiddels al een beschrijving is gegenereerd door een ander parallel request. 
                    Dit voorkomt dubbele AI calls en database conflicts.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Race Condition Preventie</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="mb-2"><strong>Scenario:</strong></p>
                    <p>Meerdere gebruikers openen tegelijkertijd dezelfde project pagina → 
                    Meerdere generatie requests worden tegelijk getriggered</p>
                    <p className="mt-2 mb-2"><strong>Oplossing:</strong></p>
                    <p>Voor het opslaan: check of description inmiddels al bestaat en valide is</p>
                    <p className="mt-2">Als ja → Return bestaande description (skip save)</p>
                    <p>Als nee → Sla nieuwe description op</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Database Update</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="mb-2">Update Query:</p>
                    <code className="block bg-background p-2 rounded">
                      supabase.from('projects')<br/>
                      &nbsp;&nbsp;.update({`{`}<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;description: parsed.description,<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;highlights: parsed.highlights || []<br/>
                      &nbsp;&nbsp;{`}`})<br/>
                      &nbsp;&nbsp;.eq('id', projectId)
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response naar Frontend (Silent)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    De edge function returned de gegenereerde (of bestaande) beschrijving en highlights 
                    naar de frontend, die vervolgens:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Local state update (setProject)</li>
                    <li>Nieuwe beschrijving toont op pagina</li>
                    <li><strong>GEEN toast notification</strong> - volledig onzichtbaar voor gebruiker</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tijdens generatie ziet de gebruiker alleen een standaard laad-skeleton (3 skeleton lines) 
                    onder de "Over dit project" sectie. Geen AI-specifieke meldingen of spinners.
                  </p>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Efficiënt</AlertTitle>
                  <AlertDescription>
                    Door race condition check worden onnodige AI calls voorkomen, wat kosten bespaart 
                    en database conflicts voorkomt.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Stap 6</Badge>
                  <span>Fallback Mechanisme (bij AI falen)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">Wat gebeurt er?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Als de AI API faalt (timeout, rate limit, error), gebruikt het systeem automatisch 
                    een fallback: de langste property description wordt als project beschrijving gebruikt.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Fallback Logica</h4>
                  <div className="bg-muted/50 p-3 rounded text-sm space-y-2">
                    <p><strong>1. Sorteer properties:</strong></p>
                    <p className="ml-4">Filter op: description exists && length {'>'} 50 chars</p>
                    <p className="ml-4">Sort: op description length (desc)</p>
                    <p className="mt-2"><strong>2. Selecteer langste:</strong></p>
                    <p className="ml-4">Neem eerste property uit gesorteerde lijst</p>
                    <p className="mt-2"><strong>3. Gebruik als fallback:</strong></p>
                    <p className="ml-4">Sla property description op als project description</p>
                    <p className="ml-4">Geen highlights (empty array)</p>
                  </div>
                </div>

                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Limitatie</AlertTitle>
                  <AlertDescription>
                    Fallback beschrijvingen zijn niet altijd ideaal (kunnen te technisch of te kort zijn), 
                    maar zorgen ervoor dat elk project tenminste IETS heeft. Admin kan later handmatig verbeteren.
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
                <Code className="h-5 w-5" />
                Technische Implementatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Architectuur Componenten</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-semibold mb-1">Frontend Component</div>
                    <code className="text-sm">src/pages/ProjectDetail.tsx</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Trigger logica, data fetching, UI updates
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-semibold mb-1">Edge Function</div>
                    <code className="text-sm">supabase/functions/generate-project-description/index.ts</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Data ophalen, AI call, database updates
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-semibold mb-1">Database Tables</div>
                    <code className="text-sm">projects, properties</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lokale Supabase database (Lovable Cloud)
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-semibold mb-1">AI Service</div>
                    <code className="text-sm">Lovable AI Gateway → Google Gemini 2.5 Flash</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatisch geconfigureerd, geen externe setup
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Database Schema</h3>
                <div className="bg-muted/50 p-4 rounded">
                  <h4 className="text-sm font-semibold mb-2">projects table</h4>
                  <ul className="text-xs space-y-1 font-mono">
                    <li>• id (uuid, primary key)</li>
                    <li>• name (text)</li>
                    <li>• description (text, nullable) ← AI gegenereerd</li>
                    <li>• highlights (jsonb, nullable) ← AI gegenereerd array</li>
                    <li>• city (text)</li>
                    <li>• country (text)</li>
                    <li>• price_from (numeric)</li>
                    <li>• price_to (numeric)</li>
                    <li>• development_ref (text, unique)</li>
                    <li>• ... (andere velden)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Environment Variables</h3>
                <div className="bg-muted/50 p-4 rounded space-y-2 text-sm">
                  <div>
                    <code className="font-semibold">LOVABLE_API_KEY</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatisch geconfigureerd door Lovable Cloud. Gebruikt voor Lovable AI Gateway calls.
                    </p>
                  </div>
                  <div className="mt-3">
                    <code className="font-semibold">SUPABASE_URL</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lokale Supabase instance URL (Lovable Cloud)
                    </p>
                  </div>
                  <div className="mt-3">
                    <code className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Voor database operaties in edge functions
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Rate Limits & Kosten</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lovable AI Usage</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Lovable AI heeft rate limits en usage-based pricing. Elke AI call kost credits.
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Rate limit errors (429) → worden automatisch afgevangen</li>
                      <li>Payment required errors (402) → gebruiker moet credits toevoegen</li>
                      <li>Bij rate limit → fallback mechanisme wordt gebruikt</li>
                    </ul>
                    <p className="mt-2 text-sm">
                      Check usage in: Settings → Workspace → Usage
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Error Handling (Silent)</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <p className="font-semibold mb-1">Project niet gevonden</p>
                    <p className="text-muted-foreground">
                      Error: "Project not found in database" → Alleen console.error, geen user notification
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <p className="font-semibold mb-1">Geen properties</p>
                    <p className="text-muted-foreground">
                      Error: "No properties found" → Alleen console.error, geen user notification
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <p className="font-semibold mb-1">AI API falen</p>
                    <p className="text-muted-foreground">
                      Fallback: gebruik langste property description (volledig onzichtbaar voor gebruiker)
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <p className="font-semibold mb-1">Database save error</p>
                    <p className="text-muted-foreground">
                      Error wordt gelogd → Alleen console.error, geen user notification
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  <strong>Belangrijke ontwerpkeuze:</strong> Alle errors zijn volledig onzichtbaar voor eindgebruikers. 
                  Ze zien gewoon de fallback content (generieke beschrijving of property description) zonder te weten 
                  dat er iets mis is gegaan. Errors worden alleen gelogd in console voor debugging door developers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Vereiste Data</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">Voor succesvolle AI generatie moet de volgende data al aanwezig zijn:</p>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    <li><strong>Project:</strong> Project moet in database staan (via RedSP sync)</li>
                    <li><strong>Properties:</strong> Minimaal 1 property gelinkt aan project (via auto-link)</li>
                    <li><strong>Property Details:</strong> Properties moeten price, bedrooms, features hebben</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    Als deze data ontbreekt → Proces faalt met duidelijke error messages
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Veelvoorkomende Problemen & Oplossingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="issue1">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Beschrijving wordt niet gegenereerd</div>
                        <div className="text-sm text-muted-foreground">Pagina laadt maar geen AI generatie</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Mogelijke Oorzaken:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Project heeft al een goede beschrijving (check: length {'>'} 100, niet generiek)</li>
                        <li>Geen properties gelinkt aan project (check: properties.project_id)</li>
                        <li>Project bestaat niet in database</li>
                        <li>Edge function error (check: edge function logs)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Oplossingen:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Check browser console voor errors</li>
                        <li>Check edge function logs in Lovable Cloud → Edge Functions</li>
                        <li>Verifieer dat project properties heeft: Database → properties → filter project_id</li>
                        <li>Check of project active = true</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">AI generatie faalt met 429 error</div>
                        <div className="text-sm text-muted-foreground">Rate limit exceeded error</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Oorzaak:</h4>
                      <p className="text-sm text-muted-foreground">
                        Te veel AI requests in korte tijd. Lovable AI heeft rate limits per workspace.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Oplossingen:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Wacht enkele minuten en probeer opnieuw</li>
                        <li>Fallback mechanisme wordt automatisch gebruikt (property description)</li>
                        <li>Check usage: Settings → Workspace → Usage</li>
                        <li>Upgrade plan als rate limits structureel te laag zijn</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue3">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">AI generatie faalt met 402 error</div>
                        <div className="text-sm text-muted-foreground">Payment required error</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Oorzaak:</h4>
                      <p className="text-sm text-muted-foreground">
                        Lovable AI credits zijn op. Usage-based pricing vereist voldoende credits.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Oplossingen:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Voeg credits toe: Settings → Workspace → Usage → Add Credits</li>
                        <li>Fallback mechanisme wordt automatisch gebruikt</li>
                        <li>Check billing history voor verbruik insights</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Beschrijving is van slechte kwaliteit</div>
                        <div className="text-sm text-muted-foreground">Te kort, niet relevant, of te generiek</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Mogelijke Oorzaken:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Properties hebben weinig/slechte descriptions (AI gebruikt deze als voorbeelden)</li>
                        <li>Weinig properties gelinkt aan project (niet genoeg context)</li>
                        <li>AI gebruikte fallback (property description ipv AI generatie)</li>
                        <li>Property features zijn incompleet</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Oplossingen:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Verbeter property data in database (descriptions, features)</li>
                        <li>Link meer properties aan project (betere context voor AI)</li>
                        <li>Handmatig beschrijving verbeteren in admin (direct in database)</li>
                        <li>Regenereer beschrijving (refresh pagina triggert opnieuw als description kort is)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue5">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Beschrijving mist highlights</div>
                        <div className="text-sm text-muted-foreground">Alleen description, geen highlights array</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Oorzaak:</h4>
                      <p className="text-sm text-muted-foreground">
                        Fallback mechanisme werd gebruikt (AI falen). Fallback gebruikt alleen property description, 
                        genereert geen highlights.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Oplossingen:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Check edge function logs waarom AI faalde</li>
                        <li>Los onderliggende AI issue op (rate limit, credits, etc.)</li>
                        <li>Regenereer: Maak description kort ({'<'} 100 chars) → refresh pagina</li>
                        <li>Handmatig highlights toevoegen in database (projects.highlights jsonb array)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue6">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Race condition: dubbele generaties</div>
                        <div className="text-sm text-muted-foreground">Meerdere AI calls voor zelfde project</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Oorzaak:</h4>
                      <p className="text-sm text-muted-foreground">
                        Meerdere gebruikers openen tegelijk de project detail pagina → Parallel requests
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Ingebouwde Bescherming:</h4>
                      <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>Race condition check: recheck description voor opslaan</li>
                        <li>Als al gegenereerd → skip save, return existing</li>
                        <li>Voorkomt dubbele AI calls en database conflicts</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Conclusie:</strong> Dit is normaal gedrag en wordt automatisch afgevangen. 
                        Geen actie nodig.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug Checklist</CardTitle>
              <CardDescription>Stap-voor-stap checklist bij problemen</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">1.</span>
                  <div>
                    <span className="font-semibold">Check browser console:</span>
                    <p className="text-muted-foreground">Zijn er JavaScript errors? Network request failures?</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">2.</span>
                  <div>
                    <span className="font-semibold">Check edge function logs:</span>
                    <p className="text-muted-foreground">Lovable Cloud → Edge Functions → generate-project-description → Logs</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">3.</span>
                  <div>
                    <span className="font-semibold">Verifieer project in database:</span>
                    <p className="text-muted-foreground">Database → projects → filter op id → check active = true</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">4.</span>
                  <div>
                    <span className="font-semibold">Verifieer properties:</span>
                    <p className="text-muted-foreground">Database → properties → filter project_id → check aantal rows {'>'} 0</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">5.</span>
                  <div>
                    <span className="font-semibold">Check AI usage:</span>
                    <p className="text-muted-foreground">Settings → Workspace → Usage → check credits & rate limits</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold shrink-0">6.</span>
                  <div>
                    <span className="font-semibold">Test met simpel project:</span>
                    <p className="text-muted-foreground">Kies project met veel properties en goede data → test of generatie werkt</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}