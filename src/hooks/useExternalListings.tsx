/**
 * Barrel re-export file.
 * All existing imports from "@/hooks/useExternalListings" continue to work.
 */

// Types
export type {
  ExternalListing,
  ExternalListingAssignment,
  AllExternalAssignment,
  StatusHistoryEntry,
  SearchedExternalListing,
  ExternalListingSubmission,
} from "./external-listings/types";

// ScrapeError is a class — re-export as value for instanceof usage
export { ScrapeError } from "./external-listings/types";

// Queries
export {
  useCustomerLeadId,
  useExternalListingsForLead,
  useCustomerExternalListings,
  useExternalListingDetail,
  useAdminOrCustomerExternalListing,
  useAllExternalAssignments,
  useExternalAssignmentHistory,
  useSearchExternalListings,
  useSearchCrmLeads,
} from "./external-listings/useExternalListingQueries";

// Mutations
export {
  useCheckDuplicateUrl,
  useCreateExternalListing,
  useUpdateExternalAssignment,
  useUpdateExternalListing,
  useDeleteExternalAssignment,
  useAssignExistingListing,
} from "./external-listings/useExternalListingMutations";

// Scraping
export {
  useScrapeIdealista,
  useRetryScrape,
  pollEnrichment,
} from "./external-listings/useExternalScraping";

// Submissions
export {
  useExternalSubmissions,
  useCustomerSubmissions,
  useSubmitExternalUrl,
  useReviewSubmission,
  useToggleSelfService,
  usePendingSubmissionsCount,
} from "./external-listings/useExternalSubmissions";
