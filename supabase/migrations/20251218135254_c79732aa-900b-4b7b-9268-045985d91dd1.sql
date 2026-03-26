-- Drop de bestaande constraint
ALTER TABLE sale_invoices DROP CONSTRAINT IF EXISTS sale_invoices_status_check;

-- Maak een nieuwe constraint met 'sent' toegevoegd
ALTER TABLE sale_invoices 
ADD CONSTRAINT sale_invoices_status_check 
CHECK (status = ANY (ARRAY['pending', 'sent', 'paid', 'overdue', 'cancelled']));