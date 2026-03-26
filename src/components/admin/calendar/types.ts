export interface CalendarItem {
  id: string;
  type: "blog" | "linkedin" | "facebook";
  status: "scheduled" | "published";
  title: string;
  date: Date;
  metadata: {
    category?: string;
    platform?: string;
    time?: string;
    slug?: string;
    intro?: string;
    content?: string;
    hasBlogLink?: boolean;
    blogPostTitle?: string;
  };
}

export type ViewMode = "month" | "week";
export type TimeSlot = "morning" | "afternoon" | "evening";

export interface CalendarFilters {
  showPublished: boolean;
  contentType: "all" | "blog" | "linkedin" | "facebook";
}
