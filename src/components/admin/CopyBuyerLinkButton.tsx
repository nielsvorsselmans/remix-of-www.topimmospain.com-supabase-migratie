import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link2, Copy, Check, RefreshCw, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  useGenerateBuyerDataToken, 
  getPublicFormUrl,
  copyBuyerLinkToClipboard,
  type BuyerDataToken 
} from "@/hooks/useBuyerDataToken";

interface CopyBuyerLinkButtonProps {
  saleCustomerId: string;
  existingToken?: BuyerDataToken | null;
  buyerName: string;
  isContractUploaded?: boolean;
}

export function CopyBuyerLinkButton({ 
  saleCustomerId, 
  existingToken,
  buyerName,
  isContractUploaded = false
}: CopyBuyerLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const generateMutation = useGenerateBuyerDataToken();

  const handleCopyLink = async () => {
    try {
      let token = existingToken;
      
      // Generate new token if none exists or expired
      if (!token || new Date(token.expires_at) < new Date()) {
        token = await generateMutation.mutateAsync(saleCustomerId);
      }

      const success = await copyBuyerLinkToClipboard(token.token);
      
      if (success) {
        setCopied(true);
        const expiryDate = format(new Date(token.expires_at), "d MMMM yyyy", { locale: nl });
        toast.success(`Link gekopieerd! Geldig tot ${expiryDate}`);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Kon link niet kopiëren");
      }
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Fout bij kopiëren link");
    }
  };

  const handleOpenLink = async () => {
    let token = existingToken;
    
    if (!token || new Date(token.expires_at) < new Date()) {
      token = await generateMutation.mutateAsync(saleCustomerId);
    }

    window.open(getPublicFormUrl(token.token), "_blank");
  };

  const isExpired = existingToken && new Date(existingToken.expires_at) < new Date();
  const isUsed = existingToken?.used_at;
  const isLinkClosed = isContractUploaded;

  return (
    <div className="flex items-center gap-2">
      {/* Status badges */}
      {isLinkClosed ? (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Link afgesloten
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Het reservatiecontract is geüpload.</p>
            <p className="text-xs text-muted-foreground">De link is niet meer beschikbaar.</p>
          </TooltipContent>
        </Tooltip>
      ) : existingToken && (
        <div className="flex items-center gap-1">
          {isUsed ? (
            <Badge variant="default" className="text-xs bg-green-600">
              ✅ Ingevuld
            </Badge>
          ) : isExpired ? (
            <Badge variant="destructive" className="text-xs">
              Verlopen
            </Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs">
                  ⏳ Link verstuurd
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Aangemaakt {formatDistanceToNow(new Date(existingToken.created_at), { 
                  addSuffix: true, 
                  locale: nl 
                })}</p>
                <p className="text-xs text-muted-foreground">
                  Geldig tot {format(new Date(existingToken.expires_at), "d MMM yyyy", { locale: nl })}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Copy button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={generateMutation.isPending || isLinkClosed}
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : isLinkClosed ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">
              {isLinkClosed ? "Afgesloten" : isExpired ? "Nieuwe Link" : "Link Kopiëren"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isLinkClosed ? (
            <p>Contract is geüpload, link is niet meer beschikbaar</p>
          ) : (
            <p>Kopieer link naar klipbord om te delen via email of WhatsApp</p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Preview button */}
      {existingToken && !isExpired && !isLinkClosed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenLink}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bekijk formulier</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}