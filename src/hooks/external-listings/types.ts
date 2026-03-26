export interface ExternalListing {
  id: string;
  source_url: string;
  source_platform: string;
  title: string | null;
  price: number | null;
  currency: string;
  city: string | null;
  region: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  plot_size_sqm: number | null;
  description: string | null;
  features: Record<string, unknown>;
  images: string[];
  created_at: string;
  scrape_status?: string | null;
  scrape_error?: string | null;
  raw_scraped_data?: Record<string, unknown> | null;
  scraped_at?: string | null;
  last_scrape_attempt?: string | null;
}

export interface ExternalListingAssignment {
  id: string;
  external_listing_id: string;
  crm_lead_id: string;
  status: string;
  admin_notes: string | null;
  customer_notes: string | null;
  assigned_at: string;
  external_listing?: ExternalListing;
}

export interface AllExternalAssignment {
  id: string;
  external_listing_id: string;
  crm_lead_id: string;
  status: string;
  admin_notes: string | null;
  customer_notes: string | null;
  assigned_at: string;
  listing_title: string | null;
  listing_city: string | null;
  listing_price: number | null;
  listing_platform: string;
  listing_image: string | null;
  lead_name: string | null;
  lead_email: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface SearchedExternalListing {
  id: string;
  title: string | null;
  city: string | null;
  price: number | null;
  source_platform: string;
  source_url: string;
  images: string[];
  assignment_count: number;
}

export interface ExternalListingSubmission {
  id: string;
  crm_lead_id: string;
  submitted_by_user_id: string;
  source_url: string;
  customer_message: string | null;
  status: string;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  external_listing_id: string | null;
  created_at: string;
}

/**
 * Custom error class for scraping operations.
 * Carries an error code (e.g. "BLOCKED", "TIMEOUT") for programmatic handling.
 */
export class ScrapeError extends Error {
  code: string;

  constructor(message: string, code: string = "UNKNOWN") {
    super(message);
    this.name = "ScrapeError";
    this.code = code;
  }
}
