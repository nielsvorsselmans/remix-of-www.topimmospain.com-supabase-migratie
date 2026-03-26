-- FASE 1: Blog Analytics Consolidatie (retry without trigger issues)

-- Disable trigger temporarily
DROP TRIGGER IF EXISTS trigger_aggregate_on_tracking_events ON tracking_events;

-- Insert blog scroll milestones
INSERT INTO tracking_events (
  event_name,
  visitor_id,
  user_id,
  crm_user_id,
  occurred_at,
  event_params,
  path,
  full_url,
  site
)
SELECT
  CASE 
    WHEN milestone_25_reached THEN 'blog_scroll_milestone_25'
    WHEN milestone_50_reached THEN 'blog_scroll_milestone_50'
    WHEN milestone_75_reached THEN 'blog_scroll_milestone_75'
  END as event_name,
  visitor_id,
  user_id,
  crm_user_id,
  COALESCE(milestone_25_at, milestone_50_at, milestone_75_at, created_at) as occurred_at,
  jsonb_build_object(
    'blog_post_id', blog_post_id,
    'blog_post_slug', blog_post_slug,
    'blog_post_title', blog_post_title,
    'blog_post_category', blog_post_category,
    'scroll_depth_percentage', scroll_depth_percentage
  ) as event_params,
  '/blog/' || blog_post_slug as path,
  'https://www.vivavastgoed.be/blog/' || blog_post_slug as full_url,
  'vivavastgoed.be' as site
FROM blog_reading_analytics
WHERE milestone_25_reached OR milestone_50_reached OR milestone_75_reached;

-- Insert blog finished reading events
INSERT INTO tracking_events (
  event_name,
  visitor_id,
  user_id,
  crm_user_id,
  occurred_at,
  event_params,
  path,
  full_url,
  site
)
SELECT
  'blog_finished_reading' as event_name,
  visitor_id,
  user_id,
  crm_user_id,
  created_at as occurred_at,
  jsonb_build_object(
    'blog_post_id', blog_post_id,
    'blog_post_slug', blog_post_slug,
    'blog_post_title', blog_post_title,
    'blog_post_category', blog_post_category,
    'time_spent_seconds', time_spent_seconds,
    'scroll_depth_percentage', scroll_depth_percentage
  ) as event_params,
  '/blog/' || blog_post_slug as path,
  'https://www.vivavastgoed.be/blog/' || blog_post_slug as full_url,
  'vivavastgoed.be' as site
FROM blog_reading_analytics
WHERE finished_reading = true;

-- Insert blog share events
INSERT INTO tracking_events (
  event_name,
  visitor_id,
  user_id,
  crm_user_id,
  occurred_at,
  event_params,
  path,
  full_url,
  site
)
SELECT
  'blog_share' as event_name,
  visitor_id,
  user_id,
  crm_user_id,
  updated_at as occurred_at,
  jsonb_build_object(
    'blog_post_id', blog_post_id,
    'blog_post_slug', blog_post_slug,
    'blog_post_title', blog_post_title,
    'blog_post_category', blog_post_category
  ) as event_params,
  '/blog/' || blog_post_slug as path,
  'https://www.vivavastgoed.be/blog/' || blog_post_slug as full_url,
  'vivavastgoed.be' as site
FROM blog_reading_analytics
WHERE shared_article = true;

-- Drop blog_reading_analytics table (data is now in tracking_events)
DROP TABLE IF EXISTS blog_reading_analytics CASCADE;

-- Re-enable trigger
CREATE TRIGGER trigger_aggregate_on_tracking_events
AFTER INSERT ON tracking_events
FOR EACH ROW
EXECUTE FUNCTION trigger_aggregate_customer_profile();

-- FASE 2: CRM Leads Cleanup - Verwijder behavior columns
ALTER TABLE crm_leads 
DROP COLUMN IF EXISTS total_visits,
DROP COLUMN IF EXISTS total_page_views,
DROP COLUMN IF EXISTS total_project_views,
DROP COLUMN IF EXISTS inferred_budget_min,
DROP COLUMN IF EXISTS inferred_budget_max,
DROP COLUMN IF EXISTS inferred_cities,
DROP COLUMN IF EXISTS inferred_regions,
DROP COLUMN IF EXISTS most_viewed_projects;