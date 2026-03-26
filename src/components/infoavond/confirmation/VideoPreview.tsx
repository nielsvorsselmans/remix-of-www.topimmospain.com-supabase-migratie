import { formatEventDateFull } from "@/lib/dateUtils";

interface VideoPreviewProps {
  eventDate?: string;
}

export const VideoPreview = ({ eventDate }: VideoPreviewProps) => {
  const formattedDate = eventDate ? formatEventDateFull(eventDate) : "";
  
  return (
    <section className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Welkom bij de infoavond
        </h3>
        <p className="text-sm text-muted-foreground">
          Ontdek wat je{formattedDate ? ` op ${formattedDate}` : ""} te wachten staat
        </p>
      </div>
      
      <div className="relative rounded-xl overflow-hidden bg-muted shadow-lg">
        <div className="aspect-video">
          <video
            src="https://storage.googleapis.com/msgsndr/nE3PBl88odKh2Kdr7Njt/media/68c2cbcc43ec1c844fa99d43.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
      
    </section>
  );
};
