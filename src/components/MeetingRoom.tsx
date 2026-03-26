import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomConnection } from "@whereby.com/browser-sdk/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MeetingSettingsDrawer } from "@/components/MeetingSettingsDrawer";
import { MeetingChatSidebar } from "@/components/MeetingChatSidebar";
import { VideoView } from "@/components/VideoView";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Loader2,
  Clock,
  Monitor,
  MessageSquare,
  Settings,
  Maximize,
  Minimize,
  UserMinus
} from "lucide-react";

interface MeetingRoomProps {
  roomUrl: string;
  displayName: string;
  initialCameraEnabled: boolean;
  initialMicEnabled: boolean;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedCamera: string;
  selectedMic: string;
  selectedSpeaker: string;
  onCameraChange: (deviceId: string) => void;
  onMicChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
}

export const MeetingRoom = ({
  roomUrl,
  displayName,
  initialCameraEnabled,
  initialMicEnabled,
  videoDevices,
  audioDevices,
  audioOutputDevices,
  selectedCamera,
  selectedMic,
  selectedSpeaker,
  onCameraChange,
  onMicChange,
  onSpeakerChange,
}: MeetingRoomProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const meetingStartTimeRef = useRef<Date>(new Date());
  const isSharingScreenRef = useRef(false);

  // Initialize Whereby SDK connection
  const roomConnection = useRoomConnection(roomUrl, {
    localMediaOptions: {
      audio: initialMicEnabled,
      video: initialCameraEnabled,
    },
    displayName: displayName || "Guest",
  });

  const { 
    state: { 
      localParticipant, 
      remoteParticipants, 
      connectionStatus,
      chatMessages,
      screenshares,
    },
    actions: { 
      toggleCamera: sdkToggleCamera, 
      toggleMicrophone: sdkToggleMicrophone,
      startScreenshare,
      stopScreenshare,
      joinRoom,
      leaveRoom,
      sendChatMessage,
      kickParticipant,
    }
  } = roomConnection;

  // Ref to track remoteParticipants for cleanup
  const remoteParticipantsRef = useRef(remoteParticipants);

  // Join room on mount, leave on unmount
  useEffect(() => {
    const initializeRoom = async () => {
      if (joinRoom) {
        console.log("[MeetingRoom] useEffect triggered - joining room");
        try {
          await joinRoom();
        } catch (error) {
          console.error("Could not join room:", error);
        }
      }
    };
    
    initializeRoom();

    return () => {
      console.log("[MeetingRoom] cleanup - leaving room");
      if (leaveRoom) {
        leaveRoom();
      }
    };
  }, [joinRoom, leaveRoom]);

  // Keep ref in sync with remoteParticipants state
  useEffect(() => {
    remoteParticipantsRef.current = remoteParticipants;
    console.log("[MeetingRoom] Remote participants updated:", remoteParticipants.length);
  }, [remoteParticipants]);

  // Cleanup all streams ONLY on component unmount
  useEffect(() => {
    return () => {
      console.log("[MeetingRoom] Component UNMOUNTING - cleaning up all streams");
      // Use ref to get current value at unmount time
      remoteParticipantsRef.current.forEach(p => {
        if (p.stream) {
          p.stream.getTracks().forEach(track => {
            console.log("[MeetingRoom] Stopping remote track:", track.kind);
            track.stop();
          });
        }
      });
    };
  }, []); // Empty dependency = cleanup ONLY on unmount

  const toggleCamera = () => {
    sdkToggleCamera();
  };

  const toggleMic = () => {
    sdkToggleMicrophone();
  };

  const leaveCall = () => {
    if (leaveRoom) {
      leaveRoom();
    }
    meetingStartTimeRef.current = new Date();
    setMeetingDuration(0);
    navigate('/');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleScreenShare = async () => {
    const activeScreenshare = screenshares && screenshares.length > 0 ? screenshares[0] : null;

    console.log("toggleScreenShare called", {
      isSharingScreenRef: isSharingScreenRef.current,
      screensharesLength: screenshares?.length,
      localParticipantId: localParticipant?.id,
      activeScreenshareParticipantId: activeScreenshare?.participantId,
    });

    if (isSharingScreenRef.current) {
      try {
        console.log("Attempting to stop screenshare...");
        await stopScreenshare();
        isSharingScreenRef.current = false;
        console.log("Screenshare stopped successfully");
        toast({
          title: "Scherm delen gestopt",
          description: "Je deelt je scherm niet meer.",
        });
      } catch (error) {
        console.error("Error stopping screenshare:", error);
        toast({
          title: "Fout bij stoppen scherm delen",
          description: "Probeer het opnieuw.",
          variant: "destructive",
        });
      }
    } else {
      try {
        console.log("Attempting to start screenshare...");
        await startScreenshare();
        isSharingScreenRef.current = true;
        console.log("Screenshare started successfully");
        toast({
          title: "Scherm delen gestart",
          description: "Je deelt nu je scherm.",
        });
      } catch (error) {
        console.error("Error starting screenshare:", error);
        toast({
          title: "Fout bij starten scherm delen",
          description: "Probeer het opnieuw.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendChatMessage = (text: string) => {
    if (sendChatMessage && text.trim()) {
      sendChatMessage(text);
    }
  };

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - meetingStartTimeRef.current.getTime();
      setMeetingDuration(Math.floor(diff / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Determine active screenshare and whether anyone is sharing
  const activeScreenshare = screenshares && screenshares.length > 0 ? screenshares[0] : null;
  const isAnyoneSharing = !!activeScreenshare;

  // Synchronize ref with SDK state to handle external stops
  useEffect(() => {
    if (!activeScreenshare && isSharingScreenRef.current) {
      console.log("Screenshare removed by SDK, resetting local ref");
      isSharingScreenRef.current = false;
    }
  }, [activeScreenshare]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get the participant who is sharing the screen (local or remote)
  const screenshareOwner = activeScreenshare
    ? (localParticipant?.id === activeScreenshare.participantId
        ? localParticipant
        : remoteParticipants.find(p => p.id === activeScreenshare.participantId) || null)
    : null;

  // Calculate adaptive grid layout based on participant count
  const getGridLayout = (participantCount: number, isScreenSharing: boolean) => {
    if (isScreenSharing) {
      return { columns: '4fr 1fr', rows: '1fr' }; // Screen share layout: main content + sidebar
    }
    
    if (participantCount <= 1) return { columns: '1fr', rows: '1fr' };
    if (participantCount === 2) return { columns: '1fr', rows: '1fr' }; // Remote fullscreen, local as overlay
    if (participantCount === 3) return { columns: '1fr 1fr', rows: '1fr' }; // 2 remote side by side
    if (participantCount === 4) return { columns: '1fr 1fr', rows: '1fr 1fr' };
    return { columns: 'repeat(3, 1fr)', rows: '1fr 1fr' }; // 5-6 participants
  };

  // Total participants including local (for grid calculation)
  const totalParticipants = remoteParticipants.length + (localParticipant ? 1 : 0);
  const gridLayout = getGridLayout(totalParticipants, isAnyoneSharing);

  // Determine if local participant should be in grid (4+ total participants without screen sharing)
  const localInGrid = !isAnyoneSharing && totalParticipants >= 4;

  // Show loading state while connecting
  if (connectionStatus !== "connected") {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-4 shadow-elegant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Top Immo Spain</h1>
              <div className="h-6 w-px bg-primary-foreground/30" />
              <span className="text-sm opacity-90">Oriëntatiegesprek</span>
            </div>
            <div className="flex items-center gap-2 bg-background/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm">Verbinden...</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">De videocall wordt geladen...</p>
            <p className="text-sm text-muted-foreground">Camera en microfoon worden voorbereid</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Custom Header */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-4 shadow-elegant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Top Immo Spain</h1>
            <div className="h-6 w-px bg-primary-foreground/30" />
            <span className="text-sm opacity-90">Oriëntatiegesprek</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 bg-background/20 px-3 py-1.5 rounded-full">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                'bg-red-400'
              }`} />
              <span className="text-sm">
                {connectionStatus === 'connected' ? 'Verbonden' : 
                 connectionStatus === 'connecting' ? 'Verbinden...' : 
                 'Verbroken'}
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 bg-background/20 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">{formatDuration(meetingDuration)}</span>
            </div>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-primary-foreground hover:bg-background/20"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="text-primary-foreground hover:bg-background/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Container with Chat Sidebar */}
      <div className="flex-1 flex relative overflow-hidden bg-gradient-to-br from-muted/50 to-background">
        {/* Video Grid */}
        <div className="flex-1 relative p-4">
          {isAnyoneSharing ? (
            /* Screen Share Layout: Main screen + Participants sidebar */
            <div className="h-full grid gap-4" style={{
              gridTemplateColumns: gridLayout.columns,
              gridTemplateRows: gridLayout.rows
            }}>
              {/* Main Screen Share Area */}
              <div className="relative rounded-xl overflow-hidden shadow-elegant bg-card border border-border">
                <VideoView 
                  stream={activeScreenshare?.stream || localParticipant?.stream}
                  isScreenshare={true}
                  isVideoEnabled={screenshareOwner?.isVideoEnabled ?? true}
                  displayName={screenshareOwner?.displayName || 'Onbekend'}
                />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-soft">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {screenshareOwner
                      ? (screenshareOwner.id === localParticipant?.id
                          ? (screenshareOwner.displayName || 'Jij')
                          : (screenshareOwner.displayName || 'Deelnemer'))
                      : 'Onbekende deelnemer'} deelt scherm
                  </span>
                </div>
              </div>

              {/* Participants Sidebar */}
              <div className="flex flex-col gap-3 overflow-y-auto">
                {/* Remote Participants in sidebar */}
                {remoteParticipants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="relative rounded-lg overflow-hidden shadow-soft bg-card border border-border aspect-video flex-shrink-0"
                  >
                    <VideoView 
                      stream={participant.stream}
                      isVideoEnabled={participant.isVideoEnabled}
                      displayName={participant.displayName}
                    />
                    {kickParticipant && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => kickParticipant(participant.id)}
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs font-medium">{participant.displayName || 'Gast'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!participant.isAudioEnabled && (
                          <Badge variant="destructive" className="p-1 h-auto">
                            <MicOff className="w-2.5 h-2.5" />
                          </Badge>
                        )}
                        {!participant.isVideoEnabled && (
                          <Badge variant="destructive" className="p-1 h-auto">
                            <VideoOff className="w-2.5 h-2.5" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Local Participant in sidebar */}
                {localParticipant && (
                  <div className="relative rounded-lg overflow-hidden shadow-soft bg-card border-2 border-primary/50 aspect-video flex-shrink-0">
                    <VideoView 
                      stream={localParticipant.stream} 
                      mirror 
                      isVideoEnabled={localParticipant.isVideoEnabled}
                      displayName="Jij"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className="text-xs font-medium">Jij</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!localParticipant.isAudioEnabled && (
                          <div className="bg-destructive/90 p-0.5 rounded-full">
                            <MicOff className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {!localParticipant.isVideoEnabled && (
                          <div className="bg-destructive/90 p-0.5 rounded-full">
                            <VideoOff className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Adaptive Grid Layout: All participants in grid */
            <div className="h-full relative">
              <div className="h-full grid gap-4 transition-all duration-300" style={{
                gridTemplateColumns: gridLayout.columns,
                gridTemplateRows: gridLayout.rows
              }}>
                {/* Remote Participants */}
                {remoteParticipants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="relative rounded-xl overflow-hidden shadow-elegant bg-card border border-border animate-fade-in"
                  >
                    <VideoView 
                      stream={participant.stream}
                      isVideoEnabled={participant.isVideoEnabled}
                      displayName={participant.displayName}
                    />
                    
                    {/* Kick Button */}
                    {kickParticipant && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => kickParticipant(participant.id)}
                        className="absolute top-4 right-4"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Verwijderen
                      </Button>
                    )}
                    
                    {/* Participant Info Overlay */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-soft">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm font-medium">{participant.displayName || 'Gast'}</span>
                      {!participant.isAudioEnabled && (
                        <Badge variant="destructive" className="p-1 h-auto">
                          <MicOff className="w-3 h-3" />
                        </Badge>
                      )}
                      {!participant.isVideoEnabled && (
                        <Badge variant="destructive" className="p-1 h-auto">
                          <VideoOff className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Local Participant - Grid or Overlay */}
                {localParticipant && localInGrid ? (
                  /* Local in Grid (3+ participants) */
                  <div className="relative rounded-xl overflow-hidden shadow-elegant bg-card border-2 border-primary/50 animate-fade-in">
                    <VideoView 
                      stream={localParticipant.stream} 
                      mirror 
                      isVideoEnabled={localParticipant.isVideoEnabled}
                      displayName="Jij"
                    />
                    
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-soft">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">Jij</span>
                      <div className="flex items-center gap-1 ml-2">
                        {!localParticipant.isAudioEnabled && (
                          <div className="bg-destructive/90 p-1 rounded-full">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!localParticipant.isVideoEnabled && (
                          <div className="bg-destructive/90 p-1 rounded-full">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : localParticipant ? (
                  /* Local as Small Overlay (1-2 participants) */
                  <div className="absolute bottom-24 right-8 w-64 aspect-video rounded-xl overflow-hidden shadow-elegant border-2 border-primary/50 bg-card z-10">
                    <VideoView 
                      stream={localParticipant.stream} 
                      mirror 
                      isVideoEnabled={localParticipant.isVideoEnabled}
                      displayName="Jij"
                    />
                    
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-xs font-medium">Jij</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!localParticipant.isAudioEnabled && (
                          <div className="bg-destructive/90 p-1 rounded-full">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!localParticipant.isVideoEnabled && (
                          <div className="bg-destructive/90 p-1 rounded-full">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Empty State */}
                {remoteParticipants.length === 0 && (
                  <div className="flex items-center justify-center h-full col-span-full">
                    <div className="text-center space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                      <p className="text-muted-foreground">Wachten op andere deelnemers...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Chat Sidebar */}
      <MeetingChatSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        displayName={displayName}
        chatMessages={chatMessages || []}
        onSendMessage={handleSendChatMessage}
        localParticipant={localParticipant}
        remoteParticipants={remoteParticipants}
      />
      </div>

      {/* Enhanced Control Bar */}
      <div className="bg-card border-t border-border p-4 shadow-elegant">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Meeting Controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={localParticipant?.isAudioEnabled ? "secondary" : "destructive"}
              size="lg"
              onClick={toggleMic}
              className="shadow-soft"
            >
              {localParticipant?.isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              type="button"
              variant={localParticipant?.isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              onClick={toggleCamera}
              className="shadow-soft"
            >
              {localParticipant?.isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              type="button"
              variant={isSharingScreenRef.current ? "default" : "secondary"}
              size="lg"
              onClick={toggleScreenShare}
              className="shadow-soft"
            >
              <Monitor className="w-5 h-5" />
            </Button>
          </div>

          {/* Center: End Call */}
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={leaveCall}
            className="shadow-elegant"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
            <span className="ml-2">Verlaat gesprek</span>
          </Button>

          {/* Right: Chat Control */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isChatOpen ? "default" : "secondary"}
              size="lg"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="shadow-soft"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      <MeetingSettingsDrawer
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        audioOutputDevices={audioOutputDevices}
        selectedCamera={selectedCamera}
        selectedMic={selectedMic}
        selectedSpeaker={selectedSpeaker}
        onCameraChange={onCameraChange}
        onMicChange={onMicChange}
        onSpeakerChange={onSpeakerChange}
      />
    </div>
  );
};
