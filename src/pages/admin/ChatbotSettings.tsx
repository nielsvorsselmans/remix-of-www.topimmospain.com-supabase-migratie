import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, Loader2, ChevronDown, AlertCircle, CheckCircle2, Clock, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
  requires_data: any;
  parameters_schema: any;
  order_priority: number;
  updated_at: string;
  documentation?: any;
}

interface FlowDocumentation {
  full_description?: string;
  triggers?: string[];
  preconditions?: string[];
  dependencies?: string[];
  steps?: Array<{
    number: number;
    description: string;
    options?: string[];
  }>;
  warning_notes?: string[];
}

interface ChatbotSetting {
  id: string;
  setting_key: string;
  enabled: boolean;
  display_name: string;
  description: string;
  order_index: number;
  updated_at: string;
  documentation?: FlowDocumentation;
}

// Mermaid flow diagrams - nieuwe hybride architectuur
const FLOW_DIAGRAMS: Record<string, string> = {
  hybrid_architecture: `graph TD
    A[Bezoeker op Project Pagina] --> B{Ingelogd?}
    B -->|Nee| C[Account Aanmaak Flow]
    B -->|Ja| D[Check Kwalificatie Status]
    
    C --> E[Registratie/Login]
    E -->|Succes| D
    
    D --> F{Kwalificatie ≥80%?}
    F -->|Nee| G[Lead Kwalificatie Flow]
    F -->|Ja| H[AI Agent Mode]
    
    G --> G1[Vraag: Budget]
    G1 --> G2[Vraag: Regio]
    G2 --> G3[Vraag: Doel]
    G3 --> G4[Vraag: Timeline]
    G4 --> H
    
    H --> H1{AI Kiest Tool}
    H1 --> T1[🏠 Projecten Voorstellen]
    H1 --> T2[📞 Videocall Inplannen]
    H1 --> T3[❓ Vraag Beantwoorden]
    
    style G fill:#e3f2fd
    style H fill:#f3e5f5
    style T1 fill:#fff3e0
    style T2 fill:#fff3e0
    style T3 fill:#fff3e0`,
    
  flow_account_creation: `graph TD
    A[Niet-ingelogde bezoeker] --> B[Chatbot geopend]
    B --> C[Toon welkomst + tabs]
    C --> D{Gebruiker kiest}
    D -->|Signup tab| E[Voornaam + Achternaam]
    E --> F[Email + Wachtwoord]
    F --> G[Registratie]
    D -->|Login tab| H[Email + Wachtwoord]
    H --> I[Inloggen]
    G --> J[Authenticatie succes]
    I --> J
    J --> K[→ Start Lead Kwalificatie]
    
    style J fill:#c8e6c9
    style K fill:#e3f2fd`,
    
  flow_lead_qualification: `graph TD
    A[Start Kwalificatie] --> B[Check user_preferences]
    B --> C{Budget bekend?}
    C -->|Nee| D[Vraag Budget]
    C -->|Ja| E{Regio bekend?}
    D --> E
    E -->|Nee| F[Vraag Regio]
    E -->|Ja| G{Doel bekend?}
    F --> G
    G -->|Nee| H[Vraag Investment Goal]
    G -->|Ja| I{Timeline bekend?}
    H --> I
    I -->|Nee| J[Vraag Timeline]
    I -->|Ja| K[Bereken Score]
    J --> K
    K --> L{Score ≥80%?}
    L -->|Ja| M[→ AI Agent Mode]
    L -->|Nee| N[Volgende Vraag]
    N --> C
    
    style M fill:#f3e5f5
    style K fill:#fff9c4`,
    
  ai_agent_mode: `graph TD
    A[AI Agent Mode] --> B[Ontvang User Input]
    B --> C[Check Enabled Tools]
    C --> D{AI Analyseert Context}
    
    D -->|Budget mismatch| E[suggest_matching_projects]
    D -->|Sterke interesse| F[schedule_video_call]
    D -->|Vraag gesteld| G[answer_question]
    
    E --> H[Toon Project Cards]
    F --> I[Start Call Booking]
    G --> J[Toon Antwoord]
    
    H --> K[Wacht op Volgende Input]
    I --> K
    J --> K
    K --> B
    
    style D fill:#f3e5f5
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#fff3e0`,
};

export default function ChatbotSettings() {
  const queryClient = useQueryClient();
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-chatbot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return (data || []).map(setting => ({
        ...setting,
        documentation: setting.documentation as FlowDocumentation
      })) as ChatbotSetting[];
    },
  });

  const { data: agentTools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ["admin-chatbot-agent-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_agent_tools')
        .select('*')
        .order('order_priority');
      if (error) throw error;
      return (data || []) as AgentTool[];
    },
  });

  const loading = settingsLoading || toolsLoading;

  const handleToolToggle = async (toolId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbot_agent_tools')
        .update({ is_enabled: !currentEnabled })
        .eq('id', toolId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-chatbot-agent-tools"] });
      toast.success(!currentEnabled ? 'Tool geactiveerd' : 'Tool gedeactiveerd');
    } catch (error) {
      console.error('Error updating agent tool:', error);
      toast.error('Fout bij bijwerken tool');
    }
  };

  const handleToggle = async (settingKey: string, currentEnabled: boolean) => {
    setUpdatingKeys(prev => new Set(prev).add(settingKey));

    try {
      const { error } = await supabase
        .from('chatbot_settings')
        .update({ 
          enabled: !currentEnabled,
          updated_by: user?.id 
        })
        .eq('setting_key', settingKey);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-chatbot-settings"] });
      toast.success(!currentEnabled ? 'Flow geactiveerd' : 'Flow gedeactiveerd');
    } catch (error) {
      console.error('Error updating chatbot setting:', error);
      toast.error('Fout bij bijwerken instelling');
    } finally {
      setUpdatingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(settingKey);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Chatbot Instellingen</h1>
          <p className="text-muted-foreground">
            Hybride architectuur: Gestructureerde Lead Kwalificatie → AI Agent met Tools
          </p>
        </div>

        {/* Hybride Architectuur Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Hybride Chatbot Architectuur
            </CardTitle>
            <CardDescription>
              Twee-fasen systeem: vaste kwalificatievragen gevolgd door intelligente AI agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Fase 1: Lead Kwalificatie</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  Vaste sequentiële flow die essentiële voorkeuren verzamelt
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>✓ Budget range</li>
                  <li>✓ Regio voorkeuren</li>
                  <li>✓ Investeringsdoel</li>
                  <li>✓ Tijdlijn</li>
                </ul>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Fase 2: AI Agent Mode</h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                  AI kiest dynamisch uit beschikbare tools (bij ≥80% kwalificatie)
                </p>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>🏠 Projecten voorstellen</li>
                  <li>📞 Videocall inplannen</li>
                  <li>❓ Vragen beantwoorden</li>
                </ul>
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 font-medium hover:underline">
                <ChevronDown className="h-4 w-4" />
                Bekijk architectuur diagram
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs">{FLOW_DIAGRAMS.hybrid_architecture}</pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Basis Flows (Fase 1) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Basis Flows (Fase 1)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Deze flows moeten doorlopen worden voordat de AI Agent mode (Fase 2) actief wordt
            </p>
          </div>
          {settings.map((setting) => {
            const isUpdating = updatingKeys.has(setting.setting_key);
            const docs = setting.documentation;
            const diagram = FLOW_DIAGRAMS[setting.setting_key];
            
            return (
              <Card key={setting.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          {setting.display_name}
                        </CardTitle>
                        <Badge variant={setting.enabled ? "default" : "secondary"}>
                          {setting.enabled ? "Actief" : "Inactief"}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {setting.description}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={() => handleToggle(setting.setting_key, setting.enabled)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-4">
                  {docs && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        <ChevronDown className="h-4 w-4" />
                        Bekijk volledige documentatie
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-4">
                        {docs.full_description && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              Beschrijving
                            </h4>
                            <p className="text-sm text-muted-foreground">{docs.full_description}</p>
                          </div>
                        )}

                        {docs.triggers && docs.triggers.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Wanneer wordt deze getriggerd?
                            </h4>
                            <ul className="space-y-1">
                              {docs.triggers.map((trigger, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {trigger}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {docs.preconditions && docs.preconditions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Vereiste voorwaarden
                            </h4>
                            <ul className="space-y-1">
                              {docs.preconditions.map((condition, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-yellow-500">•</span>
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {docs.dependencies && docs.dependencies.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Afhankelijkheden
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {docs.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="outline">{dep}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {docs.steps && docs.steps.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Flow Stappen</h4>
                            <div className="space-y-2">
                              {docs.steps.map((step, idx) => (
                                <div key={idx} className="pl-4 border-l-2 border-border">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-mono text-muted-foreground mt-0.5">
                                      {step.number}.
                                    </span>
                                    <p className="text-sm flex-1">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {docs.warning_notes && docs.warning_notes.length > 0 && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <ul className="space-y-1 mt-1">
                                {docs.warning_notes.map((note, idx) => (
                                  <li key={idx} className="text-sm">⚠️ {note}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {diagram && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Flow Diagram</h4>
                            <div className="bg-muted/30 p-4 rounded-lg overflow-x-auto">
                              <pre className="text-xs font-mono text-muted-foreground whitespace-pre">
                                {diagram}
                              </pre>
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Laatst gewijzigd: {formatDate(setting.updated_at)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* AI Agent Mode Diagram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Agent Mode
            </CardTitle>
            <CardDescription>
              Hoe de AI intelligente beslissingen neemt op basis van context en beschikbare tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs">{FLOW_DIAGRAMS.ai_agent_mode}</pre>
            </div>
          </CardContent>
        </Card>

        {/* AI Agent Tools Section (Fase 2) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI Agent Tools (Fase 2)
            </CardTitle>
            <CardDescription>
              Na ≥80% kwalificatie schakelt de chatbot naar AI Agent mode. De AI selecteert dynamisch welke tool het beste past bij de gebruiker input en context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentTools.map((tool) => (
              <Card key={tool.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {tool.display_name}
                        </CardTitle>
                        <Badge variant={tool.is_enabled ? "default" : "secondary"}>
                          {tool.is_enabled ? "Actief" : "Inactief"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {tool.description}
                      </CardDescription>
                    </div>
                    
                    <Switch
                      checked={tool.is_enabled}
                      onCheckedChange={() => handleToolToggle(tool.id, tool.is_enabled)}
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {tool.documentation && (
                    <Collapsible className="mt-3">
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <ChevronDown className="h-4 w-4" />
                        Bekijk tool documentatie
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3 text-sm">
                        {tool.documentation.full_description && (
                          <div>
                            <strong className="text-foreground">Beschrijving:</strong>
                            <p className="text-muted-foreground mt-1">{tool.documentation.full_description}</p>
                          </div>
                        )}
                        
                        {tool.documentation.triggers && Array.isArray(tool.documentation.triggers) && (
                          <div>
                            <strong className="text-foreground">Triggers:</strong>
                            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                              {tool.documentation.triggers.map((trigger: string, idx: number) => (
                                <li key={idx}>{trigger}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {tool.documentation.preconditions && Array.isArray(tool.documentation.preconditions) && (
                          <div>
                            <strong className="text-foreground">Precondities:</strong>
                            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                              {tool.documentation.preconditions.map((precondition: string, idx: number) => (
                                <li key={idx}>{precondition}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {tool.documentation.output_format && (
                          <div>
                            <strong className="text-foreground">Output Formaat:</strong>
                            <p className="text-muted-foreground mt-1">{tool.documentation.output_format}</p>
                          </div>
                        )}
                        
                        {tool.documentation.edge_function && (
                          <div>
                            <strong className="text-foreground">Edge Function:</strong>
                            <code className="text-xs bg-muted px-2 py-1 rounded ml-2">{tool.documentation.edge_function}</code>
                          </div>
                        )}
                        
                        {tool.documentation.fallback_behavior && (
                          <div>
                            <strong className="text-foreground">Fallback:</strong>
                            <p className="text-muted-foreground mt-1">{tool.documentation.fallback_behavior}</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Laatst gewijzigd: {formatDate(tool.updated_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Belangrijk:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Wijzigingen zijn direct live op de website</li>
              <li>• Lead Kwalificatie moet ≥80% compleet zijn voordat AI Agent tools beschikbaar komen</li>
              <li>• Uitschakelen van Lead Kwalificatie blokkeert toegang tot alle AI Agent functies</li>
              <li>• Account Creation is vereist voor niet-ingelogde gebruikers om toegang te krijgen</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
