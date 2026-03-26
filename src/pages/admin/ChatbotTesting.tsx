import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProjectChatbot } from "@/components/ProjectChatbot";
import { UnifiedChatbot } from "@/components/UnifiedChatbot";
import { useUnifiedChatContext } from "@/contexts/UnifiedChatContext";
import { RefreshCw, TestTube, Info } from "lucide-react";

type ChatbotType = 'project' | 'unified';

export default function ChatbotTesting() {
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotType>('unified');
  const [testAsLoggedIn, setTestAsLoggedIn] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  
  const chatState = useUnifiedChatContext();

  const handleReset = () => {
    chatState.resetChat();
    setResetKey(prev => prev + 1);
  };

  const renderSelectedChatbot = () => {
    switch (selectedChatbot) {
      case 'project':
        return (
          <div className="max-w-md mx-auto" key={`project-${resetKey}`}>
            <ProjectChatbot
              projectId="test-project-id"
              projectName="Test Project (Los Alcázares)"
              projectPrice={269000}
            />
          </div>
        );
      
      case 'unified':
        return (
          <div className="max-w-md mx-auto" key={`unified-${resetKey}`}>
            <Card className="border-border p-6">
              <p className="text-sm text-muted-foreground mb-4">
                De floating UnifiedChatbot verschijnt normaal rechtsonder op alle pagina's.
                Hier kun je de conversatie flow testen in geïsoleerde omgeving.
              </p>
              <UnifiedChatbot embedded />
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Chatbot Testing Omgeving</h1>
        <p className="text-muted-foreground">
          Test en train de verschillende chatbot componenten in een veilige omgeving
        </p>
      </div>

      {/* Alert - Chatbot Status */}
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          De chatbot is momenteel <strong>uitgeschakeld</strong> voor bezoekers op de publieke website.
          Je kunt hier rustig testen zonder dat bezoekers dit zien.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel: Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Configuratie
            </CardTitle>
            <CardDescription>
              Kies welke chatbot je wilt testen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chatbot Selector */}
            <div className="space-y-2">
              <Label>Chatbot Component</Label>
              <Select value={selectedChatbot} onValueChange={(value) => setSelectedChatbot(value as ChatbotType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unified">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Unified Chatbot</span>
                      <span className="text-xs text-muted-foreground">Floating bubble (global)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="project">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Project Chatbot</span>
                      <span className="text-xs text-muted-foreground">Feedback collection flow</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* User Mode Toggle */}
            <div className="space-y-3">
              <Label>Test Modus</Label>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {testAsLoggedIn ? "Ingelogde gebruiker" : "Anonieme bezoeker"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {testAsLoggedIn ? "Test met user context" : "Test zonder login"}
                  </span>
                </div>
                <Switch
                  checked={testAsLoggedIn}
                  onCheckedChange={setTestAsLoggedIn}
                />
              </div>
            </div>

            <Separator />

            {/* Reset Button */}
            <Button 
              onClick={handleReset}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Conversatie
            </Button>

            <Separator />

            {/* Debug Info */}
            <div className="space-y-2">
              <Label>Debug Informatie</Label>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Step:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {chatState.currentStep || 'none'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages Count:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {chatState.messages.length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Typing:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {chatState.isTyping ? 'true' : 'false'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initialized:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {chatState.isInitialized ? 'true' : 'false'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qualification:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {chatState.qualificationProgress}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Chatbot Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Test de chatbot interacties en flows
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[600px] flex items-center justify-center bg-muted/20">
            {renderSelectedChatbot()}
          </CardContent>
        </Card>
      </div>

      {/* Chat Data Inspector */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Data Inspector</CardTitle>
          <CardDescription>
            Bekijk de verzamelde data tijdens de conversatie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(chatState.chatData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>
            Volledige conversatie geschiedenis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {chatState.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nog geen berichten - start de conversatie om de flow te testen
              </p>
            ) : (
              chatState.messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`p-3 rounded-lg ${
                    msg.type === 'assistant' 
                      ? 'bg-muted' 
                      : 'bg-primary/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <Badge variant={msg.type === 'assistant' ? 'secondary' : 'default'} className="text-xs">
                      {msg.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </div>
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.options.map((opt, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {opt.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
