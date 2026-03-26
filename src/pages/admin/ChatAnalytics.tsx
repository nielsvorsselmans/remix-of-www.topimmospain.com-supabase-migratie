import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import type { Json } from "@/integrations/supabase/types";

interface ChatConversation {
  id: string;
  visitor_id: string;
  project_id: string;
  bot_type: string;
  started_at: string;
  completed_at: string | null;
  converted: boolean;
  metadata: Json;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata: Json;
  created_at: string;
}

interface DropOffStats {
  step: string;
  count: number;
  percentage: number;
}

export default function ChatAnalytics() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["admin-chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ChatConversation[];
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-chat-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ChatMessage[];
    },
  });

  const loading = conversationsLoading || messagesLoading;

  // Calculate statistics
  const totalConversations = conversations.length;
  const completedConversations = conversations.filter(c => c.completed_at).length;
  const convertedConversations = conversations.filter(c => c.converted).length;
  const conversionRate = totalConversations > 0 ? ((convertedConversations / totalConversations) * 100).toFixed(1) : '0';

  // Usage type distribution (from metadata)
  const usageTypeStats = conversations.reduce((acc, conversation) => {
    const metadata = conversation.metadata as any;
    const usageType = metadata?.usage_type;
    if (usageType) {
      acc[usageType] = (acc[usageType] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Drop-off analysis (from message metadata)
  const dropOffStats: DropOffStats[] = [];
  const stepCounts: Record<string, number> = {};
  
  messages.forEach(msg => {
    const metadata = msg.metadata as any;
    if (msg.role === 'user' && metadata?.step) {
      const step = metadata.step;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    }
  });

  const totalStarts = conversations.length;
  Object.entries(stepCounts).forEach(([step, count]) => {
    dropOffStats.push({
      step,
      count,
      percentage: totalStarts > 0 ? (count / totalStarts) * 100 : 0
    });
  });

  dropOffStats.sort((a, b) => b.count - a.count);

  // Get messages for selected conversation
  const conversationMessages = selectedConversation 
    ? messages.filter(m => m.conversation_id === selectedConversation).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{totalConversations} conversaties</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Conversaties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Afgerond</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedConversations}</div>
            <p className="text-xs text-muted-foreground">
              {totalConversations > 0 ? ((completedConversations / totalConversations) * 100).toFixed(1) : 0}% van totaal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversies</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedConversations}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversie Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="dropoff">Drop-off Analyse</TabsTrigger>
          <TabsTrigger value="sessions">Sessies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gebruik Type Verdeling</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(usageTypeStats).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} conversaties
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {totalConversations > 0 ? ((count / totalConversations) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dropoff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Waar Haken Mensen Af?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dropOffStats.map((stat) => (
                  <div key={stat.step} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{stat.step}</span>
                      <span className="text-sm text-muted-foreground">
                        {stat.count} / {totalStarts} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recente Conversaties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {conversations.slice(0, 50).map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === conversation.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {format(new Date(conversation.started_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                        </span>
                        {conversation.converted ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {(conversation.metadata as any)?.usage_type && (
                          <Badge variant="outline" className="text-xs">
                            {(conversation.metadata as any).usage_type}
                          </Badge>
                        )}
                        {(conversation.metadata as any)?.email && (
                          <span>{(conversation.metadata as any).email}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chat Conversatie</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.role === 'assistant'
                              ? 'bg-primary/10'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {(msg.metadata as any)?.step || msg.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                    <p>Selecteer een conversatie om de berichten te bekijken</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
