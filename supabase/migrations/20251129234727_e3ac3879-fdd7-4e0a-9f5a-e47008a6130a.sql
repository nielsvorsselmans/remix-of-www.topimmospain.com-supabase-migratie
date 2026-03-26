-- Add foreign key from crm_leads to customer_profiles via visitor_id
ALTER TABLE crm_leads 
ADD CONSTRAINT fk_crm_leads_customer_profiles 
FOREIGN KEY (visitor_id) 
REFERENCES customer_profiles(visitor_id)
ON DELETE SET NULL;

-- Create index on visitor_id for better query performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_visitor_id ON crm_leads(visitor_id);