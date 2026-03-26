-- Add default commission percentage to projects table
ALTER TABLE public.projects ADD COLUMN default_commission_percentage numeric DEFAULT NULL;