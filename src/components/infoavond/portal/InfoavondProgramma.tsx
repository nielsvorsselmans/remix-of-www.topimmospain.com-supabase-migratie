import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coffee, Users, MapPin, Euro, HelpCircle, MessageCircle } from "lucide-react";

interface InfoavondProgrammaProps {
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

export const InfoavondProgramma = ({ 
  doorsOpenTime = "19:30",
  presentationStartTime = "20:00",
  presentationEndTime = "21:15"
}: InfoavondProgrammaProps) => {
  // Calculate intermediate times based on presentation start
  const welcomeTime = presentationStartTime;
  const whySpainTime = addMinutes(presentationStartTime, 15);
  const processTime = addMinutes(presentationStartTime, 45);
  const financingTime = addMinutes(presentationStartTime, 60);

  const programItems = [
    {
      time: formatTime(doorsOpenTime, "19u30"),
      title: "Ontvangst",
      description: "Welkom met koffie, thee en iets lekkers",
      icon: Coffee,
      highlight: false
    },
    {
      time: formatTime(welcomeTime, "20u"),
      title: "Welkom & introductie",
      description: "Kennismaking met het Viva team",
      icon: Users,
      highlight: true
    },
    {
      time: formatTime(whySpainTime, "20u15"),
      title: "Waarom Spanje?",
      description: "De vastgoedmarkt uitgelegd",
      icon: MapPin,
      highlight: false
    },
    {
      time: formatTime(processTime, "20u45"),
      title: "Het aankoopproces",
      description: "Van oriëntatie tot sleuteloverdracht",
      icon: Clock,
      highlight: false
    },
    {
      time: formatTime(financingTime, "21u"),
      title: "Financiering",
      description: "Hypotheekmogelijkheden in Spanje",
      icon: Euro,
      highlight: false
    },
    {
      time: formatTime(presentationEndTime, "21u15"),
      title: "Vragen & napraten",
      description: "Stel je vragen en praat gezellig na",
      icon: MessageCircle,
      highlight: false
    }
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Programma van de avond
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {programItems.map((item, index) => (
            <div 
              key={index}
              className={`flex gap-4 py-3 ${
                index !== programItems.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div className="flex-shrink-0 w-14 text-sm font-medium text-primary">
                {item.time}
              </div>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                item.highlight 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
