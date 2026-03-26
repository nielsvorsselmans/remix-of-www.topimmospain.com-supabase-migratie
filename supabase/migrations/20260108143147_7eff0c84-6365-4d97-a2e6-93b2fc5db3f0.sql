-- Phase 6: Data Cleanup Migration
-- 1. Link orphan customer_profiles to crm_leads where possible (via user_id match)
UPDATE customer_profiles cp
SET crm_lead_id = cl.id,
    updated_at = NOW()
FROM crm_leads cl
WHERE cp.crm_lead_id IS NULL
  AND cp.user_id IS NOT NULL
  AND cl.user_id = cp.user_id;

-- 2. Delete very old orphan customer_profiles (>90 days, no user, no crm_lead, minimal activity)
DELETE FROM customer_profiles
WHERE user_id IS NULL
  AND crm_lead_id IS NULL
  AND created_at < NOW() - INTERVAL '90 days'
  AND COALESCE((engagement_data->>'total_page_views')::int, 0) < 3
  AND COALESCE(array_length(viewed_projects, 1), 0) = 0
  AND COALESCE(array_length(favorite_projects, 1), 0) = 0;