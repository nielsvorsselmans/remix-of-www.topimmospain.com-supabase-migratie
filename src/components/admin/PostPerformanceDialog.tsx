import { Heart, MessageCircle, Eye, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SocialPost } from "@/hooks/useSocialPosts";
import { usePostGenerationForPost } from "@/hooks/usePostGenerations";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface PostPerformanceDialogProps {
  post: SocialPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avgEngagementRate?: number;
}

export function PostPerformanceDialog({ post, open, onOpenChange, avgEngagementRate = 0 }: PostPerformanceDialogProps) {
  const { data: generation, isLoading } = usePostGenerationForPost(post?.id ?? null);

  if (!post) return null;

  const impressions = post.impressions || 0;
  const rate = impressions > 0 ? ((post.likes + post.comments) / impressions * 100) : 0;
  const diff = rate - avgEngagementRate;

  const briefing = generation?.briefing_snapshot as Record<string, any> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Post Performance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Engagement metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Likes", value: post.likes, icon: Heart, color: "text-red-500" },
              { label: "Reacties", value: post.comments, icon: MessageCircle, color: "text-blue-500" },
              { label: "Impressies", value: impressions, icon: Eye, color: "text-amber-500" },
              { label: "Bereik", value: post.reach, icon: Users, color: "text-green-500" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-semibold">{stat.value.toLocaleString("nl-NL")}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Engagement rate vs average */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  <p className="text-2xl font-bold">{rate.toFixed(1)}%</p>
                </div>
                {avgEngagementRate > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">vs. gemiddeld</p>
                    <p className={`text-lg font-semibold ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Creative context from generation */}
          {isLoading && <p className="text-sm text-muted-foreground">Creatieve context laden...</p>}
          
          {briefing && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Creatieve Briefing</p>
                
                {briefing.selected_hook && (
                  <div>
                    <p className="text-xs text-muted-foreground">Gekozen Hook</p>
                    <p className="text-sm italic">"{briefing.selected_hook}"</p>
                  </div>
                )}

                {briefing.archetype && (
                  <div>
                    <p className="text-xs text-muted-foreground">Archetype</p>
                    <Badge variant="outline">{briefing.archetype}</Badge>
                  </div>
                )}

                {briefing.trigger_word && (
                  <div>
                    <p className="text-xs text-muted-foreground">Trigger-woord</p>
                    <Badge variant="secondary">{briefing.trigger_word}</Badge>
                  </div>
                )}

                {briefing.emotional_angle && (
                  <div>
                    <p className="text-xs text-muted-foreground">Emotionele invalshoek</p>
                    <p className="text-sm">{briefing.emotional_angle}</p>
                  </div>
                )}

                {generation?.model_used && (
                  <div>
                    <p className="text-xs text-muted-foreground">Model</p>
                    <p className="text-xs font-mono">{generation.model_used}</p>
                  </div>
                )}

                {generation?.created_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Gegenereerd op</p>
                    <p className="text-xs">
                      {format(parseISO(generation.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isLoading && !generation && (
            <p className="text-sm text-muted-foreground">
              Geen generatie-data beschikbaar voor deze post.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
