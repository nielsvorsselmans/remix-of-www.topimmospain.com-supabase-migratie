import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, FileText } from "lucide-react";

type Pillar = 'regio' | 'financiering' | 'juridisch' | 'fiscaliteit';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface GuideItem {
  id: string;
  pillar: Pillar;
  blog_post_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_read_time_minutes: number | null;
  order_index: number;
  is_required: boolean;
  active: boolean;
}

interface OrientationGuideItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GuideItem | null;
  pillar: Pillar;
  blogPosts: BlogPost[];
  usedBlogPostIds: Set<string | null>;
  onSuccess: () => void;
}

export function OrientationGuideItemDialog({
  open,
  onOpenChange,
  item,
  pillar,
  blogPosts,
  usedBlogPostIds,
  onSuccess,
}: OrientationGuideItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<"blog" | "custom">("blog");
  const [blogPostId, setBlogPostId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customReadTime, setCustomReadTime] = useState<number>(5);
  const [isRequired, setIsRequired] = useState(false);
  const [orderIndex, setOrderIndex] = useState(0);

  useEffect(() => {
    if (item) {
      setItemType(item.blog_post_id ? "blog" : "custom");
      setBlogPostId(item.blog_post_id || "");
      setCustomTitle(item.custom_title || "");
      setCustomDescription(item.custom_description || "");
      setCustomReadTime(item.custom_read_time_minutes || 5);
      setIsRequired(item.is_required);
      setOrderIndex(item.order_index);
    } else {
      setItemType("blog");
      setBlogPostId("");
      setCustomTitle("");
      setCustomDescription("");
      setCustomReadTime(5);
      setIsRequired(false);
      setOrderIndex(99);
    }
  }, [item, open]);

  const availableBlogPosts = blogPosts.filter(
    (bp) => !usedBlogPostIds.has(bp.id) || bp.id === item?.blog_post_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        pillar,
        blog_post_id: itemType === "blog" && blogPostId ? blogPostId : null,
        custom_title: itemType === "custom" ? customTitle : (customTitle || null),
        custom_description: customDescription || null,
        custom_read_time_minutes: itemType === "custom" ? customReadTime : null,
        is_required: isRequired,
        order_index: orderIndex,
        active: true,
      };

      if (itemType === "blog" && !blogPostId) {
        toast.error("Selecteer een blog artikel");
        setLoading(false);
        return;
      }

      if (itemType === "custom" && !customTitle) {
        toast.error("Vul een titel in");
        setLoading(false);
        return;
      }

      if (item) {
        const { error } = await supabase
          .from("orientation_guide_items")
          .update(data)
          .eq("id", item.id);

        if (error) throw error;
        toast.success("Item bijgewerkt");
      } else {
        const { error } = await supabase
          .from("orientation_guide_items")
          .insert(data);

        if (error) throw error;
        toast.success("Item toegevoegd");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Fout bij opslaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {item ? "Item Bewerken" : "Nieuw Item Toevoegen"}
          </DialogTitle>
          <DialogDescription>
            Voeg een blog artikel of custom item toe aan de oriëntatiegids.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Type Selection */}
          <div className="space-y-2">
            <Label>Type item</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={itemType === "blog" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setItemType("blog")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Blog Artikel
              </Button>
              <Button
                type="button"
                variant={itemType === "custom" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setItemType("custom")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Custom Item
              </Button>
            </div>
          </div>

          {/* Blog Post Selection */}
          {itemType === "blog" && (
            <div className="space-y-2">
              <Label htmlFor="blogPost">Blog Artikel</Label>
              <Select value={blogPostId} onValueChange={setBlogPostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een artikel" />
                </SelectTrigger>
                <SelectContent>
                  {availableBlogPosts.map((post) => (
                    <SelectItem key={post.id} value={post.id}>
                      <div className="flex items-center gap-2">
                        <span>{post.title}</span>
                        <span className="text-xs text-muted-foreground">
                          ({post.category})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableBlogPosts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Alle gepubliceerde artikelen zijn al toegevoegd aan de gids.
                </p>
              )}
            </div>
          )}

          {/* Custom Title (required for custom, optional override for blog) */}
          <div className="space-y-2">
            <Label htmlFor="customTitle">
              {itemType === "custom" ? "Titel" : "Aangepaste titel (optioneel)"}
            </Label>
            <Input
              id="customTitle"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={itemType === "custom" ? "Bijv. Costa Blanca vs Costa Cálida" : "Laat leeg om blog titel te gebruiken"}
            />
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label htmlFor="customDescription">Beschrijving (optioneel)</Label>
            <Textarea
              id="customDescription"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Korte beschrijving voor in de gids"
              rows={2}
            />
          </div>

          {/* Read Time for Custom Items */}
          {itemType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="readTime">Leestijd (minuten)</Label>
              <Input
                id="readTime"
                type="number"
                min={1}
                max={60}
                value={customReadTime}
                onChange={(e) => setCustomReadTime(parseInt(e.target.value) || 5)}
              />
            </div>
          )}

          {/* Order Index */}
          <div className="space-y-2">
            <Label htmlFor="orderIndex">Volgorde positie</Label>
            <Input
              id="orderIndex"
              type="number"
              min={0}
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Lagere nummers komen eerst. Items met dezelfde waarde worden op volgorde van toevoegen gesorteerd.
            </p>
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Verplicht item</Label>
              <p className="text-sm text-muted-foreground">
                Verplichte items moeten gelezen worden voor volledige voorbereiding
              </p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Opslaan..." : item ? "Bijwerken" : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
