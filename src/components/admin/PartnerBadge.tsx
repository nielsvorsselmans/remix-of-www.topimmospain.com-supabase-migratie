import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

interface PartnerBadgeProps {
  partnerId: string;
  partnerName: string | null;
  partnerCompany: string | null;
  partnerLogoUrl?: string | null;
  size?: "sm" | "md";
  showLink?: boolean;
}

export function PartnerBadge({ 
  partnerId, 
  partnerName, 
  partnerCompany, 
  partnerLogoUrl,
  size = "sm",
  showLink = false
}: PartnerBadgeProps) {
  const displayName = partnerCompany || partnerName || "Partner";
  const initials = displayName.slice(0, 2).toUpperCase();

  const content = (
    <Badge 
      variant="outline" 
      className={`gap-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 ${
        size === "md" ? "py-1 px-2.5" : "py-0.5 px-2"
      }`}
    >
      <Users className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      <span className="flex items-center gap-1.5">
        Via:
        {partnerLogoUrl && (
          <Avatar className={size === "md" ? "h-5 w-5" : "h-4 w-4"}>
            <AvatarImage src={partnerLogoUrl} alt={displayName} />
            <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
          </Avatar>
        )}
        <span className={`font-medium ${size === "md" ? "" : "text-xs"}`}>
          {displayName}
        </span>
      </span>
    </Badge>
  );

  if (showLink) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/admin/partners/${partnerId}`} className="inline-block">
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bekijk partner details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
