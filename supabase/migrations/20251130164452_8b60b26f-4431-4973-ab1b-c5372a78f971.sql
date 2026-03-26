-- Remove the check constraint that limits context_type values
ALTER TABLE faq_categories DROP CONSTRAINT IF EXISTS faq_categories_context_type_check;

-- Update context from 'investment' to 'project'
UPDATE faq_categories 
SET context_type = 'project'
WHERE context_type = 'investment';

-- Delete the unused 'contact' category
DELETE FROM faq_categories 
WHERE context_type = 'contact' AND category_key = 'about_company';