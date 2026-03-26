import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Clock, BookOpen, ExternalLink } from 'lucide-react';
import { useOrientationGuide } from '@/hooks/useOrientationGuide';
import { OrientationArticleReader } from '@/components/orientation';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { PILLARS } from '@/constants/orientation';

export default function OrientationArticle() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { 
    guideItems, 
    isItemCompleted, 
    isItemStarted,
    startItem,
    completeItem,
    toggleItemCompletion,
    isLoading: guideLoading 
  } = useOrientationGuide();

  // Fetch the current item with blog post content
  const { data: currentItem, isLoading: itemLoading } = useQuery({
    queryKey: ['orientation-article', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orientation_guide_items')
        .select(`
          *,
          blog_post:blog_posts(*)
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  // Mark as started when article is opened
  useEffect(() => {
    if (currentItem && !isItemStarted(currentItem.id)) {
      startItem(currentItem.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.id]);

  // Get navigation info
  const currentPillar = currentItem?.pillar;
  const pillarItems = guideItems?.filter(item => item.pillar === currentPillar) || [];
  const currentIndex = pillarItems.findIndex(item => item.id === itemId);
  const prevItem = currentIndex > 0 ? pillarItems[currentIndex - 1] : null;
  const nextItem = currentIndex < pillarItems.length - 1 ? pillarItems[currentIndex + 1] : null;
  
  // Get pillar info from centralized config
  const pillarInfo = PILLARS.find(p => p.key === currentPillar);

  const isLoading = itemLoading || guideLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Artikel niet gevonden</h2>
        <p className="text-muted-foreground mb-4">Dit artikel bestaat niet of is verwijderd.</p>
        <Button onClick={() => navigate('/dashboard/gidsen')}>
          Terug naar Oriëntatiegids
        </Button>
      </div>
    );
  }

  const title = currentItem.custom_title || currentItem.blog_post?.title || 'Artikel';
  const isCompleted = isItemCompleted(currentItem.id);
  const readTime = currentItem.custom_read_time_minutes || 5;

  const handleMarkComplete = () => {
    if (isCompleted) {
      toggleItemCompletion(currentItem.id);
    } else {
      completeItem({ itemId: currentItem.id });
    }
  };

  return (
      <div className="max-w-4xl mx-auto">
        {/* Header with navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/gidsen')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar overzicht
          </Button>

          {/* Pillar badge and progress */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {pillarInfo && (
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                    pillarInfo.colors.bg,
                    pillarInfo.colors.text
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  {pillarInfo.title}
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                Artikel {currentIndex + 1} van {pillarItems.length}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {readTime} min leestijd
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {title}
          </h1>

          {/* Completion status */}
          {isCompleted && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              Je hebt dit artikel gelezen
            </div>
          )}
        </div>

        {/* Article content */}
        <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-6">
          <OrientationArticleReader item={currentItem} />
          
          {/* External link to full blog if available */}
          {currentItem.blog_post?.slug && (
            <div className="mt-8 pt-6 border-t border-border">
              <Link 
                to={`/blog/${currentItem.blog_post.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Bekijk volledige versie op kennisbank
              </Link>
            </div>
          )}
        </div>

        {/* Mark as complete button */}
        <div className="flex justify-center mb-8">
          <Button
            size="lg"
            variant={isCompleted ? "outline" : "default"}
            onClick={handleMarkComplete}
            className={cn(
              "min-w-[200px]",
              isCompleted && "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            )}
          >
            {isCompleted ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Gelezen
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Markeer als gelezen
              </>
            )}
          </Button>
        </div>

        {/* Navigation between articles */}
        <div className="flex items-center justify-between py-4 border-t border-border">
          <div className="flex-1">
            {prevItem && (
              <Button
                variant="ghost"
                onClick={() => navigate(`/dashboard/orientatie/artikel/${prevItem.id}`)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {prevItem.custom_title || prevItem.blog_post?.title || 'Vorige'}
                </span>
                <span className="sm:hidden">Vorige</span>
              </Button>
            )}
          </div>
          
          <div className="flex-1 text-right">
            {nextItem && (
              <Button
                variant="ghost"
                onClick={() => navigate(`/dashboard/orientatie/artikel/${nextItem.id}`)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="hidden sm:inline">
                  {nextItem.custom_title || nextItem.blog_post?.title || 'Volgende'}
                </span>
                <span className="sm:hidden">Volgende</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick jump to other articles */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Andere artikels in {pillarInfo?.title || 'deze pijler'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {pillarItems.map((item, index) => {
              const itemTitle = item.custom_title || item.blog_post?.title || `Artikel ${index + 1}`;
              const isCurrent = item.id === itemId;
              const itemCompleted = isItemCompleted(item.id);
              
              return (
                <Button
                  key={item.id}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => !isCurrent && navigate(`/dashboard/orientatie/artikel/${item.id}`)}
                  disabled={isCurrent}
                  className={cn(
                    "text-xs",
                    itemCompleted && !isCurrent && "border-green-500/50"
                  )}
                >
                  {itemCompleted && <Check className="w-3 h-3 mr-1" />}
                  {itemTitle.length > 25 ? `${itemTitle.slice(0, 25)}...` : itemTitle}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
  );
}
