-- Create database view for consolidated klant queries
-- This reduces 5 queries to 1 for the KlantDetail page

CREATE OR REPLACE VIEW klant_detail_view AS
SELECT 
  cl.*,
  cp.id as customer_profile_id,
  cp.lead_temperature,
  cp.engagement_data,
  cp.inferred_preferences,
  cp.explicit_preferences,
  cp.viewed_projects,
  cp.favorite_projects,
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', cps.id,
        'project_id', cps.project_id,
        'status', cps.status,
        'priority', cps.priority,
        'admin_notes', cps.admin_notes,
        'customer_notes', cps.customer_notes,
        'assigned_at', cps.assigned_at,
        'project', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'city', p.city,
          'featured_image', p.featured_image,
          'price_from', p.price_from,
          'latitude', p.latitude,
          'longitude', p.longitude,
          'showhouse_address', p.showhouse_address,
          'showhouse_latitude', p.showhouse_latitude,
          'showhouse_longitude', p.showhouse_longitude,
          'showhouse_maps_url', p.showhouse_maps_url,
          'showhouse_notes', p.showhouse_notes
        )
      ) ORDER BY cps.priority NULLS LAST
    ), '[]'::jsonb)
    FROM customer_project_selections cps
    LEFT JOIN projects p ON p.id = cps.project_id
    WHERE cps.crm_lead_id = cl.id
  ) as assigned_projects,
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', cvt.id,
        'trip_start_date', cvt.trip_start_date,
        'trip_end_date', cvt.trip_end_date,
        'status', cvt.status,
        'scheduled_viewings', cvt.scheduled_viewings,
        'flight_info', cvt.flight_info,
        'accommodation_info', cvt.accommodation_info,
        'admin_notes', cvt.admin_notes,
        'customer_notes', cvt.customer_notes
      ) ORDER BY cvt.trip_start_date DESC
    ), '[]'::jsonb)
    FROM customer_viewing_trips cvt
    WHERE cvt.crm_lead_id = cl.id
  ) as trips
FROM crm_leads cl
LEFT JOIN customer_profiles cp ON cp.crm_lead_id = cl.id 
  OR (cp.user_id = cl.user_id AND cl.user_id IS NOT NULL AND cp.crm_lead_id IS NULL);

-- Grant access to the view
GRANT SELECT ON klant_detail_view TO authenticated;
GRANT SELECT ON klant_detail_view TO service_role;