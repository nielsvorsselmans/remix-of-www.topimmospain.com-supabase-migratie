import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface GoogleBusinessConnection {
  id: string;
  account_id: string;
  account_name: string | null;
  location_id: string;
  location_name: string | null;
  token_expires_at: string;
  last_sync_at: string | null;
  total_reviews_synced: number;
  created_at: string;
}

export const GoogleBusinessConnectionCard = () => {
  const [connection, setConnection] = useState<GoogleBusinessConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchConnection();
    
    // Check for connection success from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_business') === 'connected') {
      toast.success('Google Business verbonden!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchConnection();
    }
  }, []);

  const fetchConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('google_business_connections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error fetching connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Je moet ingelogd zijn');
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-oauth-start', {
        body: { origin: window.location.origin }
      });

      if (error) throw error;
      
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('Error starting OAuth:', error);
      toast.error('Fout bij starten van Google verbinding');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    
    try {
      const { error } = await supabase
        .from('google_business_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;
      
      setConnection(null);
      toast.success('Google Business verbinding verwijderd');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Fout bij verwijderen van verbinding');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-reviews-weekly');

      if (error) throw error;
      
      toast.success(`Sync voltooid: ${data.imported} nieuwe reviews geïmporteerd`);
      fetchConnection();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Fout bij synchroniseren');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isTokenValid = connection && new Date(connection.token_expires_at) > new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <CardTitle className="text-lg">Google Business Profile</CardTitle>
          </div>
          {connection ? (
            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verbonden
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Niet verbonden
            </Badge>
          )}
        </div>
        <CardDescription>
          {connection 
            ? 'Volledige toegang tot alle Google Reviews van je bedrijf'
            : 'Verbind om toegang te krijgen tot alle reviews (niet alleen de laatste 5)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Locatie</p>
                <p className="font-medium">{connection.location_name || 'Onbekend'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">{connection.account_name || 'Onbekend'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Laatste sync</p>
                <p className="font-medium">
                  {connection.last_sync_at 
                    ? format(new Date(connection.last_sync_at), "d MMM yyyy 'om' HH:mm", { locale: nl })
                    : 'Nog niet gesynchroniseerd'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Reviews geïmporteerd</p>
                <p className="font-medium">{connection.total_reviews_synced}</p>
              </div>
            </div>

            {!isTokenValid && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Token is verlopen. Verbind opnieuw voor automatische sync.</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSyncNow} 
                disabled={syncing}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Synchroniseren...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nu synchroniseren
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Vereisten:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Je moet eigenaar of beheerder zijn van het Google Business Profile</li>
                <li>OAuth 2.0 Client ID en Secret moeten geconfigureerd zijn</li>
                <li>Google Business Profile API moet ingeschakeld zijn in Google Cloud</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verbinden...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Verbind met Google Business
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              <a 
                href="https://console.cloud.google.com/apis/library" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                Google Cloud Console openen
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
