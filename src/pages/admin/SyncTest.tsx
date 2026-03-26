import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, RefreshCw, Database, Link, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";


interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface SyncStats {
  total_in_xml?: number;
  new_properties?: number;
  updated_properties?: number;
  price_changes?: number;
  pending_sold?: number;
  confirmed_sold?: number;
  reactivated?: number;
  projects_created?: number;
  projects_updated?: number;
  errors?: number;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_processed: number | null;
  new_count: number | null;
  updated_count: number | null;
  error_count: number | null;
  price_changes: number | null;
  batch_info: any;
}

export default function SyncTest() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [recentSyncLogs, setRecentSyncLogs] = useState<SyncLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchRecentSyncLogs();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchRecentSyncLogs = async () => {
    const { data } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setRecentSyncLogs(data as SyncLog[]);
    }
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString('nl-NL'),
      message,
      type
    };
    setLogs(prev => [...prev, entry]);
  };

  const triggerFullSync = async () => {
    setIsRunning(true);
    setLogs([]);
    setStats(null);
    setProgress(0);
    
    addLog('🚀 Starting sync-redsp-properties-daily...', 'info');
    setCurrentStep('Initiating daily sync orchestrator');

    try {
      // Start polling for sync_logs updates
      const startTime = Date.now();
      pollIntervalRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('sync_logs')
          .select('*')
          .eq('sync_type', 'redsp_daily')
          .order('started_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          const batchInfo = data.batch_info as any;
          if (batchInfo?.percentage) {
            setProgress(batchInfo.percentage);
            setCurrentStep(`Batch ${batchInfo.currentBatch || 0}/${batchInfo.totalBatches || 0}`);
          }
        }
      }, 2000);

      // Invoke the daily sync function
      addLog('📡 Invoking sync-redsp-properties-daily edge function...', 'info');
      
      const { data, error } = await supabase.functions.invoke('sync-redsp-properties-daily');

      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (error) {
        addLog(`❌ Error: ${error.message}`, 'error');
        setCurrentStep('Failed');
      } else if (data?.success) {
        setProgress(100);
        setCurrentStep('Complete');
        
        addLog(`✅ Sync completed successfully in ${duration}s`, 'success');
        
        // Log detailed stats
        const syncStats = data.stats || {};
        addLog(`📊 Properties in XML: ${syncStats.total_in_xml || 0}`, 'info');
        addLog(`➕ New properties: ${syncStats.new_properties || 0}`, 'success');
        addLog(`🔄 Updated properties: ${syncStats.updated_properties || 0}`, 'info');
        addLog(`💰 Price changes: ${syncStats.price_changes || 0}`, 'info');
        
        // Check sold stats
        if (syncStats.pending_sold !== undefined) {
          addLog(`⏳ Pending sold (24h grace): ${syncStats.pending_sold || 0}`, 'warning');
        }
        if (syncStats.confirmed_sold !== undefined) {
          addLog(`🏷️ Confirmed sold: ${syncStats.confirmed_sold || 0}`, 'info');
        }
        if (syncStats.reactivated !== undefined) {
          addLog(`♻️ Reactivated: ${syncStats.reactivated || 0}`, 'success');
        }
        
        // Project stats
        addLog(`🏗️ Projects created: ${syncStats.projects_created || 0}`, 'info');
        addLog(`📝 Projects updated: ${syncStats.projects_updated || 0}`, 'info');
        
        if (syncStats.errors) {
          addLog(`⚠️ Errors: ${syncStats.errors}`, 'warning');
        }

        setStats(syncStats);
      } else {
        addLog(`⚠️ Sync completed with issues: ${data?.error || 'Unknown error'}`, 'warning');
        setCurrentStep('Completed with warnings');
      }

    } catch (err) {
      addLog(`💥 Fatal error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setCurrentStep('Failed');
    } finally {
      setIsRunning(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      fetchRecentSyncLogs();
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-slate-300';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/properties")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Properties
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Sync Test Console</h1>
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Running" : "Ready"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Test de volledige sync flow (sync-redsp-properties-daily) en verifieer de resultaten
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Start Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Sync Control
                </CardTitle>
                <CardDescription>
                  Start de volledige sync flow om de RedSP XML te importeren
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={triggerFullSync} 
                  disabled={isRunning}
                  size="lg"
                  className="w-full"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sync bezig...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Volledige Sync Test
                    </>
                  )}
                </Button>

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{currentStep}</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Console Output */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Console Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={scrollRef}
                  className="bg-slate-900 text-slate-100 font-mono text-sm p-4 rounded-lg h-80 overflow-auto"
                >
                  {logs.length === 0 ? (
                    <p className="text-slate-500">Wacht op sync start...</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="py-0.5">
                        <span className="text-slate-500">[{log.timestamp}]</span>{" "}
                        <span className={getLogColor(log.type)}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Results Card */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Resultaten
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Nieuw" value={stats.new_properties || 0} color="green" />
                    <StatBox label="Bijgewerkt" value={stats.updated_properties || 0} color="blue" />
                    <StatBox label="Prijswijzigingen" value={stats.price_changes || 0} color="purple" />
                    <StatBox label="Pending Sold" value={stats.pending_sold || 0} color="yellow" />
                    <StatBox label="Bevestigd Sold" value={stats.confirmed_sold || 0} color="orange" />
                    <StatBox label="Gereactiveerd" value={stats.reactivated || 0} color="teal" />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Projects +" value={stats.projects_created || 0} color="indigo" />
                    <StatBox label="Projects ↻" value={stats.projects_updated || 0} color="slate" />
                  </div>
                  {stats.errors && stats.errors > 0 && (
                    <>
                      <Separator />
                      <StatBox label="Errors" value={stats.errors} color="red" />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Syncs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recente Syncs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {recentSyncLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Geen recente syncs gevonden</p>
                    ) : (
                      recentSyncLogs.map(log => (
                        <div key={log.id} className="p-2 bg-muted/50 rounded text-sm">
                          <div className="flex items-center justify-between">
                            <Badge variant={log.status === 'success' ? 'default' : log.status === 'running' ? 'secondary' : 'destructive'}>
                              {log.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.started_at)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {log.sync_type} • {log.total_processed || 0} verwerkt
                            {log.new_count ? ` • ${log.new_count} nieuw` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Flow Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Flow Stappen
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <span>XML downloaden & parsen</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <span>Properties batch-gewijs upserten</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <span>Properties linken aan projecten</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <span>Sold-check (24u grace period)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    teal: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color] || colorClasses.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}
