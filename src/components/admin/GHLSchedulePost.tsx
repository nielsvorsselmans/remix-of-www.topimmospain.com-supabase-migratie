import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  CalendarIcon, 
  Send, 
  Clock, 
  Save, 
  Linkedin, 
  Facebook, 
  Instagram, 
  Twitter,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GHLSocialAccount {
  id: string;
  name: string;
  type: string;
  platform: string;
  avatar?: string;
}

interface GHLSchedulePostProps {
  content: string;
  hashtags?: string[];
  triggerWord?: string;
  projectId?: string;
  platform?: string;
  featuredImage?: string;
  onScheduled?: () => void;
}

const platformIcons: Record<string, React.ComponentType<any>> = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
};

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00"
];

export function GHLSchedulePost({
  content,
  hashtags,
  triggerWord,
  projectId,
  platform,
  featuredImage,
  onScheduled
}: GHLSchedulePostProps) {
  const { toast } = useToast();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "draft">("schedule");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>("10:00");
  const [includeImage, setIncludeImage] = useState(true);

  // Fetch GHL social accounts
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
  });

  // Schedule post mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (selectedAccounts.length === 0) {
        throw new Error("Selecteer minimaal één account");
      }

      let scheduleDateISO: string | undefined;
      if (publishMode === "schedule") {
        if (!scheduleDate) {
          throw new Error("Selecteer een datum voor scheduling");
        }
        const dateWithTime = new Date(scheduleDate);
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        dateWithTime.setHours(hours, minutes, 0, 0);
        scheduleDateISO = dateWithTime.toISOString();
      }

      const mediaUrls = includeImage && featuredImage ? [featuredImage] : [];

      const { data, error } = await supabase.functions.invoke("schedule-ghl-post", {
        body: {
          accountIds: selectedAccounts,
          content,
          hashtags: [],
          mediaUrls,
          scheduleDate: scheduleDateISO,
          publishNow: publishMode === "now",
          projectId,
          platform,
          triggerWord
        },
      });

      // Check data.error first (edge function returns 200 + success:false for GHL errors)
      if (data && !data.success && data.error) {
        throw new Error(data.error);
      }
      
      if (error) {
        console.error('Schedule GHL post error:', error);
        throw new Error(error.message || 'Onbekende fout bij inplannen');
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: publishMode === "now" ? "Post gepubliceerd!" : 
               publishMode === "schedule" ? "Post ingepland!" : 
               "Post opgeslagen",
        description: data?.message || "Succesvol verwerkt",
      });
      onScheduled?.();
    },
    onError: (error: Error) => {
      console.error('Scheduling failed:', error);
      toast({
        title: "Fout bij inplannen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const renderPlatformSection = (platformKey: string, accounts: GHLSocialAccount[]) => {
    if (!accounts || accounts.length === 0) return null;
    
    const Icon = platformIcons[platformKey] || AlertCircle;
    const platformLabel = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);

    return (
      <div key={platformKey} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {platformLabel}
        </div>
        <div className="space-y-2 pl-6">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center space-x-3">
              <Checkbox
                id={account.id}
                checked={selectedAccounts.includes(account.id)}
                onCheckedChange={() => toggleAccount(account.id)}
              />
              <label
                htmlFor={account.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                {account.avatar && (
                  <img 
                    src={account.avatar} 
                    alt={account.name} 
                    className="h-6 w-6 rounded-full object-cover"
                  />
                )}
                <span>{account.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {account.type}
                </Badge>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (accountsLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Accounts laden...</span>
        </CardContent>
      </Card>
    );
  }

  if (accountsError || !accountsData?.accounts?.length) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Geen social accounts gevonden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configureer eerst social media accounts in GoHighLevel om posts te kunnen inplannen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Publiceren via GHL
        </CardTitle>
        <CardDescription>
          Plan deze post direct in via GoHighLevel Social Planner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Selection */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Publiceren naar</Label>
          <div className="space-y-4 bg-muted/30 rounded-lg p-4">
            {accountsData.groupedAccounts && Object.entries(accountsData.groupedAccounts).map(
              ([platformKey, accounts]) => renderPlatformSection(platformKey, accounts as GHLSocialAccount[])
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
          <RadioGroup value={publishMode} onValueChange={(v) => setPublishMode(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="now" />
              <Label htmlFor="now" className="flex items-center gap-2 cursor-pointer">
                <Send className="h-4 w-4" />
                Nu publiceren
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="schedule" id="schedule" />
              <Label htmlFor="schedule" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-4 w-4" />
                Inplannen
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="draft" id="draft" />
              <Label htmlFor="draft" className="flex items-center gap-2 cursor-pointer">
                <Save className="h-4 w-4" />
                Opslaan als draft
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Schedule Date/Time */}
        {publishMode === "schedule" && (
          <div className="space-y-3 bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground"
                      )}
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
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Image Option */}
        {featuredImage && (
          <div className="flex items-start gap-4 bg-muted/30 rounded-lg p-4">
            <img 
              src={featuredImage} 
              alt="Project afbeelding" 
              className="h-16 w-24 object-cover rounded"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImage"
                  checked={includeImage}
                  onCheckedChange={(checked) => setIncludeImage(!!checked)}
                />
                <Label htmlFor="includeImage" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4" />
                  Afbeelding meesturen
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Featured image van het project toevoegen aan de post
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={() => scheduleMutation.mutate()}
          disabled={selectedAccounts.length === 0 || scheduleMutation.isPending}
          className="w-full"
          size="lg"
        >
          {scheduleMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Bezig...
            </>
          ) : publishMode === "now" ? (
            <>
              <Send className="h-4 w-4 mr-2" />
              Nu Publiceren
            </>
          ) : publishMode === "schedule" ? (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Inplannen
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Opslaan als Draft
            </>
          )}
        </Button>

        {scheduleMutation.isSuccess && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Post succesvol {publishMode === "now" ? "gepubliceerd" : publishMode === "schedule" ? "ingepland" : "opgeslagen"}!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
