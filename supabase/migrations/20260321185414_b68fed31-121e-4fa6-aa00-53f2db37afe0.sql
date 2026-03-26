
-- 1. Add 'geblokkeerd' to the sale_status enum before 'reservatie'
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'geblokkeerd' BEFORE 'reservatie';
