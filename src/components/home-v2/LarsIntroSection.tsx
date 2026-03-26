import larsProfile from "@/assets/lars-profile.webp";
import { MapPin, Users, Heart } from "lucide-react";

const authorityTags = [
  { icon: MapPin, label: "Woonachtig in Spanje" },
  { icon: Users, label: "Nederlands & Belgisch netwerk" },
  { icon: Heart, label: "Persoonlijke begeleiding, geen callcenter" },
];

export const LarsIntroSection = () => {
  return (
    <section className="py-10 sm:py-14 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
          <img
            src={larsProfile}
            alt="Lars van Top Immo Spain"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-secondary shadow-soft flex-shrink-0"
          />
          <div className="text-center sm:text-left">
            <p className="text-lg sm:text-xl font-semibold text-foreground mb-1">
              Hallo, ik ben Lars
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-3">
              Ik begeleid investeerders uit Nederland en België bij hun eerste stappen in Spanje. Geen verkoopgesprekken, wél eerlijk advies — zodat je zelf een weloverwogen keuze kunt maken.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {authorityTags.map((tag) => (
                <span
                  key={tag.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs font-medium text-muted-foreground"
                >
                  <tag.icon className="h-3 w-3 text-primary" />
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
