import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface PartnerInviteGeneratorProps {
  partnerId: string;
  partnerName: string;
  currentInviteCode: string | null;
}

export function PartnerInviteGenerator({ 
  partnerId, 
  partnerName,
  currentInviteCode 
}: PartnerInviteGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generateInviteCode = useMutation({
    mutationFn: async () => {
      // Generate unique invite code
      const inviteCode = `${partnerId.slice(0, 8)}-${Date.now().toString(36)}`;
      
      const { error } = await supabase
        .from('partners')
        .update({ partner_invite_code: inviteCode })
        .eq('id', partnerId);

      if (error) throw error;
      return inviteCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success("Uitnodigingslink gegenereerd!");
    },
    onError: (error) => {
      console.error('Error generating invite code:', error);
      toast.error("Kon uitnodigingslink niet genereren");
    },
  });

  const inviteLink = currentInviteCode 
    ? `${window.location.origin}/auth?partner_invite=${currentInviteCode}&tab=signup`
    : null;

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link gekopieerd!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Partner Uitnodiging
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Partner Uitnodigingslink</DialogTitle>
          <DialogDescription>
            Genereer een unieke link voor {partnerName} om een partner account aan te maken
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!currentInviteCode ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Er is nog geen uitnodigingslink voor deze partner
              </p>
              <Button 
                onClick={() => generateInviteCode.mutate()}
                disabled={generateInviteCode.isPending}
              >
                Genereer Uitnodigingslink
              </Button>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Uitnodigingslink:</label>
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink || ''} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Card className="p-4 bg-muted">
                <p className="text-sm font-medium mb-2">Instructies voor partner:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open de uitnodigingslink in je browser</li>
                  <li>Maak een account aan met je gegevens</li>
                  <li>Je account wordt automatisch als partner gekoppeld</li>
                  <li>Log daarna in op /partner/dashboard</li>
                </ol>
              </Card>

              <div className="flex gap-2">
                <Button
                  onClick={() => generateInviteCode.mutate()}
                  variant="outline"
                  disabled={generateInviteCode.isPending}
                >
                  Genereer Nieuwe Link
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
