import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Video, Clock, CheckCircle, XCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MeetingKnock {
  id: string;
  guest_name: string;
  guest_email: string | null;
  knocked_at: string;
  status: string;
  admitted_at: string | null;
  session_id: string;
}

export default function Meetings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: knocks = [], isLoading: loading } = useQuery({
    queryKey: ["admin-meeting-knocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_knocks")
        .select("*")
        .order("knocked_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MeetingKnock[];
    },
  });

  // Realtime subscription for new knocks
  useEffect(() => {
    const channel = supabase
      .channel("meeting_knocks_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_knocks",
        },
        (payload) => {
          const newKnock = payload.new as MeetingKnock;
          queryClient.invalidateQueries({ queryKey: ["admin-meeting-knocks"] });
          
          // Play notification sound
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => console.log("Could not play notification sound"));
          
          toast.info(`${newKnock.guest_name} klopt aan!`, {
            description: "Ga naar het gesprek om toegang te verlenen",
            action: {
              label: "Ga naar gesprek",
              onClick: () => navigate("/admin/meetings/host"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, navigate]);

  const waitingKnocks = knocks.filter((k) => k.status === "waiting");
  const recentKnocks = knocks.filter((k) => k.status !== "waiting").slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Gesprekken</h1>
        <p className="text-muted-foreground mt-2">
          Beheer je videocalls en bekijk aankomende afspraken
        </p>
      </div>

      {/* Start Video Call Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Start Videocall</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Open de meeting room in fullscreen om gasten te ontvangen
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={() => navigate("/admin/meetings/host")}
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Start Gesprek
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waiting Guests */}
      {waitingKnocks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <CardTitle>Wachtende Gasten</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                {waitingKnocks.length} wachtend
              </Badge>
            </div>
            <CardDescription>
              Deze gasten wachten op toegang tot de meeting room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingKnocks.map((knock) => (
                <div
                  key={knock.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{knock.guest_name}</p>
                    {knock.guest_email && (
                      <p className="text-sm text-muted-foreground">{knock.guest_email}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        wacht {(() => { const mins = Math.floor((Date.now() - new Date(knock.knocked_at).getTime()) / 1000 / 60); return mins < 1 ? '< 1' : mins; })()} min
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin/meetings/host")}
                  >
                    Ga naar gesprek
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle>Recente Gesprekken</CardTitle>
          <CardDescription>
            Overzicht van afgelopen meeting requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentKnocks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nog geen recente gesprekken
            </p>
          ) : (
            <div className="space-y-2">
              {recentKnocks.map((knock) => (
                <div
                  key={knock.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {knock.status === "admitted" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{knock.guest_name}</p>
                      {knock.guest_email && (
                        <p className="text-xs text-muted-foreground">{knock.guest_email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(knock.knocked_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <Badge variant={knock.status === "admitted" ? "default" : "secondary"} className="text-xs mt-1">
                      {knock.status === "admitted" ? "Toegelaten" : "Geweigerd"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
