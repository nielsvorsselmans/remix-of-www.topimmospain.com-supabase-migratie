-- Fix klant_detail_view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures the view respects RLS policies of the querying user

-- First drop the existing view
DROP VIEW IF EXISTS public.klant_detail_view;

-- Recreate the view with SECURITY INVOKER
CREATE VIEW public.klant_detail_view
WITH (security_invoker = true)
AS
SELECT 
    cl.id,
    cl.crm_user_id,
    cl.email,
    cl.first_name,
    cl.last_name,
    cl.phone,
    cl.visitor_id,
    cl.user_id,
    cl.ghl_contact_id,
    cl.source_campaign,
    cl.source_email,
    cl.utm_source,
    cl.utm_medium,
    cl.utm_campaign,
    cl.first_visit_at,
    cl.last_visit_at,
    cl.follow_up_status,
    cl.last_follow_up_at,
    cl.next_follow_up_at,
    cl.follow_up_notes,
    cl.feedback_requested_at,
    cl.feedback_received_at,
    cl.feedback_score,
    cl.feedback_text,
    cl.created_at,
    cl.updated_at,
    cl.referred_by_partner_id,
    cl.linked_visitor_ids,
    cl.last_ghl_refresh_at,
    cl.journey_phase,
    cl.journey_phase_updated_at,
    cl.journey_phase_updated_by,
    cl.admin_notes,
    cl.last_magic_link_sent_at,
    cl.magic_link_sent_count,
    cl.street_address,
    cl.postal_code,
    cl.residence_city,
    cl.country,
    cl.tax_id_bsn,
    cl.tax_id_nie,
    cl.nationality,
    cl.date_of_birth,
    cl.personal_data_complete,
    cl.personal_data_completed_at,
    cl.qualified_at,
    cl.qualification_reason,
    cl.reactivated_at,
    cl.dropped_off_at,
    cl.dropped_off_phase,
    cl.dropped_off_reason,
    cl.dropped_off_notes,
    cl.recontact_allowed,
    cl.recontact_after,
    cl.merged_at,
    cp.id AS customer_profile_id,
    cp.lead_temperature,
    cp.engagement_data,
    cp.inferred_preferences,
    cp.explicit_preferences,
    cp.viewed_projects,
    cp.favorite_projects,
    p.id AS partner_id,
    p.name AS partner_name,
    p.company AS partner_company,
    p.logo_url AS partner_logo_url,
    (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', cps.id,
                    'project_id', cps.project_id,
                    'status', cps.status,
                    'priority', cps.priority,
                    'admin_notes', cps.admin_notes,
                    'customer_notes', cps.customer_notes,
                    'assigned_at', cps.assigned_at,
                    'project', jsonb_build_object(
                        'id', proj.id,
                        'name', proj.name,
                        'city', proj.city,
                        'featured_image', proj.featured_image,
                        'price_from', proj.price_from,
                        'latitude', proj.latitude,
                        'longitude', proj.longitude,
                        'showhouse_address', proj.showhouse_address,
                        'showhouse_latitude', proj.showhouse_latitude,
                        'showhouse_longitude', proj.showhouse_longitude,
                        'showhouse_maps_url', proj.showhouse_maps_url,
                        'showhouse_notes', proj.showhouse_notes
                    )
                )
                ORDER BY cps.priority
            ),
            '[]'::jsonb
        )
        FROM customer_project_selections cps
        LEFT JOIN projects proj ON proj.id = cps.project_id
        WHERE cps.crm_lead_id = cl.id
    ) AS assigned_projects,
    (
        SELECT COALESCE(
            jsonb_agg(
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
                )
                ORDER BY cvt.trip_start_date DESC
            ),
            '[]'::jsonb
        )
        FROM customer_viewing_trips cvt
        WHERE cvt.crm_lead_id = cl.id
    ) AS trips
FROM crm_leads cl
LEFT JOIN partners p ON cl.referred_by_partner_id = p.id
LEFT JOIN customer_profiles cp ON (cp.crm_lead_id = cl.id) OR (cp.user_id = cl.user_id AND cl.user_id IS NOT NULL AND cp.crm_lead_id IS NULL);