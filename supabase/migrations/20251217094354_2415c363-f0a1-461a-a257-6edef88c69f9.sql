-- Add via_developer column to sale_extra_categories
-- true = purchased via project developer (10% BTW + 1.5% AJD)
-- false = purchased externally (21% BTW, no AJD)
ALTER TABLE sale_extra_categories 
ADD COLUMN via_developer BOOLEAN NOT NULL DEFAULT true;