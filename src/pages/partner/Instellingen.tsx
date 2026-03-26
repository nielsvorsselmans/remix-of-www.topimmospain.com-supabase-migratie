import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Settings, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Building2,
  Copy,
  Check,
  Save
} from "lucide-react";

export default function PartnerInstellingen() {
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    bio: "",
  });

  // Fetch partner profile - use impersonated partner if available
  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner-settings", user?.id, impersonatedPartner?.id],
    queryFn: async () => {
      // If impersonating, fetch the impersonated partner's data
      if (isImpersonating && impersonatedPartner) {
        const { data, error } = await supabase
          .from("partners")
          .select("*")
          .eq("id", impersonatedPartner.id)
          .single();
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id || isImpersonating,
  });

  // Update form data when partner data changes
  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        email: partner.email || "",
        phone: partner.phone || "",
        company: partner.company || "",
        website: partner.website || "",
        bio: partner.bio || "",
      });
    }
  }, [partner]);

  // Update partner mutation - disabled when impersonating
  const updatePartner = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Prevent updates when impersonating
      if (isImpersonating) {
        throw new Error("Cannot update partner settings while impersonating");
      }
      
      const { error } = await supabase
        .from("partners")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          website: data.website,
          bio: data.bio,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-settings"] });
      toast.success("Instellingen opgeslagen");
    },
    onError: () => {
      toast.error("Er ging iets mis bij het opslaan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePartner.mutate(formData);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${partner?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link gekopieerd naar klembord");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Instellingen</h1>
          <p className="text-muted-foreground">
            Beheer je partner profiel en voorkeuren
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profiel
              </CardTitle>
              <CardDescription>Je publieke partnerinformatie</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      placeholder="Je naam"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      placeholder="je@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      placeholder="+31 6 12345678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Bedrijf</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="pl-10"
                      placeholder="Bedrijfsnaam"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="pl-10"
                      placeholder="https://jouwwebsite.nl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Vertel iets over jezelf..."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={updatePartner.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updatePartner.isPending ? "Opslaan..." : "Opslaan"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Referral Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Referral Link
                </CardTitle>
                <CardDescription>Deel deze link om nieuwe klanten aan te brengen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Jouw unieke link:</p>
                  <p className="font-mono text-sm break-all">
                    {partner?.referral_code 
                      ? `${window.location.origin}/?ref=${partner.referral_code}`
                      : "Geen referral code beschikbaar"
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={copyReferralLink}
                  disabled={!partner?.referral_code}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Status</CardTitle>
                <CardDescription>Je huidige partner status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {partner?.active ? "Actief" : "Inactief"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Categorie</span>
                    <span className="font-medium capitalize">
                      {partner?.category || "Partner"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
