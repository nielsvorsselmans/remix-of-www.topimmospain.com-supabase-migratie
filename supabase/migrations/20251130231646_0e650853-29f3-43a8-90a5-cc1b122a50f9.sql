-- Update customer_profiles explicit_preferences default schema to include new fields
COMMENT ON COLUMN customer_profiles.explicit_preferences IS 'User explicitly stated preferences including: budget_min, budget_max, preferred_regions, preferred_cities, bedrooms_min, bedrooms_max, property_types, investment_goal, timeline, persona_type, spain_visit_planned, spain_visit_date, phone';

-- The JSONB field already exists, so we just need to ensure new fields can be added
-- No schema changes needed as JSONB is flexible, but we document the new structure:
-- {
--   "budget_min": number,
--   "budget_max": number,
--   "preferred_regions": string[],
--   "preferred_cities": string[],
--   "bedrooms_min": number,
--   "bedrooms_max": number,
--   "property_types": string[], -- NEW: ["villa", "appartement", "penthouse", etc.]
--   "investment_goal": string,
--   "timeline": string,
--   "persona_type": string,
--   "spain_visit_planned": string, -- NEW: "geen_plannen", "binnen_1_maand", "binnen_3_maanden", "binnen_6_maanden", "al_gepland"
--   "spain_visit_date": string, -- NEW: ISO date string when "al_gepland"
--   "phone": string -- NEW: phone number
-- }