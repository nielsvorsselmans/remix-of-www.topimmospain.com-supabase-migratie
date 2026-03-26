-- Update customer_profiles explicit_preferences to support arrival and departure dates
COMMENT ON COLUMN customer_profiles.explicit_preferences IS 'User explicitly stated preferences including: budget_min, budget_max, preferred_regions, preferred_cities, bedrooms_min, bedrooms_max, property_types, investment_goal, timeline, persona_type, spain_visit_planned, spain_visit_arrival_date, spain_visit_departure_date, phone';

-- The JSONB field structure now includes:
-- {
--   "spain_visit_planned": string, -- "geen_plannen", "binnen_1_maand", "binnen_3_maanden", "binnen_6_maanden", "al_gepland"
--   "spain_visit_arrival_date": string, -- ISO date string
--   "spain_visit_departure_date": string, -- ISO date string
--   "phone": string
-- }