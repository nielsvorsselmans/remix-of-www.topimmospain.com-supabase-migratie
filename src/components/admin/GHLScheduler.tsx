import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkedInPhotoSelector } from "./LinkedInPhotoSelector";
import { InlinePhotoGenerator } from "./InlinePhotoGenerator";
import { type LinkedInPhoto } from "@/hooks/usePhotoLibrary";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  CalendarIcon, Send, Clock, Save, Linkedin, Facebook, Instagram, Twitter,
  Youtube, AlertCircle, CheckCircle2, Loader2, MapPin, Music2, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GHLSocialAccount {
  id: string;
  name: string;
  type: string;
  platform: string;
  avatar?: string;
}

export interface GHLSchedulerProps {
  /** Pre-formatted content string to post */
  content: string;
  /** Optional media URLs to include */
  mediaUrls?: string[];
  /** Show the LinkedInPhotoSelector for picking a photo */
  showPhotoSelector?: boolean;
  /** Initial photo state when editing existing post */
  initialPhotoId?: string | null;
  initialPhotoUrl?: string | null;
  /** Platform label */
  platform?: string;
  /** Optional project/trigger metadata for the edge function */
  projectId?: string;
  triggerWord?: string;
  contentItemId?: string;
  /** Existing social_posts.id — when set, the backend updates this record instead of inserting */
  existingPostId?: string;
  /** Blog post ID to link to social post */
  blogPostId?: string;
  /** Additional preview badges */
  previewBadges?: React.ReactNode;
  /** Enable the accounts query (useful for sheet wrappers) */
  enabled?: boolean;
  /** Callbacks */
  onScheduled?: (status: "published" | "scheduled" | "draft") => void;
  onClose?: () => void;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  google: MapPin,
  youtube: Youtube,
  tiktok: Music2,
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter/X",
  google: "Google Business",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Overig",
};

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00"
];

export function GHLScheduler({
  content,
  mediaUrls: externalMediaUrls,
  showPhotoSelector = false,
  initialPhotoId,
  initialPhotoUrl,
  platform = "linkedin",
  projectId,
  triggerWord,
  contentItemId,
  existingPostId,
  blogPostId,
  previewBadges,
  enabled = true,
  onScheduled,
  onClose,
}: GHLSchedulerProps) {
  const queryClient = useQueryClient();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "draft">("schedule");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>("10:00");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(initialPhotoId || null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Determine media URLs: photo selector takes priority, then external
  const resolvedMediaUrls = showPhotoSelector
    ? (selectedPhotoUrl ? [selectedPhotoUrl] : [])
    : (externalMediaUrls || []);

  const { data: accountsData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["ghl-social-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-ghl-social-accounts");
      if (error) throw error;
      return data as { 
        accounts: GHLSocialAccount[]; 
        groupedAccounts: Record<string, GHLSocialAccount[]>;
        total: number;
      };
    },
    enabled,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (selectedAccounts.length === 0) {
        throw new Error("Selecteer minimaal één account");
      }

      let scheduleDateISO: string | undefined;
      if (publishMode === "schedule") {
        if (!scheduleDate) throw new Error("Selecteer een datum voor scheduling");
        const dateWithTime = new Date(scheduleDate);
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        dateWithTime.setHours(hours, minutes, 0, 0);
        scheduleDateISO = dateWithTime.toISOString();
      }

      const { data, error } = await supabase.functions.invoke("schedule-ghl-post", {
        body: {
          accountIds: selectedAccounts,
          content,
          hashtags: [],
          mediaUrls: resolvedMediaUrls,
          scheduleDate: scheduleDateISO,
          publishNow: publishMode === "now",
          platform,
          projectId: projectId || undefined,
          triggerWord: triggerWord || undefined,
          contentItemId: contentItemId || undefined,
          existingPostId: existingPostId || undefined,
          blogPostId: blogPostId || undefined,
        },
      });

      // Check data.error first (edge function returns 200 + success:false for GHL errors)
      if (data && !data.success && data.error) throw new Error(data.error);
      if (error) throw new Error(error.message || "Onbekende fout bij inplannen");
      return data;
    },
    onSuccess: (data) => {
      const message = data?.message || (
        publishMode === "now" ? "Post gepubliceerd!" 
        : publishMode === "schedule" ? "Post ingepland!" 
        : "Post opgeslagen als draft"
      );
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["content-ready"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts-all"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-social"] });
      
      const statusMap = { now: "published" as const, schedule: "scheduled" as const, draft: "draft" as const };
      onScheduled?.(statusMap[publishMode]);
      onClose?.();
    },
    onError: (error: Error) => {
      console.error("Scheduling failed:", error);
      toast.error(`Fout: ${error.message}`);
    },
  });

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const renderPlatformSection = (platformKey: string, accounts: GHLSocialAccount[]) => {
    if (!accounts || accounts.length === 0) return null;
    const Icon = platformIcons[platformKey] || AlertCircle;
    const label = platformLabels[platformKey] || platformKey.charAt(0).toUpperCase() + platformKey.slice(1);

    return (
      <div key={platformKey} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="space-y-2 pl-6">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center space-x-3">
              <Checkbox
                id={`ghl-${account.id}`}
                checked={selectedAccounts.includes(account.id)}
                onCheckedChange={() => toggleAccount(account.id)}
              />
              <label htmlFor={`ghl-${account.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                {account.avatar && (
                  <img src={account.avatar} alt={account.name} className="h-6 w-6 rounded-full object-cover" />
                )}
                <span>{account.name}</span>
                <Badge variant="outline" className="text-[10px]">{account.type}</Badge>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (accountsLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Accounts laden...</span>
      </div>
    );
  }

  if (accountsError || !accountsData?.accounts?.length) {
    return (
      <div className="py-6">
        <div className="flex items-start gap-3 text-amber-600">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Geen social accounts gevonden</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configureer eerst social media accounts in GoHighLevel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Preview */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Content Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </ScrollArea>
          {selectedPhotoUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border">
              <img src={selectedPhotoUrl} alt="Gekoppelde foto" className="w-full h-40 object-cover" />
            </div>
          )}
          {previewBadges && <div className="flex gap-2 mt-3">{previewBadges}</div>}
        </CardContent>
      </Card>

      {/* Photo Selection */}
      {showPhotoSelector && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Foto bijvoegen</Label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Genereren
            </Button>
          </div>
          {selectedPhotoUrl && (
            <div className="rounded-lg overflow-hidden border max-h-32">
              <img src={selectedPhotoUrl} alt="Geselecteerde foto" className="w-full h-32 object-cover" />
            </div>
          )}
          <LinkedInPhotoSelector
            selectedPhotoId={selectedPhotoId}
            onSelect={(photo: LinkedInPhoto | null) => {
              setSelectedPhotoId(photo?.id || null);
              setSelectedPhotoUrl(photo?.image_url || null);
            }}
          />
          <InlinePhotoGenerator
            open={aiDialogOpen}
            onOpenChange={setAiDialogOpen}
            postContent={content}
            onGenerated={(photo) => {
              setSelectedPhotoId(photo.id);
              setSelectedPhotoUrl(photo.url);
            }}
          />
        </div>
      )}

      {/* Account Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Publiceren naar</Label>
        <div className="space-y-4 bg-muted/30 rounded-lg p-4 max-h-[180px] overflow-y-auto">
          {accountsData.groupedAccounts && Object.entries(accountsData.groupedAccounts).map(
            ([key, accounts]) => renderPlatformSection(key, accounts as GHLSocialAccount[])
          )}
        </div>
        {selectedAccounts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedAccounts.length} account{selectedAccounts.length !== 1 ? "s" : ""} geselecteerd
          </p>
        )}
      </div>

      {/* Publish Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Wanneer publiceren</Label>
        <RadioGroup value={publishMode} onValueChange={(v) => setPublishMode(v as "now" | "schedule" | "draft")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="now" id="ghl-now" />
            <Label htmlFor="ghl-now" className="flex items-center gap-2 cursor-pointer">
              <Send className="h-4 w-4" /> Nu publiceren
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="schedule" id="ghl-schedule" />
            <Label htmlFor="ghl-schedule" className="flex items-center gap-2 cursor-pointer">
              <Clock className="h-4 w-4" /> Inplannen
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="draft" id="ghl-draft" />
            <Label htmlFor="ghl-draft" className="flex items-center gap-2 cursor-pointer">
              <Save className="h-4 w-4" /> Opslaan als draft
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Schedule Date/Time */}
      {publishMode === "schedule" && (
        <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
          <div className="space-y-2">
            <Label className="text-sm">Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, "PPP", { locale: nl }) : "Kies datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Tijd</Label>
            <Select value={scheduleTime} onValueChange={setScheduleTime}>
              <SelectTrigger>
                <SelectValue placeholder="Kies tijd" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
        )}
        <Button
          onClick={() => scheduleMutation.mutate()}
          disabled={selectedAccounts.length === 0 || scheduleMutation.isPending || (publishMode === "schedule" && !scheduleDate)}
          className="flex-1"
        >
          {scheduleMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Bezig...</>
          ) : publishMode === "now" ? (
            <><Send className="h-4 w-4 mr-2" />Nu Publiceren</>
          ) : publishMode === "schedule" ? (
            <><Clock className="h-4 w-4 mr-2" />Inplannen</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Opslaan als Draft</>
          )}
        </Button>
      </div>

      {scheduleMutation.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{scheduleMutation.error?.message || "Er ging iets mis bij het inplannen."}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scheduleMutation.mutate()}
            className="w-full"
          >
            Opnieuw proberen
          </Button>
        </div>
      )}

      {scheduleMutation.isSuccess && (
        <div className="flex items-center gap-2 text-green-600 text-sm justify-center">
          <CheckCircle2 className="h-4 w-4" />
          Succesvol {publishMode === "now" ? "gepubliceerd" : publishMode === "schedule" ? "ingepland" : "opgeslagen"}!
        </div>
      )}
    </div>
  );
}
