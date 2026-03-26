import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AudioLevelMeter } from "@/components/AudioLevelMeter";
import { MeetingRoom } from "@/components/MeetingRoom";
import { useAuth } from "@/hooks/useAuth";
import { Video, VideoOff, Mic, MicOff, Phone, Volume2, Camera, Loader2, Clock, Monitor, MessageSquare, Settings, Maximize, Minimize, Hand, Smile } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const Meeting = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    profile
  } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [inMeeting, setInMeeting] = useState(false);

  // Fetch room URL
  useEffect(() => {
    const fetchRoomUrl = async () => {
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('get-whereby-room');
        if (error) throw error;
        if (!data?.roomUrl) throw new Error('No room URL');
        setRoomUrl(data.roomUrl);
      } catch (error) {
        console.error('Failed to fetch room URL:', error);
        toast({
          title: "Meeting kon niet worden geladen",
          description: "Probeer de pagina te verversen.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRoomUrl();
  }, []); // Only fetch once on mount

  // Auto-fill display name from profile or sessionStorage
  useEffect(() => {
    const storedName = sessionStorage.getItem('meeting_user_name');
    if (storedName) {
      setDisplayName(storedName);
    } else if (profile?.first_name && profile?.last_name) {
      setDisplayName(`${profile.first_name} ${profile.last_name}`);
    }
  }, [profile]);
  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      if (videoInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedMic) {
        setSelectedMic(audioInputs[0].deviceId);
      }
      if (audioOutputs.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      toast({
        title: "Fout bij ophalen apparaten",
        description: "Kon camera en microfoon niet detecteren.",
        variant: "destructive"
      });
    }
  };

  // Get local media stream in lobby
  useEffect(() => {
    if (inMeeting) return;
    const getLocalStream = async () => {
      try {
        // Stop previous stream first
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const constraints: MediaStreamConstraints = {
          video: selectedCamera ? {
            deviceId: {
              exact: selectedCamera
            }
          } : true,
          audio: selectedMic ? {
            deviceId: {
              exact: selectedMic
            }
          } : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
        await enumerateDevices();
      } catch (error) {
        console.error('Failed to get media devices:', error);
        toast({
          title: "Camera/microfoon toegang geweigerd",
          description: "Sta toegang toe om deel te nemen.",
          variant: "destructive"
        });
      }
    };
    getLocalStream();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [inMeeting, selectedCamera, selectedMic]);

  // Update video element when stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (video && localStream) {
      video.srcObject = localStream;
    }
    
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [localStream]);

  // Cleanup on page exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[Meeting] Page unload - stopping all streams');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also stop stream on component unmount
      if (localStreamRef.current) {
        console.log('[Meeting] Component unmount - stopping streams');
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  const toggleCameraLobby = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };
  const toggleMicLobby = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };
  const joinMeeting = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Naam vereist",
        description: "Vul je naam in om deel te nemen.",
        variant: "destructive"
      });
      return;
    }
    setWaitingForAdmission(true);
    try {
      const {
        error
      } = await supabase.from('meeting_knocks').insert({
        guest_name: displayName,
        session_id: sessionId
      });
      if (error) throw error;
      toast({
        title: "Wachten op toelating",
        description: "De host zal je zo toelaten tot het gesprek."
      });
    } catch (error) {
      console.error('Error knocking:', error);
      toast({
        title: "Fout",
        description: "Kon niet aankloppen. Probeer opnieuw.",
        variant: "destructive"
      });
      setWaitingForAdmission(false);
    }
  };

  // Subscribe to admission status updates
  useEffect(() => {
    if (!waitingForAdmission) return;
    console.log('Setting up realtime subscription for session:', sessionId);
    const channel = supabase.channel(`knock-${sessionId}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'meeting_knocks',
      filter: `session_id=eq.${sessionId}`
    }, (payload: any) => {
      console.log('Received realtime update:', payload);
      if (payload.new.status === 'admitted') {
        console.log('Admission granted! Joining meeting...');
        // Stop lobby stream using ref
        if (localStreamRef.current) {
          console.log('[Meeting] Stopping lobby stream before joining meeting');
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        setLocalStream(null);
        // Small delay to let stream fully stop
        setTimeout(() => {
          sessionStorage.setItem('meeting_user_name', displayName);
          setInMeeting(true);
          setWaitingForAdmission(false);
        }, 100);
      }
    }).subscribe(status => {
      console.log('Subscription status:', status);
    });
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [waitingForAdmission, sessionId, displayName]);
  const testSpeakers = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ4NVqzn77BdGAc/ltr0yHoqBCR+zPLaizsIGGS57OihUhELTqXh8bllHAY2j9bz0H0vBSp6yfDekj4JGGu98eOXTw0NVKvl8LNfGgg9lNv1yXwrBSV/zvPajjcHHGu+8eScUBENUKjj8bhmHQc2kdfy0n4vBSl5yPDdlD4JGGq98OSaTxENVavk8bVhGgk9lt31zX4sBSaBzvPajjYIHG6+8eSdTxENUavo8bhmHAY3lNvy0oAuBSp6yfDdlT8KGWu98eScTxANVqzk8LVgGQc+l9330X0qBCh/zvLajzcGHW/A7+SbUBBZIj+T2/LPezAFIYDP8dyRQAkSYrfq6qVSFApEoeHyumwfBjKM1PPHQS8HJ33K8dyUPAsUX7Xt66hTEgpFouPyu28gBzKO1fPKgjEGKH7M8dx+PggYZ7vu5p1RDw1Wren0sF8bCDyU2fXNfS0EJoHO89qPNQgcb77y5JhQEQ1Vq+TyslwaCTyW3PTNfywGI3/O89qPNgcca77y5JxPEQ5Wq+TysmAfCT2Y3fPNfSsFJH/P89qONQgbbb7x5JtQEAxVrOTzsl4aCDuV3PTOgC0FJoHN89uPNQcbbL7x5JtPEw5WrOPyslwaCjyU2/POfi0FJoHN89uONQccbb3x5JxPFA5VrOPyslsaCT2U3PPOfy4FJoHO89uPNgcca77x5JtQEAxVrOPysFsaCT2V3PPOETEFF4DO89uPNQgcbb7y5JtPEg5VrOTysVsaCC");
    audio.play().catch(() => {
      toast({
        title: "Speaker test mislukt",
        description: "Kon testgeluid niet afspelen",
        variant: "destructive"
      });
    });
    toast({
      title: "🔊 Speaker test",
      description: "Als je een geluid hoorde, werken je speakers!"
    });
  };
  const switchDevice = (type: 'video' | 'audio') => (deviceId: string) => {
    if (type === 'video') {
      setSelectedCamera(deviceId);
    } else {
      setSelectedMic(deviceId);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Meeting voorbereiden...</p>
        </div>
      </div>;
  }

  // Lobby View - Split Screen
  if (!inMeeting) {
    return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground shadow-elegant">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">Top Immo Spain </h1>
            <p className="text-sm opacity-90">Oriëntatiegesprek</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-8">
          {/* Split Screen Layout */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Video Preview */}
            <Card className="p-6 shadow-elegant bg-card/50 backdrop-blur-sm">
              <Label className="text-lg font-semibold mb-4 block text-foreground">Camera Preview</Label>
              <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden shadow-soft border border-border">
                {localStream && cameraEnabled ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <VideoOff className="w-16 h-16 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Camera uitgeschakeld</p>
                    </div>
                  </div>}
                
                {/* Camera Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cameraEnabled ? <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-soft">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Camera aan</span>
                      </div> : <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-soft">
                        <VideoOff className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium">Camera uit</span>
                      </div>}
                  </div>
                  
                  <Button variant={cameraEnabled ? "secondary" : "destructive"} size="icon" className="shadow-soft" onClick={toggleCameraLobby}>
                    {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Audio Preview */}
              <div className="mt-6">
                <Label className="text-lg font-semibold mb-4 block text-foreground">Audio</Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {micEnabled ? <>
                          <Mic className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium">Microfoon aan</span>
                        </> : <>
                          <MicOff className="w-5 h-5 text-destructive" />
                          <span className="text-sm font-medium">Microfoon uit</span>
                        </>}
                    </div>
                    <Button variant={micEnabled ? "secondary" : "destructive"} size="sm" onClick={toggleMicLobby}>
                      {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {micEnabled && <AudioLevelMeter stream={localStream} />}
                </div>
              </div>
            </Card>

            {/* Right: Meeting Info & Settings */}
            <Card className="p-6 shadow-elegant bg-card/50 backdrop-blur-sm space-y-6">
              {/* Meeting Info */}
              <div className="space-y-2 pb-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  Welkom bij je Oriëntatiegesprek
                </h2>
                <p className="text-sm text-muted-foreground">
                  Host: Lars van Top Immo Spain  
                </p>
                <p className="text-sm text-muted-foreground">
                  Duur: ±30 minuten
                </p>
              </div>

              {/* Name Input */}
              <div>
                <Label className="mb-2 block text-foreground">Jouw naam</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Vul je naam in" disabled={waitingForAdmission} />
              </div>

              {/* Device Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Apparaten</h3>
                
                <div>
                  <Label className="mb-2 block flex items-center gap-2 text-sm">
                    <Camera className="w-4 h-4 text-primary" />
                    Camera
                  </Label>
                  <Select value={selectedCamera} onValueChange={switchDevice('video')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.map(device => <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4 text-primary" />
                    Microfoon
                  </Label>
                  <Select value={selectedMic} onValueChange={switchDevice('audio')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies microfoon" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map(device => <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microfoon ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block flex items-center gap-2 text-sm">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Speakers
                  </Label>
                  <Select value={selectedSpeaker} onValueChange={deviceId => setSelectedSpeaker(deviceId)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies speakers" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioOutputDevices.map(device => <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={testSpeakers} className="w-full mt-2" size="sm">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test speakers
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                <h4 className="font-semibold text-sm mb-2 text-foreground">💡 Tips voor een goed gesprek</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Zorg voor een rustige omgeving</li>
                  <li>• Gebruik een headset voor beste geluid</li>
                  <li>• Zorg voor goede verlichting</li>
                </ul>
              </div>

              {/* Join Button */}
              {waitingForAdmission ? <div className="text-center space-y-4 py-4">
                  <Clock className="w-12 h-12 animate-pulse text-primary mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-foreground">Wachten op toelating...</p>
                    <p className="text-sm text-muted-foreground">
                      De host zal je zo toelaten.
                    </p>
                  </div>
                </div> : <Button size="lg" className="w-full shadow-elegant" onClick={joinMeeting} disabled={!displayName.trim()}>
                  Deelnemen aan gesprek
                </Button>}
            </Card>
          </div>
        </div>
      </div>;
  }

  // Meeting View with Whereby SDK Room Component
  if (!roomUrl) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Meeting voorbereiden...</p>
        </div>
      </div>;
  }
  return <MeetingRoom roomUrl={roomUrl} displayName={displayName} initialCameraEnabled={cameraEnabled} initialMicEnabled={micEnabled} videoDevices={videoDevices} audioDevices={audioDevices} audioOutputDevices={audioOutputDevices} selectedCamera={selectedCamera} selectedMic={selectedMic} selectedSpeaker={selectedSpeaker} onCameraChange={switchDevice('video')} onMicChange={switchDevice('audio')} onSpeakerChange={deviceId => setSelectedSpeaker(deviceId)} />;
};
export default Meeting;