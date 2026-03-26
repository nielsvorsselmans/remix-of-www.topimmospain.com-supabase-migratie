import { Shield, Users, MapPin } from "lucide-react";

interface SocialProofStripProps {
  items?: { icon: "shield" | "users" | "map"; label: string }[];
}

const iconMap = {
  shield: Shield,
  users: Users,
  map: MapPin,
};

const defaultItems = [
  { icon: "shield" as const, label: "Gratis & vrijblijvend" },
  { icon: "users" as const, label: "Persoonlijke begeleiding" },
  { icon: "map" as const, label: "NL & BE" },
];

export function SocialProofStrip({ items = defaultItems }: SocialProofStripProps) {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 py-3 px-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-primary" />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
