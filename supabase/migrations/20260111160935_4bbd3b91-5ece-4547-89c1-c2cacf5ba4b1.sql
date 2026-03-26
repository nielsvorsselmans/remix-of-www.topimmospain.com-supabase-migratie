-- Add latitude and longitude columns to cost_estimates table
ALTER TABLE cost_estimates
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;