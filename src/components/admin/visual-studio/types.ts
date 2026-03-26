export interface VisualTemplate {
  id: string;
  name: string;
  category: 'carousel' | 'story' | 'ad' | 'newscard';
  format_type: string;
  width: number;
  height: number;
  template_data: {
    slideCount?: number;
    theme?: string;
    elements?: string[];
    formats?: string[];
  };
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisualExport {
  id: string;
  template_id: string | null;
  project_id: string | null;
  export_type: 'png' | 'pdf' | 'zip';
  file_url: string;
  file_name: string | null;
  metadata: {
    slideCount?: number;
    formats?: string[];
    projectName?: string;
  };
  created_by: string | null;
  created_at: string;
  template?: VisualTemplate;
  project?: {
    id: string;
    name: string;
  };
}

export interface SlideContent {
  id: string;
  type: 'cover' | 'content' | 'cta' | 'stat' | 'tip';
  headline?: string;
  subtext?: string;
  imageUrl?: string;
  stats?: { label: string; value: string }[];
  tipNumber?: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface CarouselData {
  slides: SlideContent[];
  projectId?: string;
  projectName?: string;
}

export interface StoryData {
  headline: string;
  subtext: string;
  imageUrl?: string;
  price?: string;
  location?: string;
  ctaText?: string;
  backgroundColor?: string;
  overlayOpacity?: number;
}

export interface AdData {
  headline: string;
  subtext: string;
  imageUrl?: string;
  ctaText?: string;
  usps?: string[];
  price?: string;
  formats: string[];
}

export type AdFormat = {
  name: string;
  width: number;
  height: number;
  platform: string;
};

export const AD_FORMATS: AdFormat[] = [
  { name: 'Facebook Feed', width: 1200, height: 628, platform: 'facebook' },
  { name: 'Instagram Feed', width: 1080, height: 1080, platform: 'instagram' },
  { name: 'Instagram Story', width: 1080, height: 1920, platform: 'instagram' },
  { name: 'LinkedIn', width: 1200, height: 627, platform: 'linkedin' },
  { name: 'Google Display', width: 300, height: 250, platform: 'google' },
];
