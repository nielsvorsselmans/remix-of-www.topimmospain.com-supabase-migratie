import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ExternalLink } from "lucide-react";
import { useKlantFavorites } from "@/hooks/useKlantFavorites";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import type { Klant } from "@/hooks/useKlant";
import { formatPrice } from "@/lib/utils";

interface KlantFavorietenCardProps {
  klant: Klant;
}

export function KlantFavorietenCard({ klant }: KlantFavorietenCardProps) {
  const { data: favorites, isLoading } = useKlantFavorites(klant.user_id || null);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favoriete Projecten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const favoriteCount = favorites?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Favoriete Projecten
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {favoriteCount} {favoriteCount === 1 ? "project" : "projecten"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {favoriteCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nog geen favoriete projecten
          </p>
        ) : (
          <div className="space-y-3">
            {favorites?.map((fav) => (
              <Link
                key={fav.project_id}
                to={`/project/${fav.project_id}`}
                target="_blank"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                {fav.project?.featured_image ? (
                  <img
                    src={fav.project.featured_image}
                    alt={fav.project?.name || "Project"}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {fav.project?.name || "Onbekend project"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fav.project?.city || "Locatie onbekend"} · {formatPrice(fav.project?.price_from || null)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toegevoegd: {formatDate(fav.created_at)}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
