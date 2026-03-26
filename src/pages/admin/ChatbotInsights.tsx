import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, TrendingUp, TrendingDown, Eye, CheckCircle, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';


interface Insight {
  id: string;
  conversation_id: string;
  insight_type: 'success_pattern' | 'failure_pattern' | 'drop_off' | 'improvement_suggestion' | 'weekly_report';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  suggested_fix: string | null;
  affected_step: string | null;
  frequency: number;
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
}

interface QuestionMetric {
  id: string;
  question_type: string;
  total_asked: number;
  total_answered: number;
  drop_off_count: number;
  success_rate: number;
}

const ChatbotInsights = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["admin-chatbot-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_insights')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Insight[];
    },
    enabled: !!session,
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["admin-chatbot-question-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_question_metrics')
        .select('*')
        .order('total_asked', { ascending: false });
      if (error) throw error;
      return (data || []) as QuestionMetric[];
    },
    enabled: !!session,
  });

  const isLoading = insightsLoading || metricsLoading;

  const updateInsightStatus = async (insightId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_insights')
        .update({ 
          status,
          admin_notes: notes || null 
        })
        .eq('id', insightId);

      if (error) throw error;

      toast.success('Insight status bijgewerkt');
      queryClient.invalidateQueries({ queryKey: ["admin-chatbot-insights"] });
      setSelectedInsight(null);
    } catch (error) {
      console.error('Error updating insight:', error);
      toast.error('Fout bij bijwerken insight');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      default:
        return <TrendingUp className="h-5 w-5 text-info" />;
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getAnswerRate = (metric: QuestionMetric) => {
    if (metric.total_asked === 0) return 0;
    return Math.round((metric.total_answered / metric.total_asked) * 100);
  };

  const getDropOffRate = (metric: QuestionMetric) => {
    if (metric.total_asked === 0) return 0;
    return Math.round((metric.drop_off_count / metric.total_asked) * 100);
  };

  const newInsights = insights.filter(i => i.status === 'new');
  const successPatterns = insights.filter(i => i.insight_type === 'success_pattern');

  const questionTypeLabels: Record<string, string> = {
    budget: 'Budget Vraag',
    region: 'Regio Vraag',
    investment_goal: 'Doelstelling Vraag',
    timeline: 'Timeline Vraag',
    call_booking: 'Call Booking',
    opinion: 'Project Mening'
  };

  if (loading) {
    return (
      <div className="py-8">
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">AI Chatbot Insights</h1>
        <div className="space-y-6">
        {/* Question Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Vraag Performance
            </CardTitle>
            <CardDescription>
              Hoe goed presteert elke vraag in de chatbot flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : metrics.length === 0 ? (
              <p className="text-muted-foreground">Nog geen metrics beschikbaar</p>
            ) : (
              metrics.map(metric => {
                const answerRate = getAnswerRate(metric);
                const dropOffRate = getDropOffRate(metric);
                
                return (
                  <div key={metric.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {questionTypeLabels[metric.question_type] || metric.question_type}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {answerRate}% beantwoord
                        </span>
                        {dropOffRate > 20 && (
                          <Badge variant="destructive">
                            {dropOffRate}% drop-off
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={answerRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {metric.total_asked} keer gesteld · {metric.total_answered} beantwoord
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* New Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nieuwe Insights ({newInsights.length})
            </CardTitle>
            <CardDescription>
              AI-gegenereerde observaties en suggesties uit recente gesprekken
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : newInsights.length === 0 ? (
              <p className="text-muted-foreground">Geen nieuwe insights</p>
            ) : (
              newInsights.map(insight => (
                <Card key={insight.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(insight.severity)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(insight.severity)}>
                              {insight.severity.toUpperCase()}
                            </Badge>
                            {insight.affected_step && (
                              <Badge variant="outline">
                                {questionTypeLabels[insight.affected_step] || insight.affected_step}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{insight.title}</h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>

                    {insight.suggested_fix && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">AI Suggestie:</p>
                        <p className="text-sm">{insight.suggested_fix}</p>
                      </div>
                    )}

                    {insight.frequency > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Frequentie: {insight.frequency}x waargenomen
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInsight(insight);
                          setAdminNotes(insight.admin_notes || '');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Bekijk Gesprek
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInsightStatus(insight.id, 'reviewed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Markeer als Bekeken
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateInsightStatus(insight.id, 'dismissed')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Negeer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Positive Patterns */}
        {successPatterns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Positieve Patronen
              </CardTitle>
              <CardDescription>
                Wat werkt goed in de chatbot gesprekken
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {successPatterns.slice(0, 3).map(insight => (
                <div key={insight.id} className="bg-success/10 p-4 rounded-md border border-success/20">
                  <p className="font-medium text-success mb-1">🎉 {insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      </div>

      {/* Insight Detail Dialog */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Insight Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Admin Notities</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Voeg notities toe over deze insight..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInsight(null)}
                >
                  Annuleren
                </Button>
                <Button
                  onClick={() => updateInsightStatus(selectedInsight.id, 'reviewed', adminNotes)}
                >
                  Opslaan & Markeer als Bekeken
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ChatbotInsights;