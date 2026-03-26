import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Database, 
  Zap,
  FileText,
  MessageSquare,
  TrendingUp,
  User
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function InvestorPageProcess() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Investeerders Pagina Generatie Proces</h1>
              <p className="text-muted-foreground mt-1">
                Complete documentatie voor het genereren van gepersonaliseerde investeringspagina's
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="default">Actief</Badge>
            <Badge variant="secondary">On-demand</Badge>
            <Badge variant="outline">Frontend + Edge Functions</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overzicht</TabsTrigger>
                <TabsTrigger value="steps">Stappen</TabsTrigger>
                <TabsTrigger value="technical">Technisch</TabsTrigger>
                <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Proces Overzicht
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Doel
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Genereren van volledig gepersonaliseerde investeringspagina's met AI-gegenereerde intro, 
                          conversational chatbot voor lead capture, en uitgebreide property informatie.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          Trigger
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Gebruiker navigeert naar <code className="bg-muted px-1 rounded">/investeerders?project=&lt;id&gt;</code> 
                          via "Meer informatie" knop op project kaarten.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          AI Model
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Google Gemini 2.5 Flash via Lovable AI Gateway voor korte, persoonlijke intro tekst (2-3 zinnen).
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Resultaat
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Volledig werkende investeringspagina met property details, chatbot, kostenanalyse en verhuurinformatie.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Proces Flow Diagram</h3>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────────┐
│                    INVESTEERDERS PAGINA GENERATIE                   │
└─────────────────────────────────────────────────────────────────────┘

1. URL TRIGGER
   ↓
   User navigeert: /investeerders?project=<uuid>&name=<naam>&email=<email>
   ↓
   ┌─────────────────────────────────────┐
   │   Investeerders.tsx (Frontend)      │
   │   - Parse URL parameters            │
   │   - Initialize loading states       │
   └─────────────────────────────────────┘
   ↓
2. DATA FETCHING (Parallel)
   ↓
   ┌──────────────────────┐    ┌──────────────────────┐
   │  api-projects        │    │  api-properties      │
   │  Edge Function       │    │  Edge Function       │
   │  ↓                   │    │  ↓                   │
   │  Fetch project data  │    │  Fetch all props     │
   │  (name, images)      │    │  for project         │
   └──────────────────────┘    └──────────────────────┘
   ↓                           ↓
   Project data loaded         Filter: status='available'
                               Sort: price ASC
                               Select: cheapest property
   ↓
3. PROPERTY SELECTION & TITLE GENERATION
   ↓
   Generate dynamic title: "{PropertyType} in {City}"
   Example: "Luxe Penthouse in Los Alcázares"
   ↓
4. AI INTRO GENERATION
   ↓
   ┌─────────────────────────────────────────────┐
   │  summarize-investor-page Edge Function      │
   │  ↓                                           │
   │  Call Lovable AI (Gemini 2.5 Flash)        │
   │  Input: property details                    │
   │  Prompt: "Korte persoonlijke intro 2-3 zin"│
   │  ↓                                           │
   │  AI generates warm, clear summary           │
   │  ↓                                           │
   │  Fallback: Generic text if AI fails         │
   └─────────────────────────────────────────────┘
   ↓
5. CONVERSATIONAL CHATBOT SETUP
   ↓
   ┌─────────────────────────────────────────────┐
   │  useInvestorChat Hook                       │
   │  ↓                                           │
   │  Check localStorage for visitor_id          │
   │  ↓                                           │
   │  New? → Start flow: "Hoe mag ik je noemen?" │
   │  Existing? → Load conversation from DB      │
   │  ↓                                           │
   │  Flow: Naam → Ervaring → Focus →            │
   │        Call interesse → Email/Telefoon      │
   │  ↓                                           │
   │  Store in: chat_conversations + messages    │
   └─────────────────────────────────────────────┘
   ↓
6. PAGE RENDERING
   ↓
   ┌─────────────────────────────────────────────┐
   │  Complete Investeerders Page                │
   │  ↓                                           │
   │  ✓ Hero: Property image carousel            │
   │  ✓ AI Intro: Personalized 2-3 sentences     │
   │  ✓ Property Overview: Specs + Price         │
   │  ✓ InvestorChatEmbedded: Lead capture       │
   │  ✓ PurchaseCostsBreakdown: Calculator       │
   │  ✓ RentalComparables: Verhuuranalyse + map  │
   │  ✓ InvestmentStrategyEducation              │
   │  ✓ InvestmentFAQ: 4 tabs                    │
   │  ✓ InvestorChatFloating: After scroll       │
   └─────────────────────────────────────────────┘

RESULTAAT: Volledig gepersonaliseerde investeringspagina met AI intro`}
                      </pre>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Belangrijk:</strong> AI generatie is ZICHTBAAR voor gebruikers als intro tekst. 
                        Dit is anders dan de project beschrijving generatie die onzichtbaar is.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* STEPS TAB */}
              <TabsContent value="steps" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gedetailleerde Processtappen</CardTitle>
                    <CardDescription>
                      Stap-voor-stap uitleg van het volledige generatieproces
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="step1">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>1</Badge>
                            <span>URL Trigger & Data Parsing</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            De pagina wordt getriggerd wanneer een gebruiker klikt op een "Meer informatie" knop 
                            bij een project. De URL bevat alle benodigde parameters.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">URL Structure</h4>
                            <pre className="bg-muted p-3 rounded text-xs">
{`/investeerders?project=16bea194-d3e5-4c23-b44d-e599018e2700&name=Jan&email=jan@example.com

Parameters:
- project: UUID van het project (required)
- name: Naam bezoeker (optional)
- email: Email bezoeker (optional)`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Frontend Code</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const [searchParams] = useSearchParams();
const projectId = searchParams.get('project');
const name = searchParams.get('name');
const email = searchParams.get('email');

// Initialize loading states
const [loading, setLoading] = useState(true);
const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
const [projectData, setProjectData] = useState<ProjectData | null>(null);`}
                            </pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="step2">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>2</Badge>
                            <span>Project Data Ophalen</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Haal project informatie op uit de database via de api-projects edge function.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">API Call</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const projectResponse = await fetch(
  \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-projects?limit=1000\`,
  {
    headers: {
      'Authorization': \`Bearer \${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}\`
    }
  }
);

const { data: projects } = await projectResponse.json();
const project = projects.find(p => p.id === projectId);

// Extract: name, display_title, featured_image, images (array)`}
                            </pre>
                          </div>

                          <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                              Project data wordt gebruikt voor de hero sectie en algemene context.
                            </AlertDescription>
                          </Alert>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="step3">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>3</Badge>
                            <span>Property Selectie & Filtering</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Haal alle properties op voor dit project en selecteer de goedkoopste beschikbare unit.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">Filtering Logica</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`// Fetch all properties for this project
const propertiesResponse = await fetch(
  \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-properties?project_id=\${projectId}&limit=1000\`,
  {
    headers: {
      'Authorization': \`Bearer \${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}\`
    }
  }
);

const { data: properties } = await propertiesResponse.json();

// Filter: Only available properties (exclude sold/reserved)
const availableProperties = properties.filter(p => p.status === 'available');

// Sort: By price ascending
const sortedByPrice = availableProperties.sort((a, b) => 
  (a.price || 0) - (b.price || 0)
);

// Select: Cheapest property
const cheapestProperty = sortedByPrice[0];`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Dynamic Title Generation</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`// Generate title: "{PropertyType} in {City}"
const displayTitle = \`\${cheapestProperty.property_type || 'Appartement'} in \${cheapestProperty.city || project.city}\`;

// Example: "Luxe Penthouse in Los Alcázares"
// Example: "Appartement in Murcia"`}
                            </pre>
                          </div>

                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Als er geen available properties zijn, wordt een error state getoond.
                            </AlertDescription>
                          </Alert>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="step4">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>4</Badge>
                            <span>AI Intro Generatie via Lovable AI</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Genereer een korte, persoonlijke intro tekst (2-3 zinnen) met AI die uitlegt wat 
                            de bezoeker op deze pagina kan vinden.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">Edge Function Call</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
  'summarize-investor-page',
  {
    body: {
      property_title: displayTitle,
      property_price: cheapestProperty.price,
      property_bedrooms: cheapestProperty.bedrooms,
      property_city: cheapestProperty.city
    }
  }
);

const generatedIntro = summaryData?.summary || fallbackText;`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Edge Function: summarize-investor-page</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: 'Je bent een vriendelijke investeringsadviseur...'
      },
      {
        role: 'user',
        content: \`Maak een korte, persoonlijke intro (2-3 zinnen) voor: \${property_title} - €\${property_price}\`
      }
    ],
    temperature: 0.7,
    max_tokens: 200
  })
});`}
                            </pre>
                          </div>

                          <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Fallback:</strong> Als AI generatie faalt (429/402/network error), wordt een 
                              generieke welkomst tekst getoond zonder foutmelding naar de gebruiker.
                            </AlertDescription>
                          </Alert>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="step5">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>5</Badge>
                            <span>Conversational Chatbot Initialisatie</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Start een conversational chatbot flow voor lead capture met geautomatiseerde vraag-antwoord flow.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">useInvestorChat Hook</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`const {
  messages,
  isLoading,
  sendMessage,
  conversationId
} = useInvestorChat({
  projectId,
  projectName: project.name,
  propertyTitle: displayTitle,
  propertyPrice: cheapestProperty.price,
  initialName: name,
  initialEmail: email
});`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Conversation Flow</h4>
                            <pre className="bg-muted p-3 rounded text-xs">
{`1. "Hoe mag ik je noemen?"
   → Store: name
   
2. "Heb je al ervaring met investeren in Spanje?"
   → Options: Ja / Nee / Een beetje
   
3. "Waar ben je het meest in geïnteresseerd?"
   → Options: Eigen gebruik / Verhuur / Beide
   
4. "Wil je een persoonlijk gesprek met een adviseur?"
   → Options: Ja, graag / Nee, dank je
   
5. "Wat is je emailadres?"
   → Store: email
   
6. "En je telefoonnummer?"
   → Store: phone
   → Set: converted = true`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Database Storage</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`// chat_conversations table
{
  id: uuid,
  visitor_id: string (localStorage),
  bot_type: 'investment_advisor',
  project_id: string,
  converted: boolean,
  metadata: {
    name, email, phone, experience, focus, call_interest
  },
  started_at: timestamp,
  completed_at: timestamp
}

// chat_messages table
{
  id: uuid,
  conversation_id: uuid,
  role: 'user' | 'assistant',
  content: string,
  metadata: {},
  created_at: timestamp
}`}
                            </pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="step6">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge>6</Badge>
                            <span>Pagina Rendering & Componenten</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Render de volledige investeringspagina met alle componenten in logische volgorde.
                          </p>

                          <div>
                            <h4 className="font-semibold mb-2">Component Structuur</h4>
                            <pre className="bg-muted p-3 rounded text-xs">
{`<div className="investeerders-page">
  
  {/* 1. Hero Section */}
  <Carousel>
    {propertyImages.map(img => <img src={img} />)}
  </Carousel>
  
  {/* 2. Property Overview Card */}
  <Card>
    <h1>{displayTitle}</h1>
    <p>{generatedIntro}</p> {/* AI generated */}
    <div className="specs">
      {bedrooms} slaapkamers | {bathrooms} badkamers
      {area_sqm}m² | €{price}
    </div>
  </Card>
  
  {/* 3. Conversational Chatbot */}
  <InvestorChatEmbedded 
    messages={messages}
    onSendMessage={sendMessage}
    isLoading={isLoading}
  />
  
  {/* 4. Purchase Costs Breakdown */}
  <PurchaseCostsBreakdown 
    propertyPrice={price}
  />
  
  {/* 5. Rental Comparables Analysis */}
  <RentalComparables 
    projectId={projectId}
    bedrooms={bedrooms}
    bathrooms={bathrooms}
    latitude={latitude}
    longitude={longitude}
  />
  
  {/* 6. Educational Content */}
  <InvestmentStrategyEducation />
  
  {/* 7. FAQ Section */}
  <InvestmentFAQ />
  
  {/* 8. Closing CTA */}
  <InvestorPageClosingCTA />
  
  {/* 9. Floating Chat (after scroll) */}
  {showFloatingChat && (
    <InvestorChatFloating 
      messages={messages}
      onSendMessage={sendMessage}
    />
  )}
</div>`}
                            </pre>
                          </div>

                          <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                              Alle componenten zijn geoptimaliseerd voor mobile en desktop met responsive design.
                            </AlertDescription>
                          </Alert>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TECHNICAL TAB */}
              <TabsContent value="technical" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Technische Specificaties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Architectuur Componenten
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Frontend</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• <code>Investeerders.tsx</code> - Main page component</li>
                            <li>• <code>useInvestorChat.tsx</code> - Chat state management hook</li>
                            <li>• <code>InvestorChatEmbedded.tsx</code> - Embedded chat UI</li>
                            <li>• <code>InvestorChatFloating.tsx</code> - Floating chat UI</li>
                          </ul>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Edge Functions</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• <code>summarize-investor-page</code> - AI intro generation</li>
                            <li>• <code>api-projects</code> - Project data API</li>
                            <li>• <code>api-properties</code> - Property data API</li>
                            <li>• <code>track-chat</code> - Conversation tracking</li>
                          </ul>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Database Tables</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• <code>chat_conversations</code> - Conversation metadata</li>
                            <li>• <code>chat_messages</code> - Individual messages</li>
                            <li>• <code>projects</code> - Project information</li>
                            <li>• <code>properties</code> - Property details</li>
                          </ul>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">External Services</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Lovable AI Gateway (Gemini 2.5 Flash)</li>
                            <li>• AirRoi API (Rental comparables)</li>
                            <li>• Mapbox (Location maps)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Database Schema Details</h3>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`-- chat_conversations table
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  bot_type TEXT NOT NULL DEFAULT 'investment_advisor',
  project_id TEXT NOT NULL,
  converted BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id),
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metadata structure examples:
conversation.metadata = {
  name: "Jan Jansen",
  email: "jan@example.com",
  phone: "+31612345678",
  experience: "Ja",
  focus: "Verhuur",
  call_interest: true
}

message.metadata = {
  step: "naam_vraag",
  timestamp: "2025-01-23T10:30:00Z"
}`}
                      </pre>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Environment Variables</h3>
                      <pre className="bg-muted p-4 rounded text-xs">
{`# Frontend (.env)
VITE_SUPABASE_URL=https://owbzpreqoxedpmlsgdkb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=owbzpreqoxedpmlsgdkb

# Edge Functions (Supabase Secrets)
LOVABLE_API_KEY=<auto-provisioned>
SUPABASE_URL=<auto-provided>
SUPABASE_SERVICE_ROLE_KEY=<auto-provided>
AIRROI_API_KEY=<user-provided>
MAPBOX_PUBLIC_TOKEN=<user-provided>`}
                      </pre>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">AI Model Configuratie</h3>
                      <div className="bg-muted p-4 rounded space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Model:</span>
                          <code>google/gemini-2.5-flash</code>
                          
                          <span className="text-muted-foreground">Temperature:</span>
                          <code>0.7</code>
                          
                          <span className="text-muted-foreground">Max Tokens:</span>
                          <code>200</code>
                          
                          <span className="text-muted-foreground">Response Type:</span>
                          <code>Text (2-3 sentences)</code>
                          
                          <span className="text-muted-foreground">Prompt Focus:</span>
                          <span>Korte, warme, persoonlijke intro</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Rate Limits & Kosten</h3>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="space-y-2">
                          <p><strong>Lovable AI Rate Limits:</strong></p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Per workspace rate limits (variabel per plan)</li>
                            <li>• 429 Error: Te veel verzoeken per minuut</li>
                            <li>• 402 Error: Credits op - top-up nodig via Settings → Workspace → Usage</li>
                          </ul>
                          <p className="mt-2"><strong>Kostenstructuur:</strong></p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Lovable AI: Credit-based pricing (gratis included usage)</li>
                            <li>• AirRoi API: Per request pricing</li>
                            <li>• Supabase: Included in Cloud plan</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TROUBLESHOOTING TAB */}
              <TabsContent value="troubleshooting" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Troubleshooting & Debugging
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="issue1">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span>Pagina laadt geen property data</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            De pagina toont een lege state of laadt oneindig zonder property informatie.
                          </p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Mogelijke Oorzaken & Oplossingen:</h4>
                            <ul className="text-sm space-y-2">
                              <li>
                                <strong>✓ Check: Project ID in URL aanwezig?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser console
const params = new URLSearchParams(window.location.search);
console.log('Project ID:', params.get('project'));
// Should return UUID`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Zijn properties gekoppeld aan project?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`-- Supabase SQL Editor
SELECT COUNT(*) FROM properties WHERE project_id = '<project-uuid>';
-- Should return > 0`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Zijn properties status='available'?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`SELECT COUNT(*) FROM properties 
WHERE project_id = '<project-uuid>' AND status = 'available';
-- Should return > 0 for active projects`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: RLS policies toegang?</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Verify dat de <code>api-properties</code> edge function service role gebruikt 
                                  en dat RLS policies public SELECT toestaan voor available properties.
                                </p>
                              </li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="issue2">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span>AI intro wordt niet gegenereerd</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            De pagina toont alleen de fallback tekst zonder gepersonaliseerde AI intro.
                          </p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Debugging Steps:</h4>
                            <ul className="text-sm space-y-2">
                              <li>
                                <strong>✓ Check: LOVABLE_API_KEY aanwezig?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Supabase Edge Function Logs
console.log('API Key exists:', !!Deno.env.get('LOVABLE_API_KEY'));
// Should log: API Key exists: true`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Rate limits (429) of credits (402)?</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Open Edge Function logs in Lovable Cloud → Functions → summarize-investor-page → Logs.
                                  Zoek naar HTTP status codes.
                                </p>
                                <Alert className="mt-2">
                                  <AlertDescription className="text-xs">
                                    <strong>429 Error:</strong> Wacht een minuut en probeer opnieuw.<br/>
                                    <strong>402 Error:</strong> Top-up credits via Settings → Workspace → Usage.
                                  </AlertDescription>
                                </Alert>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Network tab voor fetch errors</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser DevTools → Network
// Look for: summarize-investor-page request
// Check: Status code, response body, timing`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Fallback werkt correct?</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Als AI faalt, wordt een generieke welkomst tekst getoond zonder foutmelding. 
                                  Dit is gewenst gedrag om gebruikerservaring te behouden.
                                </p>
                              </li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="issue3">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span>Chatbot start niet of toont geen berichten</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            De chatbot sectie is leeg of reageert niet op gebruikersinput.
                          </p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Debugging Steps:</h4>
                            <ul className="text-sm space-y-2">
                              <li>
                                <strong>✓ Check: useInvestorChat hook geïnitialiseerd?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser console
// Should see initial greeting message
console.log('Messages:', messages);
console.log('Loading:', isLoading);
console.log('Conversation ID:', conversationId);`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: visitor_id in localStorage correct?</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser DevTools → Application → Local Storage
localStorage.getItem('viva_visitor_id');
// Should return a UUID string`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: track-chat edge function errors</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Lovable Cloud → Functions → track-chat → Logs. Kijk naar errors bij 
                                  conversation creation of message insertion.
                                </p>
                              </li>
                              
                              <li>
                                <strong>✓ Check: RLS policies op chat tabellen</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`-- Verify service role access
SELECT * FROM chat_conversations LIMIT 1;
SELECT * FROM chat_messages LIMIT 1;
-- Should succeed with service_role key`}
                                </pre>
                              </li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="issue4">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span>Verkeerde property wordt getoond</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            De pagina toont niet de goedkoopste beschikbare property of een verkochte unit.
                          </p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Debugging Steps:</h4>
                            <ul className="text-sm space-y-2">
                              <li>
                                <strong>✓ Check: Filter logica op status</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser console - log filtering
const available = properties.filter(p => p.status === 'available');
console.log('Available properties:', available.length);
console.log('First 3:', available.slice(0, 3).map(p => ({
  title: p.title,
  price: p.price,
  status: p.status
})));`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Sort logica (prijs ascending)</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`const sorted = available.sort((a, b) => (a.price || 0) - (b.price || 0));
console.log('Cheapest:', sorted[0].price);
console.log('Most expensive:', sorted[sorted.length - 1].price);
// Verify cheapest is actually lowest price`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Verify property status in database</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`-- Check if displayed property is actually 'available'
SELECT title, price, status FROM properties 
WHERE project_id = '<project-uuid>'
ORDER BY price ASC;`}
                                </pre>
                              </li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="issue5">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span>Conversatie wordt niet opgeslagen in database</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Chatbot werkt maar conversaties verschijnen niet in de database.
                          </p>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Debugging Steps:</h4>
                            <ul className="text-sm space-y-2">
                              <li>
                                <strong>✓ Check: track-chat edge function aanroep</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser Network tab
// Look for POST requests to: track-chat
// Check request payload and response`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: conversation_id in state</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`// Browser console
console.log('Conversation ID:', conversationId);
// Should be a UUID after first message`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: RLS policies op chat tabellen</strong>
                                <pre className="bg-muted p-2 rounded text-xs mt-1">
{`-- Verify service role can INSERT
INSERT INTO chat_conversations (visitor_id, bot_type, project_id) 
VALUES ('test_visitor', 'investment_advisor', 'test_project');
-- Should succeed with service_role key`}
                                </pre>
                              </li>
                              
                              <li>
                                <strong>✓ Check: Edge function logs voor insert errors</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Lovable Cloud → Functions → track-chat → Logs. Zoek naar Supabase insert errors 
                                  of validation failures.
                                </p>
                              </li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Separator className="my-6" />

                    <div>
                      <h3 className="font-semibold mb-3">🔍 Debug Checklist</h3>
                      <div className="bg-muted p-4 rounded space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Project ID aanwezig in URL parameter</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Properties gekoppeld aan project in database (project_id match)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Minimaal 1 property met status='available'</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Edge functions deployed en actief (api-projects, api-properties, summarize-investor-page, track-chat)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>LOVABLE_API_KEY geconfigureerd in Supabase secrets</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Browser console checked voor JavaScript errors</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Network tab checked voor failed API calls (429, 402, 500 errors)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>Supabase Edge Function logs bekeken voor backend errors</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>localStorage checked voor visitor_id (viva_visitor_id key)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1" />
                          <span>RLS policies verified voor chat_conversations en chat_messages</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-8">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">Hulp Nodig?</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Als je problemen blijft ondervinden na het doorlopen van deze troubleshooting guide:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Check Lovable Cloud → Functions → Logs voor gedetailleerde error logs</li>
                      <li>• Controleer Lovable Cloud → Database → Tables voor data consistency</li>
                      <li>• Test edge functions individueel via Lovable Cloud → Functions → Test</li>
                      <li>• Raadpleeg de andere proces documentatie voor verwante systemen</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );
}
