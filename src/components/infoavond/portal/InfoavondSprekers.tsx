import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Speaker {
  name: string;
  role: string;
  bio: string;
  imageUrl?: string;
}

const speakers: Speaker[] = [
  {
    name: "Rutger Verhoeven",
    role: "Oprichter & Vastgoedadviseur",
    bio: "Al meer dan 10 jaar actief in Spaans vastgoed. Begeleidt jaarlijks tientallen investeerders naar hun droomwoning.",
    imageUrl: undefined
  },
  {
    name: "Stefan de Vries",
    role: "Financieel Specialist",
    bio: "Expert in Spaanse hypotheken en financieringsstructuren. Helpt je de beste deal te krijgen.",
    imageUrl: undefined
  }
];

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const InfoavondSprekers = () => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Je ontmoet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {speakers.map((speaker, index) => (
            <div 
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex-shrink-0">
                {speaker.imageUrl ? (
                  <img 
                    src={speaker.imageUrl} 
                    alt={speaker.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {getInitials(speaker.name)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{speaker.name}</p>
                <p className="text-xs text-primary font-medium">{speaker.role}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{speaker.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
