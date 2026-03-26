import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle, XCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MeetingRoom } from "@/components/MeetingRoom";

interface MeetingKnock {
  id: string;
  guest_name: string;
  guest_email: string | null;
  knocked_at: string;
  status: string;
  admitted_at: string | null;
  session_id: string;
}

export default function MeetingsHost() {
  const navigate = useNavigate();
  const [knocks, setKnocks] = useState<MeetingKnock[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Device management state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  useEffect(() => {
    fetchRoomUrl();
    fetchKnocks();
    const unsubscribe = subscribeToKnocks();
    enumerateDevices();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      
      if (videoInputs.length > 0) setSelectedCamera(videoInputs[0].deviceId);
      if (audioInputs.length > 0) setSelectedMic(audioInputs[0].deviceId);
      if (audioOutputs.length > 0) setSelectedSpeaker(audioOutputs[0].deviceId);
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  };

  const fetchRoomUrl = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-whereby-room");
      if (error) throw error;
      setRoomUrl(data.roomUrl);
    } catch (error) {
      console.error("Error fetching Whereby room:", error);
      toast.error("Kon meeting room niet laden");
    }
  };

  const fetchKnocks = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_knocks")
        .select("*")
        .order("knocked_at", { ascending: false });

      if (error) throw error;
      setKnocks(data || []);
    } catch (error) {
      console.error("Error fetching knocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToKnocks = () => {
    const channel = supabase
      .channel("meeting_knocks_host")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_knocks",
        },
        (payload) => {
          const newKnock = payload.new as MeetingKnock;
          setKnocks((prev) => [newKnock, ...prev]);
          
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => console.log("Could not play notification sound"));
          
          toast.info(`${newKnock.guest_name} klopt aan!`, {
            description: "Laat de gast toe via de sidebar",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAdmit = async (knockId: string) => {
    try {
      const { error } = await supabase
        .from("meeting_knocks")
        .update({
          status: "admitted",
          admitted_at: new Date().toISOString(),
          admitted_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", knockId);

      if (error) throw error;

      setKnocks((prev) =>
        prev.map((k) =>
          k.id === knockId
            ? { ...k, status: "admitted", admitted_at: new Date().toISOString() }
            : k
        )
      );

      toast.success("Gast toegelaten tot de meeting");
    } catch (error) {
      console.error("Error admitting guest:", error);
      toast.error("Kon gast niet toelaten");
    }
  };

  const handleReject = async (knockId: string) => {
    try {
      const { error } = await supabase
        .from("meeting_knocks")
        .update({ status: "rejected" })
        .eq("id", knockId);

      if (error) throw error;

      setKnocks((prev) => prev.map((k) => (k.id === knockId ? { ...k, status: "rejected" } : k)));

      toast.info("Gast geweigerd");
    } catch (error) {
      console.error("Error rejecting guest:", error);
      toast.error("Kon gast niet weigeren");
    }
  };

  const waitingKnocks = knocks.filter((k) => k.status === "waiting");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Meeting room laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex">
      {/* Video Room - Full Screen with MeetingRoom controls */}
      <div className="flex-1 relative">
        {roomUrl ? (
          <MeetingRoom
            roomUrl={roomUrl}
            displayName="Lars"
            initialCameraEnabled={true}
            initialMicEnabled={true}
            videoDevices={videoDevices}
            audioDevices={audioDevices}
            audioOutputDevices={audioOutputDevices}
            selectedCamera={selectedCamera}
            selectedMic={selectedMic}
            selectedSpeaker={selectedSpeaker}
            onCameraChange={setSelectedCamera}
            onMicChange={setSelectedMic}
            onSpeakerChange={setSelectedSpeaker}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white bg-black">
            <p>Meeting room kon niet worden geladen</p>
          </div>
        )}
      </div>

      {/* Collapsible Sidebar */}
      <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div
          className={`relative border-l bg-card transition-all duration-300 h-screen flex flex-col ${
            sidebarOpen ? "w-80" : "w-0"
          }`}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -left-8 top-4 h-16 w-8 rounded-l-md rounded-r-none border border-r-0 bg-card hover:bg-accent z-50"
            >
              {sidebarOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="h-full">
            <div className="h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-lg">Host Dashboard</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin/meetings")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                {waitingKnocks.length > 0 && (
                  <Badge variant="secondary" className="gap-2 bg-orange-500/10 text-orange-600">
                    <Bell className="h-3 w-3" />
                    {waitingKnocks.length} wachtend
                  </Badge>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Wachtende Gasten
                  </h3>

                  {waitingKnocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Geen gasten in de wachtrij
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {waitingKnocks.map((knock) => (
                        <div
                          key={knock.id}
                          className="p-3 rounded-lg border bg-background space-y-3"
                        >
                          <div>
                            <p className="font-medium">{knock.guest_name}</p>
                            {knock.guest_email && (
                              <p className="text-xs text-muted-foreground">{knock.guest_email}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              wacht {Math.floor((Date.now() - new Date(knock.knocked_at).getTime()) / 1000 / 60)} min
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAdmit(knock.id)}
                              className="flex-1 gap-2"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Toelaten
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(knock.id)}
                              className="flex-1 gap-2"
                            >
                              <XCircle className="h-3 w-3" />
                              Weigeren
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
