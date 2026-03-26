import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";

interface VideoViewProps {
  stream?: MediaStream;
  mirror?: boolean;
  isScreenshare?: boolean;
  isVideoEnabled?: boolean;
  displayName?: string;
}

export const VideoView = ({ stream, mirror = false, isScreenshare = false, isVideoEnabled = true, displayName }: VideoViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
    
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream || !isVideoEnabled) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
          <VideoOff className="w-8 h-8 text-muted-foreground" />
        </div>
        {displayName && (
          <p className="text-sm font-medium text-foreground">{displayName}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Camera uit</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={mirror} // mute local video to prevent feedback
      className={`w-full h-full ${isScreenshare ? 'object-contain bg-black' : 'object-cover'} ${mirror ? 'scale-x-[-1]' : ''}`}
    />
  );
};
