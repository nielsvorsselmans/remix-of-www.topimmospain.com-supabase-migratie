import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, Wand2, Copy, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SendMagicLinkButtonProps {
  email: string | null | undefined;
  firstName?: string | null;
  lastName?: string | null;
  crmLeadId?: string;
  onSuccess?: () => void;
}

export function SendMagicLinkButton({ 
  email, 
  firstName, 
  lastName,
  crmLeadId,
  onSuccess 
}: SendMagicLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const PRODUCTION_URL = "https://www.topimmospain.com";

  const generateAndTrack = async (sendEmail: boolean) => {
    if (!email) {
      toast.error("Geen e-mailadres beschikbaar");
      return null;
    }

    const redirectUrl = `${PRODUCTION_URL}/dashboard`;

    const { data, error } = await supabase.functions.invoke("generate-magic-link", {
      body: {
        email,
        redirect_to: redirectUrl,
        first_name: firstName,
        last_name: lastName,
        send_email: sendEmail,
        crm_lead_id: crmLeadId,
      },
    });

    if (error) {
      console.error("Error generating magic link:", error);
      toast.error("Er is iets misgegaan bij het genereren van de link.");
      return null;
    }

    // Track the magic link send in crm_leads
    const { data: currentLead } = await supabase
      .from("crm_leads")
      .select("magic_link_sent_count")
      .eq("email", email)
      .single();

    if (currentLead) {
      await supabase
        .from("crm_leads")
        .update({
          last_magic_link_sent_at: new Date().toISOString(),
          magic_link_sent_count: (currentLead.magic_link_sent_count ?? 0) + 1,
        })
        .eq("email", email);
    }

    return data;
  };

  const handleSendMagicLink = async () => {
    setIsLoading(true);
    try {
      const result = await generateAndTrack(true);
      if (result) {
        if (result.account_created) {
          toast.success(`Account aangemaakt en magic link verzonden naar ${email}`);
        } else {
          toast.success(`Magic link verzonden naar ${email}`);
        }
        setOpen(false);
        onSuccess?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    setIsCopying(true);
    try {
      const result = await generateAndTrack(false);
      if (result?.magic_link) {
        await navigator.clipboard.writeText(result.magic_link);
        setCopied(true);
        if (result.account_created) {
          toast.success("Account aangemaakt en magic link gekopieerd!");
        } else {
          toast.success("Magic link gekopieerd! Je kunt deze nu via WhatsApp delen.");
        }
        setTimeout(() => setCopied(false), 3000);
      }
    } finally {
      setIsCopying(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full">
          <Wand2 className="h-4 w-4" />
          Stuur Magic Link
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Magic Link versturen?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Genereer een magic link voor <strong>{email}</strong>
                {firstName && <> ({firstName})</>}.
              </p>
              <p>
                De klant kan hiermee direct inloggen in hun persoonlijke portaal, zonder wachtwoord.
              </p>
              <p className="text-xs text-muted-foreground">
                De link is 24 uur geldig. Als er nog geen account bestaat, wordt deze automatisch aangemaakt.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading || isCopying}>Annuleren</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            disabled={isLoading || isCopying}
          >
            {isCopying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : copied ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Kopieer Link
          </Button>
          <Button onClick={handleSendMagicLink} disabled={isLoading || isCopying}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Verstuur Email
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
