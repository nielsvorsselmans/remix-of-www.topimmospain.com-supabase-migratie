import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mic, Volume2 } from "lucide-react";

interface MeetingSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const MeetingSettingsDrawer = ({
  open,
  onOpenChange,
  videoDevices,
  audioDevices,
  audioOutputDevices,
  selectedCamera,
  selectedMic,
  selectedSpeaker,
  onCameraChange,
  onMicChange,
  onSpeakerChange,
}: MeetingSettingsDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            Instellingen
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* Camera */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Camera className="w-4 h-4 text-primary" />
              Camera
            </Label>
            <Select value={selectedCamera} onValueChange={onCameraChange}>
              <SelectTrigger>
                <SelectValue placeholder="Kies camera" />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Mic className="w-4 h-4 text-primary" />
              Microfoon
            </Label>
            <Select value={selectedMic} onValueChange={onMicChange}>
              <SelectTrigger>
                <SelectValue placeholder="Kies microfoon" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microfoon ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speakers */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Volume2 className="w-4 h-4 text-primary" />
              Speakers
            </Label>
            <Select value={selectedSpeaker} onValueChange={onSpeakerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Kies speakers" />
              </SelectTrigger>
              <SelectContent>
                {audioOutputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
