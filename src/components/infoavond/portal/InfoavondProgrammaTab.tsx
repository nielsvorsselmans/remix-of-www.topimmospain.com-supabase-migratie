import { Coffee, Users, MapPin, Landmark, Scale, Receipt, MessageCircle } from "lucide-react";

interface InfoavondProgrammaTabProps {
  doorsOpenTime?: string;
  presentationStartTime?: string;
  presentationEndTime?: string;
}

const formatTime = (time: string | undefined, fallback: string): string => {
  if (!time) return fallback;
  const [hours, minutes] = time.split(':');
  return `${hours}u${minutes !== '00' ? minutes : ''}`;
};

const addMinutes = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

type PillarKey = 'regio' | 'financiering' | 'juridisch' | 'fiscaliteit';

interface ProgramItem {
  time: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  pillarKey?: PillarKey;
  pillarColor?: string;
  pillarBg?: string;
}

const PILLAR_STYLES: Record<PillarKey, { color: string; bg: string }> = {
  regio: { color: 'text-blue-600', bg: 'bg-blue-100' },
  financiering: { color: 'text-green-600', bg: 'bg-green-100' },
  juridisch: { color: 'text-purple-600', bg: 'bg-purple-100' },
  fiscaliteit: { color: 'text-orange-600', bg: 'bg-orange-100' },
};

export const InfoavondProgrammaTab = ({ 
  doorsOpenTime = "19:30",
  presentationStartTime = "20:00",
  presentationEndTime = "21:15"
}: InfoavondProgrammaTabProps) => {
  const regioTime = addMinutes(presentationStartTime, 15);
  const financieringTime = addMinutes(presentationStartTime, 30);
  const juridischTime = addMinutes(presentationStartTime, 45);
  const fiscaliteitTime = addMinutes(presentationStartTime, 60);

  const programItems: ProgramItem[] = [
    {
      time: formatTime(doorsOpenTime, "19u30"),
      title: "Ontvangst",
      description: "Welkom met koffie, thee en iets lekkers",
      icon: Coffee,
    },
    {
      time: formatTime(presentationStartTime, "20u"),
      title: "Welkom & introductie",
      description: "Kennismaking met het Viva team",
      icon: Users,
      highlight: true
    },
    {
      time: formatTime(regioTime, "20u15"),
      title: "De regio's",
      description: "Costa Blanca Zuid vs Costa Cálida – welke past bij jou?",
      icon: MapPin,
      pillarKey: 'regio',
    },
    {
      time: formatTime(financieringTime, "20u30"),
      title: "Financiering & hypotheek",
      description: "Hypotheekmogelijkheden en financiering in Spanje",
      icon: Landmark,
      pillarKey: 'financiering',
    },
    {
      time: formatTime(juridischTime, "20u45"),
      title: "Juridisch: NIE & eigendom",
      description: "NIE-nummer, eigendom en juridische controles",
      icon: Scale,
      pillarKey: 'juridisch',
    },
    {
      time: formatTime(fiscaliteitTime, "21u"),
      title: "Fiscaliteit & belastingen",
      description: "Belastingen bij aankoop en bezit van vastgoed",
      icon: Receipt,
      pillarKey: 'fiscaliteit',
    },
    {
      time: formatTime(presentationEndTime, "21u15"),
      title: "Vragen & napraten",
      description: "Stel je vragen en praat gezellig na",
      icon: MessageCircle,
    }
  ];

  return (
    <div className="space-y-4">
      {/* Intro */}
      <p className="text-sm text-muted-foreground">
        Hieronder vind je het programma van de avond. We zorgen voor een interessante mix van 
        informatie en voldoende ruimte voor jouw vragen.
      </p>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border" />
        
        <div className="space-y-0">
          {programItems.map((item, index) => {
            const pillarStyle = item.pillarKey ? PILLAR_STYLES[item.pillarKey] : null;
            
            return (
              <div 
                key={index}
                className={`flex gap-4 py-3 relative ${pillarStyle ? `pl-2 border-l-2 ml-[-2px] ${pillarStyle.color.replace('text-', 'border-')}` : ''}`}
              >
                <div className={`flex-shrink-0 w-14 text-sm font-medium pt-1 ${pillarStyle ? pillarStyle.color : 'text-primary'}`}>
                  {item.time}
                </div>
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  pillarStyle 
                    ? `${pillarStyle.bg} ${pillarStyle.color}`
                    : item.highlight 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`text-sm font-medium ${pillarStyle ? pillarStyle.color : 'text-foreground'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
