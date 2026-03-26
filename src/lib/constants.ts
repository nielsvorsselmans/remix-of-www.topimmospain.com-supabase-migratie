// Shared video/media type constants
export const VIDEO_TYPES = [
  { value: "bouwupdate", label: "Bouwupdate" },
  { value: "drone", label: "Drone" },
  { value: "showhouse", label: "Showhouse" },
  { value: "omgeving", label: "Omgeving" },
  { value: "algemeen", label: "Algemeen" },
] as const;

export type VideoType = typeof VIDEO_TYPES[number]['value'];

export const getTypeBadgeColor = (type: string): string => {
  switch (type) {
    case "bouwupdate": return "bg-blue-100 text-blue-800";
    case "drone": return "bg-purple-100 text-purple-800";
    case "showhouse": return "bg-green-100 text-green-800";
    case "omgeving": return "bg-amber-100 text-amber-800";
    default: return "bg-muted text-muted-foreground";
  }
};
