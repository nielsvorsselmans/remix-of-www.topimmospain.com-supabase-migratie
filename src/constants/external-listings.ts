/**
 * Centralized constants for the external listing tool.
 * Change here to update both customer-facing and admin-facing logic.
 */

export const ALLOWED_DOMAINS = [
  "idealista.com",
  "fotocasa.es",
  "pisos.com",
  "kyero.com",
  "thinkspain.com",
  "rightmove.co.uk",
  "inmobalia.com",
];

export const DAILY_SUBMISSION_LIMIT = 5;

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some((d) => parsed.hostname.includes(d));
  } catch {
    return false;
  }
}

/**
 * Shared status badge configuration for external listing submissions.
 * Used by both admin (KlantSubmissionsCard) and customer (SubmitExternalUrlCard).
 *
 * `adminLabel` is the admin-facing label; `customerLabel` is the customer-facing label.
 */
export const SUBMISSION_STATUS_CONFIG: Record<
  string,
  { adminLabel: string; customerLabel: string; className: string }
> = {
  pending_review: {
    adminLabel: "Wacht op review",
    customerLabel: "Wacht op review",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  approved: {
    adminLabel: "Goedgekeurd",
    customerLabel: "Goedgekeurd",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    adminLabel: "Afgewezen",
    customerLabel: "Niet geschikt",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  scraped: {
    adminLabel: "Verwerkt",
    customerLabel: "Verwerkt",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
};

/**
 * Extract platform name from a URL hostname.
 * Returns hostname without "www." prefix, or "onbekend" on failure.
 */
export function extractPlatform(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "onbekend";
  }
}
