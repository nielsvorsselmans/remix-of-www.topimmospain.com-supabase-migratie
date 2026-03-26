import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuyerFormData {
  street_address?: string;
  postal_code?: string;
  residence_city?: string;
  country?: string;
  tax_id_bsn?: string;
  tax_id_nie?: string;
  nationality?: string;
  date_of_birth?: string;
  personal_data_complete?: boolean;
}

interface CoBuyerData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  street_address?: string;
  postal_code?: string;
  residence_city?: string;
  country?: string;
  tax_id_bsn?: string;
  tax_id_nie?: string;
  nationality?: string;
  date_of_birth?: string;
}

// Sanitize filename for storage
function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex).toLowerCase() : '';
  const baseName = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  
  const sanitized = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 100);
  
  return sanitized + extension;
}

// Helper to log activity for audit trail
async function logActivity(
  supabase: any,
  tokenId: string | null,
  saleCustomerId: string,
  activityType: string,
  req: Request,
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.from('buyer_form_activity_log').insert({
      token_id: tokenId,
      sale_customer_id: saleCustomerId,
      activity_type: activityType,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent')?.substring(0, 500) || 'unknown',
      metadata,
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is vereist' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token and fetch sale/project info
    const { data: tokenData, error: tokenError } = await supabase
      .from('buyer_data_tokens')
      .select(`
        id,
        sale_customer_id,
        expires_at,
        used_at,
        sale_customer:sale_customers!buyer_data_tokens_sale_customer_id_fkey(
          id,
          role,
          sale_id,
          crm_lead_id,
          crm_lead:crm_leads(
            id, first_name, last_name, email, phone,
            street_address, postal_code, residence_city, country,
            tax_id_bsn, tax_id_nie, nationality, date_of_birth,
            personal_data_complete, personal_data_completed_at
          )
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Ongeldige of verlopen link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Deze link is verlopen. Vraag een nieuwe link aan.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const saleCustomer = tokenData.sale_customer as any;
    const crmLead = saleCustomer?.crm_lead;
    const crmLeadId = saleCustomer?.crm_lead_id;
    const saleId = saleCustomer?.sale_id;

    // Check if reservation contract has been uploaded (makes token invalid)
    if (saleId) {
      const { data: contractDoc } = await supabase
        .from('sale_documents')
        .select('id')
        .eq('sale_id', saleId)
        .eq('document_type', 'reservation_contract')
        .maybeSingle();

      if (contractDoc) {
        return new Response(
          JSON.stringify({ 
            error: 'Deze link is niet meer geldig. Het reservatiecontract is reeds geüpload.',
            linkExpiredReason: 'contract_uploaded'
          }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch sale and project info
    let saleInfo = null;
    let otherBuyers: any[] = [];
    
    if (saleId) {
      const { data: sale } = await supabase
        .from('sales')
        .select(`
          id,
          sale_price,
          property_description,
          reservation_date,
          project:projects(id, name, city, featured_image)
        `)
        .eq('id', saleId)
        .single();
      
      saleInfo = sale;

      // Fetch other buyers for this sale (excluding current buyer)
      const { data: allBuyers } = await supabase
        .from('sale_customers')
        .select(`
          id,
          role,
          crm_lead:crm_leads(first_name, last_name, email, personal_data_complete, personal_data_completed_at)
        `)
        .eq('sale_id', saleId)
        .neq('id', tokenData.sale_customer_id);
      
      if (allBuyers && allBuyers.length > 0) {
        otherBuyers = allBuyers.map(buyer => ({
          ...buyer,
          isComplete: (buyer.crm_lead as any)?.personal_data_complete || false,
          completedAt: (buyer.crm_lead as any)?.personal_data_completed_at,
        }));
      }
    }

    if (req.method === 'GET') {
      // Log access for audit trail
      await logActivity(supabase, tokenData.id, tokenData.sale_customer_id, 'token_accessed', req);

      // Fetch identity documents for this crm_lead
      let documents: any[] = [];
      if (crmLeadId) {
        const { data: docs } = await supabase
          .from('customer_identity_documents')
          .select('id, document_type, file_url, file_name, uploaded_at')
          .eq('crm_lead_id', crmLeadId);
        documents = docs || [];
      }

      // Map crm_lead data to detail format for backwards compatibility
      const detail = crmLead ? {
        street_address: crmLead.street_address,
        postal_code: crmLead.postal_code,
        city: crmLead.residence_city,
        country: crmLead.country,
        tax_id_bsn: crmLead.tax_id_bsn,
        tax_id_nie: crmLead.tax_id_nie,
        nationality: crmLead.nationality,
        date_of_birth: crmLead.date_of_birth,
        data_complete: crmLead.personal_data_complete,
        completed_at: crmLead.personal_data_completed_at,
      } : null;

      return new Response(
        JSON.stringify({
          buyerName: `${crmLead?.first_name || ''} ${crmLead?.last_name || ''}`.trim() || 'Koper',
          email: crmLead?.email || null,
          detail,
          documents,
          isComplete: crmLead?.personal_data_complete || false,
          usedAt: tokenData.used_at,
          saleInfo,
          otherBuyers,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      // Handle file upload
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const documentType = formData.get('documentType') as string || 'passport';
        const targetSaleCustomerId = formData.get('saleCustomerId') as string || tokenData.sale_customer_id;

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'Geen bestand gevonden' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({ error: 'Bestand is te groot (max 10MB)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate allowed MIME types
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!ALLOWED_TYPES.includes(file.type)) {
          return new Response(
            JSON.stringify({ error: 'Bestandstype niet toegestaan. Gebruik PDF, JPG of PNG.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get crm_lead_id for target customer
        let targetCrmLeadId = crmLeadId;
        if (targetSaleCustomerId !== tokenData.sale_customer_id) {
          const { data: targetCustomer } = await supabase
            .from('sale_customers')
            .select('crm_lead_id')
            .eq('id', targetSaleCustomerId)
            .single();
          targetCrmLeadId = targetCustomer?.crm_lead_id;
        }

        if (!targetCrmLeadId) {
          return new Response(
            JSON.stringify({ error: 'Klant niet gevonden' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sanitize filename and upload to storage
        const sanitizedFileName = sanitizeFileName(file.name);
        const fileExt = sanitizedFileName.split('.').pop();
        const fileName = `${targetCrmLeadId}/${Date.now()}_${sanitizedFileName}`;
        const fileBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('reservation-documents')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Delete existing document of same type for this crm_lead
        await supabase
          .from('customer_identity_documents')
          .delete()
          .eq('crm_lead_id', targetCrmLeadId)
          .eq('document_type', documentType);

        // Create document record in customer_identity_documents
        const { error: docError } = await supabase
          .from('customer_identity_documents')
          .insert({
            crm_lead_id: targetCrmLeadId,
            document_type: documentType,
            file_url: fileName,
            file_name: file.name,
          });

        if (docError) {
          console.error('Document record error:', docError);
          throw docError;
        }

        // Log document upload activity
        await logActivity(supabase, tokenData.id, tokenData.sale_customer_id, 'document_uploaded', req, {
          document_type: documentType,
          file_name: file.name,
          target_customer_id: targetSaleCustomerId,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Document geüpload' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle JSON data
      const body = await req.json();

      // Check if this is a co-buyer creation request
      if (body.action === 'create_co_buyer') {
        const coBuyerData: CoBuyerData = body.coBuyer;
        
        if (!coBuyerData.first_name || !coBuyerData.last_name || !coBuyerData.email) {
          return new Response(
            JSON.stringify({ error: 'Voornaam, achternaam en email zijn verplicht' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if crm_lead already exists with this email
        let newCrmLeadId: string;
        const { data: existingLead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('email', coBuyerData.email.toLowerCase())
          .single();

        if (existingLead) {
          newCrmLeadId = existingLead.id;
          
          // Update existing lead with co-buyer data
          await supabase
            .from('crm_leads')
            .update({
              street_address: coBuyerData.street_address || null,
              postal_code: coBuyerData.postal_code || null,
              residence_city: coBuyerData.residence_city || null,
              country: coBuyerData.country || 'Nederland',
              tax_id_bsn: coBuyerData.tax_id_bsn || null,
              tax_id_nie: coBuyerData.tax_id_nie || null,
              nationality: coBuyerData.nationality || null,
              date_of_birth: coBuyerData.date_of_birth || null,
            })
            .eq('id', newCrmLeadId);
        } else {
          // Create new CRM lead with all personal data
          const crmUserId = `cobuyer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const { data: newLead, error: leadError } = await supabase
            .from('crm_leads')
            .insert({
              crm_user_id: crmUserId,
              first_name: coBuyerData.first_name,
              last_name: coBuyerData.last_name,
              email: coBuyerData.email.toLowerCase(),
              phone: coBuyerData.phone || null,
              journey_phase: 'aankoop',
              street_address: coBuyerData.street_address || null,
              postal_code: coBuyerData.postal_code || null,
              residence_city: coBuyerData.residence_city || null,
              country: coBuyerData.country || 'Nederland',
              tax_id_bsn: coBuyerData.tax_id_bsn || null,
              tax_id_nie: coBuyerData.tax_id_nie || null,
              nationality: coBuyerData.nationality || null,
              date_of_birth: coBuyerData.date_of_birth || null,
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('Error creating CRM lead:', leadError);
            throw leadError;
          }
          newCrmLeadId = newLead.id;

          // Sync to GHL
          try {
            const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
            const ghlLocationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');
            
            if (ghlApiKey && ghlLocationId) {
              const ghlResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${ghlApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  firstName: coBuyerData.first_name,
                  lastName: coBuyerData.last_name,
                  email: coBuyerData.email.toLowerCase(),
                  phone: coBuyerData.phone || undefined,
                  locationId: ghlLocationId,
                  tags: ['mede-koper', 'self-service'],
                }),
              });

              if (ghlResponse.ok) {
                const ghlData = await ghlResponse.json();
                await supabase
                  .from('crm_leads')
                  .update({ ghl_contact_id: ghlData.contact?.id })
                  .eq('id', newCrmLeadId);
                console.log('GHL contact created:', ghlData.contact?.id);
              } else {
                console.error('GHL sync failed:', await ghlResponse.text());
              }
            }
          } catch (ghlError) {
            console.error('GHL sync error:', ghlError);
          }
        }

        // Create sale_customer record
        const { data: newSaleCustomer, error: scError } = await supabase
          .from('sale_customers')
          .insert({
            sale_id: saleId,
            crm_lead_id: newCrmLeadId,
            role: 'buyer',
          })
          .select('id')
          .single();

        if (scError) {
          console.error('Error creating sale_customer:', scError);
          throw scError;
        }

        // Generate token for co-buyer
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let newToken = '';
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        for (let i = 0; i < 32; i++) {
          newToken += chars[array[i] % chars.length];
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // Reduced from 30 to 14 days for security

        const { error: tokenError } = await supabase
          .from('buyer_data_tokens')
          .insert({
            sale_customer_id: newSaleCustomer.id,
            token: newToken,
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error('Error creating token:', tokenError);
          throw tokenError;
        }

        // Log co-buyer creation activity
        await logActivity(supabase, tokenData.id, tokenData.sale_customer_id, 'cobuyer_added', req, {
          cobuyer_email: coBuyerData.email,
          cobuyer_sale_customer_id: newSaleCustomer.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Mede-koper toegevoegd',
            coBuyerId: newSaleCustomer.id,
            coBuyerToken: newToken,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle regular form data update - write directly to crm_leads
      const formDataUpdate: BuyerFormData = body;

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (formDataUpdate.street_address !== undefined) updateData.street_address = formDataUpdate.street_address;
      if (formDataUpdate.postal_code !== undefined) updateData.postal_code = formDataUpdate.postal_code;
      if (formDataUpdate.residence_city !== undefined) updateData.residence_city = formDataUpdate.residence_city;
      if (formDataUpdate.country !== undefined) updateData.country = formDataUpdate.country;
      if (formDataUpdate.tax_id_bsn !== undefined) updateData.tax_id_bsn = formDataUpdate.tax_id_bsn;
      if (formDataUpdate.tax_id_nie !== undefined) updateData.tax_id_nie = formDataUpdate.tax_id_nie;
      if (formDataUpdate.nationality !== undefined) updateData.nationality = formDataUpdate.nationality;
      if (formDataUpdate.date_of_birth !== undefined) updateData.date_of_birth = formDataUpdate.date_of_birth;
      
      if (formDataUpdate.personal_data_complete !== undefined) {
        updateData.personal_data_complete = formDataUpdate.personal_data_complete;
        if (formDataUpdate.personal_data_complete) {
          updateData.personal_data_completed_at = new Date().toISOString();
        }
      }

      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', crmLeadId);

      if (updateError) {
        console.error('Error updating crm_lead:', updateError);
        throw updateError;
      }

      // Mark token as used when data is complete
      if (formDataUpdate.personal_data_complete && !tokenData.used_at) {
        await supabase
          .from('buyer_data_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenData.id);
      }

      // Log data update activity
      const activityType = formDataUpdate.personal_data_complete ? 'data_completed' : 'data_updated';
      await logActivity(supabase, tokenData.id, tokenData.sale_customer_id, activityType, req, {
        fields_updated: Object.keys(updateData).filter(k => k !== 'updated_at'),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Gegevens opgeslagen' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      // Handle document deletion from customer_identity_documents
      const documentId = url.searchParams.get('documentId');
      if (!documentId) {
        return new Response(
          JSON.stringify({ error: 'Document ID is vereist' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify document belongs to this buyer's crm_lead or a co-buyer of the same sale
      const { data: doc } = await supabase
        .from('customer_identity_documents')
        .select('id, crm_lead_id')
        .eq('id', documentId)
        .single();

      if (!doc) {
        return new Response(
          JSON.stringify({ error: 'Document niet gevonden' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if this document belongs to the same sale (via sale_customers)
      const { data: docSaleCustomer } = await supabase
        .from('sale_customers')
        .select('sale_id')
        .eq('crm_lead_id', doc.crm_lead_id)
        .eq('sale_id', saleId)
        .maybeSingle();

      if (!docSaleCustomer) {
        return new Response(
          JSON.stringify({ error: 'Geen toegang tot dit document' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('customer_identity_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: 'Document verwijderd' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Methode niet ondersteund' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in buyer-data-form:', error);
    return new Response(
      JSON.stringify({ error: 'Er is een fout opgetreden' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
