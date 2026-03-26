import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useImageUpload } from "@/hooks/useImageUpload";
import type { TeamMember } from "@/types/admin";

interface TeamMemberFormDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export const TeamMemberFormDialog = ({ open, onClose, member }: TeamMemberFormDialogProps) => {
  const queryClient = useQueryClient();
  const { upload, isUploading } = useImageUpload({ bucket: 'partner-assets', pathPrefix: 'team-members' });
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    bio: "",
    image_url: "",
    email: "",
    phone: "",
    active: true,
    show_on_about_page: true,
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        role: member.role,
        bio: member.bio,
        image_url: member.image_url || "",
        email: member.email || "",
        phone: member.phone || "",
        active: member.active,
        show_on_about_page: member.show_on_about_page,
      });
    } else {
      setFormData({
        name: "",
        role: "",
        bio: "",
        image_url: "",
        email: "",
        phone: "",
        active: true,
        show_on_about_page: true,
      });
    }
  }, [member, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (member) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: data.name,
            role: data.role,
            bio: data.bio,
            image_url: data.image_url || null,
            email: data.email || null,
            phone: data.phone || null,
            active: data.active,
            show_on_about_page: data.show_on_about_page,
          })
          .eq('id', member.id);
        if (error) throw error;
      } else {
        // Get max order_index
        const { data: existing } = await supabase
          .from('team_members')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1);
        
        const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

        const { error } = await supabase
          .from('team_members')
          .insert({
            name: data.name,
            role: data.role,
            bio: data.bio,
            image_url: data.image_url || null,
            email: data.email || null,
            phone: data.phone || null,
            active: data.active,
            show_on_about_page: data.show_on_about_page,
            order_index: nextIndex,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members-admin'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(member ? "Teamlid bijgewerkt" : "Teamlid toegevoegd");
      onClose();
    },
    onError: () => {
      toast.error("Er ging iets mis");
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await upload(file);
    if (publicUrl) {
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.bio) {
      toast.error("Vul alle verplichte velden in");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? "Teamlid bewerken" : "Nieuw teamlid"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.image_url || undefined} alt={formData.name} />
              <AvatarFallback>{formData.name.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploaden..." : "Foto uploaden"}
                </div>
              </Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG of WebP</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Voornaam"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol / Functie *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder="bijv. Jouw aanspreekpunt"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Korte beschrijving..."
              rows={3}
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@voorbeeld.nl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Actief</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_on_about">Tonen op Over Ons pagina</Label>
              <Switch
                id="show_on_about"
                checked={formData.show_on_about_page}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_on_about_page: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
