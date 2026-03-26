import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectVideo {
  id: string;
  video_url: string;
  title: string;
  description: string | null;
  video_date: string;
  video_type: string;
  thumbnail_url: string | null;
  media_type: string;
  image_urls: string[];
}

export interface VideoLink {
  id: string;
  visible_public: boolean;
  visible_portal: boolean;
  is_featured?: boolean;
  project_videos: ProjectVideo;
}

export interface SaleBuildUpdates {
  saleVideos: VideoLink[];
  projectVideos: VideoLink[];
  cityVideos: VideoLink[];
  projectName: string | null;
  cityName: string | null;
  isLoading: boolean;
}

export function useSaleBuildUpdates(saleId: string | null) {
  return useQuery({
    queryKey: ['sale-build-updates', saleId],
    queryFn: async (): Promise<Omit<SaleBuildUpdates, 'isLoading'>> => {
      if (!saleId) {
        return {
          saleVideos: [],
          projectVideos: [],
          cityVideos: [],
          projectName: null,
          cityName: null,
        };
      }

      // 1. Get sale info (project_id and city)
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          id,
          project:projects(id, name, city)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      const projectId = sale?.project?.id;
      const cityName = sale?.project?.city;
      const projectName = sale?.project?.name;

      // 2. Get sale-specific videos
      const { data: saleVideoLinks, error: saleVideoError } = await supabase
        .from('sale_video_links')
        .select(`
          id,
          project_videos (*)
        `)
        .eq('sale_id', saleId);

      if (saleVideoError) throw saleVideoError;

      const saleVideos: VideoLink[] = (saleVideoLinks || []).map((link: any) => ({
        id: link.id,
        visible_public: true,
        visible_portal: true,
        project_videos: {
          ...link.project_videos,
          image_urls: link.project_videos.image_urls || [],
        },
      }));

      // Create a Set of video IDs that are specifically linked to sales
      // These should NOT appear in project-level updates (they're apartment-specific)
      const saleVideoIds = new Set(
        saleVideoLinks?.map((link: any) => link.project_videos.id) || []
      );

      // 3. Get project-level videos (portal visible)
      let projectVideos: VideoLink[] = [];
      if (projectId) {
        const { data: projectVideoLinks, error: projectVideoError } = await supabase
          .from('project_video_links')
          .select(`
            id,
            visible_public,
            visible_portal,
            is_featured,
            project_videos (*)
          `)
          .eq('project_id', projectId)
          .eq('visible_portal', true)
          .order('order_index', { ascending: true });

        if (projectVideoError) throw projectVideoError;

        // Filter out videos that are already linked to specific sales
        // These are apartment-specific and should only show for their owner
        projectVideos = (projectVideoLinks || [])
          .filter((link: any) => !saleVideoIds.has(link.project_videos.id))
          .map((link: any) => ({
            id: link.id,
            visible_public: link.visible_public,
            visible_portal: link.visible_portal,
            is_featured: link.is_featured,
            project_videos: {
              ...link.project_videos,
              image_urls: link.project_videos.image_urls || [],
            },
          }));
      }

      // 4. Get city-level videos (portal visible)
      let cityVideos: VideoLink[] = [];
      if (cityName) {
        const { data: cityVideoLinks, error: cityVideoError } = await supabase
          .from('city_video_links')
          .select(`
            id,
            visible_public,
            visible_portal,
            project_videos (*)
          `)
          .eq('city', cityName)
          .eq('visible_portal', true);

        if (cityVideoError) throw cityVideoError;

        cityVideos = (cityVideoLinks || []).map((link: any) => ({
          id: link.id,
          visible_public: link.visible_public,
          visible_portal: link.visible_portal,
          project_videos: {
            ...link.project_videos,
            image_urls: link.project_videos.image_urls || [],
          },
        }));
      }

      // Sort all by video_date descending
      const sortByDate = (a: VideoLink, b: VideoLink) => 
        new Date(b.project_videos.video_date).getTime() - new Date(a.project_videos.video_date).getTime();

      return {
        saleVideos: saleVideos.sort(sortByDate),
        projectVideos: projectVideos.sort(sortByDate),
        cityVideos: cityVideos.sort(sortByDate),
        projectName,
        cityName,
      };
    },
    enabled: !!saleId,
  });
}
