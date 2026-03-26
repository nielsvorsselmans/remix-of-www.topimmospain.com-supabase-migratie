import { Badge } from "@/components/ui/badge";

type CategoryBadgeProps = {
  category: string;
  className?: string;
};

const categoryColors: Record<string, string> = {
  // Verhuur - Zachte roze
  verhuur: "bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200",
  
  // Financiering - Warm terracotta/oranje
  financiering: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200",
  
  // Juridisch - Diep blauw (betrouwbaarheid)
  juridisch: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
  
  // Belastingen - Olijfgroen
  belastingen: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
  
  // Aankoopproces - Zacht lavendel
  aankoopproces: "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200",
  
  // Regio - Warm amber/goud
  regio: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200",
  
  // Algemeen - Zachte slate
  algemeen: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  
  // Praktisch - Warm teal
  praktisch: "bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200",
};

export function BlogCategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const colorClass = categoryColors[category.toLowerCase()] || "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200";
  
  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} border ${className}`}
    >
      {category}
    </Badge>
  );
}
