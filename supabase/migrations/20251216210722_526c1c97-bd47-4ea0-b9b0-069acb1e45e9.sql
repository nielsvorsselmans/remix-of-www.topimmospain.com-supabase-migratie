-- Add includes_vat column to sale_payments
ALTER TABLE sale_payments 
ADD COLUMN includes_vat boolean DEFAULT true;

-- Update existing payments to true (default assumption)
UPDATE sale_payments SET includes_vat = true WHERE includes_vat IS NULL;