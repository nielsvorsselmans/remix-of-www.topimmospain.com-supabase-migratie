import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SaleExtraOption {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  highlights: string[] | null;
  image_url: string | null;
  is_recommended: boolean;
}

interface SaleExtraCategory {
  id: string;
  name: string;
  description: string | null;
  is_included: boolean;
  gifted_by_tis: boolean;
  via_developer: boolean;
  status: 'pending' | 'decided';
  chosen_option_id: string | null;
  decided_at: string | null;
  notes: string | null;
  customer_choice_type: string | null;
  customer_visible: boolean;
  is_optional_category: boolean;
  options: SaleExtraOption[];
}

interface SaleCustomer {
  id: string;
  role: string;
  crm_lead: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface SaleData {
  id: string;
  property_description: string | null;
  sale_price: number | null;
  project: {
    id: string;
    name: string;
    city: string;
    featured_image: string | null;
  } | null;
  customers: SaleCustomer[];
}

interface CustomizationRequest {
  id: string;
  request_title: string;
  request_description: string | null;
  category: string;
  status: string;
  quote_url: string | null;
  quote_amount: number | null;
  quote_uploaded_at: string | null;
  customer_decision: string | null;
  customer_decision_reason: string | null;
  via_developer: boolean;
  gifted_by_tis: boolean;
  created_at: string;
  updated_at: string;
}

// Format price in EUR
function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '€0';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Get customer names
function getCustomerNames(customers: SaleCustomer[]): string {
  return customers
    .filter(c => c.crm_lead)
    .map(c => `${c.crm_lead?.first_name || ''} ${c.crm_lead?.last_name || ''}`.trim())
    .filter(name => name.length > 0)
    .join(' & ') || 'Onbekend';
}

// Calculate taxes
function calculateTaxes(price: number, viaDeveloper: boolean): { btw: number; ajd: number; total: number } {
  if (viaDeveloper) {
    const btw = price * 0.10;
    const ajd = price * 0.015;
    return { btw, ajd, total: price + btw + ajd };
  } else {
    const btw = price * 0.21;
    return { btw, ajd: 0, total: price + btw };
  }
}

// Configuration constants for easy maintenance
const PDF_VERSION = 'v10'; // Increment to invalidate all cached PDFs on template changes

// Helper: convert Supabase Storage URL to use Image Transformation (actual server-side resize)
function toThumbnailUrl(url: string, width = 240, quality = 60): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const transformed = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return `${transformed}?width=${width}&quality=${quality}&resize=contain`;
}

// Get request status based on workflow status and customer decision
function getRequestStatus(request: CustomizationRequest): { label: string; color: string; bgColor: string; icon: string } {
  const status = request.status;
  const decision = request.customer_decision;
  
  // Customer has made a decision
  if (decision === 'approved') {
    return { label: 'Goedgekeurd door klant', color: '#22543d', bgColor: '#c6f6d5', icon: '✓' };
  }
  if (decision === 'rejected') {
    return { label: 'Afgewezen door klant', color: '#742a2a', bgColor: '#fed7d7', icon: '✕' };
  }
  
  // Based on workflow status
  switch (status) {
    case 'quote_requested':
      return { label: 'Offerte aangevraagd', color: '#744210', bgColor: '#feebc8', icon: '📋' };
    case 'quote_received':
      return { label: 'Offerte ontvangen', color: '#2a4365', bgColor: '#bee3f8', icon: '📄' };
    case 'approved':
      return { label: 'Goedgekeurd', color: '#22543d', bgColor: '#c6f6d5', icon: '✓' };
    case 'rejected':
      return { label: 'Afgewezen', color: '#742a2a', bgColor: '#fed7d7', icon: '✕' };
    case 'pending':
    default:
      return { label: 'In behandeling', color: '#744210', bgColor: '#feebc8', icon: '⏳' };
  }
}

// Get Dutch category label
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'kitchen': 'Keuken',
    'bathroom': 'Badkamer',
    'flooring': 'Vloeren',
    'electrical': 'Elektra',
    'climate': 'Klimaat',
    'outdoor': 'Buiten',
    'storage': 'Opslag',
    'other': 'Overig'
  };
  return labels[category] || category;
}

// Generate a clean filename for the PDF based on sale data
function generatePdfFilename(saleData: SaleData): string {
  // Get project name
  const projectName = saleData.project?.name || 'Onbekend Project';
  
  // Get property description
  const propertyDesc = saleData.property_description || '';
  
  // Get primary customer name (first buyer)
  const primaryCustomer = saleData.customers?.find(c => c.role === 'buyer');
  const customerName = primaryCustomer?.crm_lead 
    ? `${primaryCustomer.crm_lead.first_name || ''} ${primaryCustomer.crm_lead.last_name || ''}`.trim()
    : 'Klant';
  
  // Build filename parts
  const parts = [projectName];
  if (propertyDesc) parts.push(propertyDesc);
  parts.push('Extras');
  if (customerName && customerName !== 'Klant') parts.push(customerName);
  
  // Join and sanitize for filename (remove special characters not allowed in filenames)
  return parts.join(' - ').replace(/[<>:"/\\|?*]/g, '');
}
const LOGO_URL = `${Deno.env.get('PRODUCTION_SITE_URL') || 'https://www.topimmospain.com'}/logo-email.png`;
const ITEMS_PER_PAGE = 6; // Maximum items per page for pagination

// Helper function to split arrays into chunks for pagination
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Calculate content hash for cache invalidation
async function calculateContentHash(supabase: any, saleId: string): Promise<string> {
  // Parallel queries for better performance
  const [categoryResult, categoriesResult] = await Promise.all([
    supabase
      .from('sale_extra_categories')
      .select('updated_at')
      .eq('sale_id', saleId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('sale_extra_categories')
      .select('id')
      .eq('sale_id', saleId)
  ]);

  let optionMaxTimestamp = '';
  if (categoriesResult.data && categoriesResult.data.length > 0) {
    const categoryIds = categoriesResult.data.map((c: any) => c.id);
    const { data: optionMax } = await supabase
      .from('sale_extra_options')
      .select('updated_at')
      .in('category_id', categoryIds)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    optionMaxTimestamp = optionMax?.updated_at || '';
  }

  // Check for customization request changes
  const { data: requestMax } = await supabase
    .from('sale_customization_requests')
    .select('updated_at')
    .eq('sale_id', saleId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const requestMaxTimestamp = requestMax?.updated_at || '';

  // Combine timestamps into hash string - include PDF_VERSION to invalidate on template changes
  const timestamps = [
    PDF_VERSION, // Template version - increment to invalidate all caches
    categoryResult.data?.updated_at || '',
    optionMaxTimestamp,
    requestMaxTimestamp, // Include customization request changes
    requestMaxTimestamp, // Include customization request changes
  ].join('|');

  // SHA-256 hash for reliable cache invalidation
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(timestamps));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Generate CSS styles
function generateStyles(): string {
  return `
    <style>
      /* Print-specific styles - minimized margins to reduce browser header/footer visibility */
      @media print {
        @page {
          size: A4;
          margin: 10mm 10mm 10mm 10mm;
        }
        
        @page :first {
          margin-top: 10mm;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .page {
          page-break-after: always;
          page-break-inside: avoid;
        }
        
        .print-instructions {
          display: none !important;
        }
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #1a1a1a;
        background: white;
      }
      
      /* Print instructions banner - only visible on screen */
      .print-instructions {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 1px solid #f59e0b;
        padding: 14px 20px;
        margin: 0 0 20px 0;
        border-radius: 8px;
        text-align: center;
        font-size: 13px;
        color: #92400e;
      }
      
      .print-instructions strong {
        color: #78350f;
      }
      
      .page {
        page-break-after: always;
        min-height: 100vh;
        position: relative;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      /* Cover Page */
      .cover {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        padding: 40px;
      }
      
      .cover-header {
        text-align: center;
        margin-bottom: 40px;
      }
      
      .logo {
        max-width: 220px;
        height: auto;
      }
      
      .cover-image {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 12px;
        margin-bottom: 30px;
      }
      
      .cover-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }
      
      .cover-title {
        font-size: 32px;
        font-weight: 700;
        color: #1a365d;
        margin-bottom: 10px;
      }
      
      .cover-subtitle {
        font-size: 18px;
        color: #4a5568;
        margin-bottom: 30px;
      }
      
      .cover-document-title {
        font-size: 22px;
        font-weight: 600;
        color: white;
        margin-bottom: 25px;
        padding: 18px 30px;
        background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
        border-radius: 8px;
        letter-spacing: 0.5px;
      }
      
      .cover-clients {
        font-size: 16px;
        color: #4a5568;
        margin-bottom: 8px;
      }
      
      .cover-clients strong {
        color: #2d3748;
        font-weight: 600;
      }
      
      .cover-date {
        font-size: 13px;
        color: #64748b;
      }
      
      .cover-footer {
        font-size: 11px;
        padding: 20px 0;
        border-top: 2px solid #e2e8f0;
        color: #4a5568;
        text-align: center;
        margin-top: auto;
      }
      
      /* Section Headers */
      .section-header {
        padding: 15px 20px;
        margin-bottom: 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .section-header.decided {
        background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
        color: #22543d;
      }
      
      .section-header.pending {
        background: linear-gradient(135deg, #feebc8 0%, #fbd38d 100%);
        color: #744210;
      }
      
      .section-header.included {
        background: linear-gradient(135deg, #bee3f8 0%, #90cdf4 100%);
        color: #2a4365;
      }
      
      .section-header.gifted {
        background: linear-gradient(135deg, #e9d8fd 0%, #d6bcfa 100%);
        color: #553c9a;
      }
      
      .section-title {
        font-size: 18px;
        font-weight: 600;
      }
      
      /* Category Card */
      .category-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 15px;
        overflow: hidden;
        page-break-inside: avoid;
      }
      
      .category-header {
        background: #f7fafc;
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .category-name {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
      }
      
      .category-description {
        font-size: 11px;
        color: #718096;
        margin-top: 4px;
      }
      
      .status-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .badge-included {
        background: #bee3f8;
        color: #2a4365;
      }
      
      .badge-gifted {
        background: #e9d8fd;
        color: #553c9a;
      }
      
      .badge-decided {
        background: #c6f6d5;
        color: #22543d;
      }
      
      .badge-pending {
        background: #feebc8;
        color: #744210;
      }
      
      .badge-via-tis {
        background: #c6f6d5;
        color: #22543d;
      }
      
      .badge-self {
        background: #bee3f8;
        color: #2a4365;
      }
      
      /* Option Cards */
      .category-content {
        padding: 15px;
      }
      
      .chosen-option {
        display: flex;
        gap: 15px;
        align-items: flex-start;
      }
      
      .option-image {
        width: 120px;
        height: 100px;
        object-fit: cover;
        border-radius: 6px;
        background: #f7fafc;
      }
      
      .option-placeholder {
        width: 120px;
        height: 100px;
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #a0aec0;
        font-size: 28px;
      }
      
      .option-details {
        flex: 1;
      }
      
      .option-name {
        font-size: 13px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
      }
      
      .option-price {
        font-size: 14px;
        font-weight: 700;
        color: #2f855a;
      }
      
      .option-price.strikethrough {
        text-decoration: line-through;
        color: #a0aec0;
        font-weight: 400;
      }
      
      .option-price.gift {
        color: #805ad5;
      }
      
      .option-highlights {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .highlight-tag {
        background: #edf2f7;
        color: #4a5568;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 9px;
      }
      
      .decision-info {
        margin-top: 10px;
        font-size: 10px;
        color: #718096;
      }
      
      /* Options Grid (for pending) */
      .options-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .option-card {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        background: #fafafa;
      }
      
      .option-card.recommended {
        border-color: #9ae6b4;
        background: #f0fff4;
      }
      
      .recommended-badge {
        background: #48bb78;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 8px;
        font-weight: 600;
        margin-left: 8px;
      }
      
      /* Summary Table */
      .summary-section {
        margin-top: 30px;
      }
      
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      .summary-table th {
        background: #f7fafc;
        padding: 10px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 11px;
        color: #4a5568;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .summary-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 11px;
      }
      
      .summary-table tr:last-child td {
        border-bottom: none;
      }
      
      /* Totals */
      .totals-box {
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .total-row:last-child {
        border-bottom: none;
      }
      
      .total-row.grand-total {
        font-size: 16px;
        font-weight: 700;
        color: #2f855a;
        padding-top: 15px;
        margin-top: 10px;
        border-top: 2px solid #2f855a;
      }
      
      .total-row.gift-value {
        color: #805ad5;
      }
      
      /* Signature Section */
      .signature-section {
        margin-top: 40px;
        padding-top: 30px;
        border-top: 2px solid #e2e8f0;
      }
      
      .signature-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 20px;
      }
      
      .signature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 40px;
      }
      
      .signature-box {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 20px;
      }
      
      .signature-label {
        font-size: 11px;
        color: #718096;
        margin-bottom: 8px;
      }
      
      .signature-line {
        border-bottom: 1px solid #2d3748;
        height: 40px;
        margin-bottom: 10px;
      }
      
      .signature-name {
        font-size: 12px;
        font-weight: 500;
        color: #2d3748;
      }
      
      .date-place-row {
        display: flex;
        gap: 20px;
        margin-top: 30px;
      }
      
      .date-place-box {
        flex: 1;
      }
      
      .date-place-label {
        font-size: 11px;
        color: #718096;
        margin-bottom: 5px;
      }
      
      .date-place-line {
        border-bottom: 1px solid #2d3748;
        height: 25px;
      }
      
      /* Footer */
      .page-footer {
        position: absolute;
        bottom: 15px;
        left: 30px;
        right: 30px;
        font-size: 9px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      }
      
      .no-options-message {
        color: #a0aec0;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      
      /* Quote Cards */
      .section-header.quotes {
        background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
        color: #2d3748;
      }
      
      .quote-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 12px;
        padding: 12px 15px;
        page-break-inside: avoid;
      }
      
      .quote-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      
      .quote-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: #f7fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      
      .quote-info {
        flex: 1;
        min-width: 0;
      }
      
      .quote-title {
        font-size: 13px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
      }
      
      .quote-description {
        font-size: 11px;
        color: #718096;
        margin-bottom: 6px;
      }
      
      .quote-meta {
        display: flex;
        gap: 15px;
        font-size: 10px;
        color: #a0aec0;
      }
      
      .quote-file {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .quote-status {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        flex-shrink: 0;
      }
      
      .quote-link {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed #e2e8f0;
      }
    </style>
  `;
}

// Generate cover page HTML
function generateCoverPage(sale: SaleData, generationDate: string): string {
  const projectImage = sale.project?.featured_image || '';
  const projectName = sale.project?.name || 'Onbekend Project';
  const projectCity = sale.project?.city || '';
  const customerNames = getCustomerNames(sale.customers);
  const propertyDescription = sale.property_description || '';
  
  return `
    <div class="page cover">
      <div class="cover-header">
        <img src="${LOGO_URL}" alt="Top Immo Spain" class="logo" />
      </div>
      
      ${projectImage ? `<img src="${toThumbnailUrl(projectImage, 800, 75)}" alt="${projectName}" class="cover-image" />` : ''}
      
      <div class="cover-content">
        <h1 class="cover-title">${projectName}</h1>
        <p class="cover-subtitle">${projectCity}${propertyDescription ? ` • ${propertyDescription}` : ''}</p>
        
        <div class="cover-document-title">Extra's & Opties</div>
        
        <p class="cover-clients">Opgesteld voor: <strong>${customerNames}</strong></p>
        <p class="cover-date">Gegenereerd op ${generationDate}</p>
      </div>
      
      <div class="cover-footer">
        Top Immo Spain • www.topimmospain.be • info@topimmospain.be
      </div>
    </div>
  `;
}

// Generate category HTML for decided items
function generateDecidedCategoryHtml(category: SaleExtraCategory): string {
  const chosenOption = category.options.find(o => o.id === category.chosen_option_id);
  
  let statusBadge = '';
  let statusClass = '';
  
  if (category.is_included) {
    statusBadge = '<span class="status-badge badge-included">Inbegrepen</span>';
    statusClass = 'included';
  } else if (category.gifted_by_tis) {
    statusBadge = '<span class="status-badge badge-gifted">🎁 Cadeau van TIS</span>';
    statusClass = 'gifted';
  } else if (category.customer_choice_type === 'via_tis') {
    statusBadge = '<span class="status-badge badge-via-tis">Via TIS</span>';
    statusClass = 'decided';
  } else if (category.customer_choice_type === 'self_arranged') {
    statusBadge = '<span class="status-badge badge-self">Zelf regelen</span>';
    statusClass = 'decided';
  } else {
    statusBadge = '<span class="status-badge badge-decided">Beslist</span>';
    statusClass = 'decided';
  }
  
  let contentHtml = '';
  
  if (category.is_included) {
    contentHtml = `
      <div class="chosen-option">
        <div class="option-placeholder">✓</div>
        <div class="option-details">
          <div class="option-name">Standaard inbegrepen in de woning</div>
          <div class="option-price">Inbegrepen in koopprijs</div>
        </div>
      </div>
    `;
  } else if (category.customer_choice_type === 'self_arranged') {
    contentHtml = `
      <div class="chosen-option">
        <div class="option-placeholder">🔧</div>
        <div class="option-details">
          <div class="option-name">Klant regelt dit zelf na oplevering</div>
          ${category.decided_at ? `<div class="decision-info">Besloten op ${formatDate(category.decided_at)}</div>` : ''}
        </div>
      </div>
    `;
  } else if (category.gifted_by_tis && !chosenOption) {
    // Gifted category without a specific option selected
    contentHtml = `
      <div class="chosen-option">
        <div class="option-placeholder">🎁</div>
        <div class="option-details">
          <div class="option-name">Cadeau van Top Immo Spain</div>
          <div class="option-price gift">€0</div>
          ${category.decided_at ? `<div class="decision-info">Toegekend op ${formatDate(category.decided_at)}</div>` : ''}
        </div>
      </div>
    `;
  } else if (chosenOption) {
    const priceDisplay = category.gifted_by_tis 
      ? `<span class="option-price strikethrough">${formatPrice(chosenOption.price)}</span> <span class="option-price gift">€0 (Cadeau)</span>`
      : `<span class="option-price">${formatPrice(chosenOption.price)}</span>`;
    
    const highlightsHtml = chosenOption.highlights && chosenOption.highlights.length > 0
      ? `<div class="option-highlights">${chosenOption.highlights.map(h => `<span class="highlight-tag">${h}</span>`).join('')}</div>`
      : '';
    
    contentHtml = `
      <div class="chosen-option">
        ${chosenOption.image_url 
          ? `<img src="${toThumbnailUrl(chosenOption.image_url, 240, 60)}" alt="${chosenOption.name}" class="option-image" />`
          : `<div class="option-placeholder">📦</div>`
        }
        <div class="option-details">
          <div class="option-name">${chosenOption.name}</div>
          ${priceDisplay}
          ${chosenOption.description ? `<div style="font-size: 10px; color: #718096; margin-top: 4px;">${chosenOption.description}</div>` : ''}
          ${highlightsHtml}
          ${category.decided_at ? `<div class="decision-info">Gekozen op ${formatDate(category.decided_at)}</div>` : ''}
        </div>
      </div>
    `;
  } else {
    // Decided status but no chosen_option_id - clearer message
    contentHtml = `
      <div class="chosen-option">
        <div class="option-placeholder">⚠️</div>
        <div class="option-details">
          <div class="option-name">Keuze nog niet geregistreerd</div>
          <div style="font-size: 10px; color: #718096; margin-top: 4px;">Neem contact op met Top Immo Spain</div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="category-card">
      <div class="category-header">
        <div>
          <div class="category-name">${category.name}</div>
          ${category.description ? `<div class="category-description">${category.description}</div>` : ''}
        </div>
        ${statusBadge}
      </div>
      <div class="category-content">
        ${contentHtml}
      </div>
    </div>
  `;
}

// Generate category HTML for pending items
function generatePendingCategoryHtml(category: SaleExtraCategory): string {
  const hasOptions = category.options && category.options.length > 0;
  
  let optionsHtml = '';
  
  if (hasOptions) {
    optionsHtml = `
      <div class="options-grid">
        ${category.options.map(option => {
          const isRecommended = option.is_recommended;
          const highlightsHtml = option.highlights && option.highlights.length > 0
            ? `<div class="option-highlights">${option.highlights.map(h => `<span class="highlight-tag">${h}</span>`).join('')}</div>`
            : '';
          
          return `
            <div class="option-card ${isRecommended ? 'recommended' : ''}">
              ${option.image_url 
                ? `<img src="${toThumbnailUrl(option.image_url, 240, 60)}" alt="${option.name}" class="option-image" style="width: 100%; height: 60px; margin-bottom: 8px;" />`
                : ''
              }
              <div class="option-name">
                ${option.name}
                ${isRecommended ? '<span class="recommended-badge">Aanbevolen</span>' : ''}
              </div>
              <div class="option-price">${formatPrice(option.price)}</div>
              ${option.description ? `<div style="font-size: 9px; color: #718096; margin-top: 4px;">${option.description}</div>` : ''}
              ${highlightsHtml}
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    optionsHtml = `<div class="no-options-message">Nog geen opties toegevoegd</div>`;
  }
  
  return `
    <div class="category-card">
      <div class="category-header">
        <div>
          <div class="category-name">${category.name}</div>
          ${category.description ? `<div class="category-description">${category.description}</div>` : ''}
        </div>
        <span class="status-badge badge-pending">Te beslissen</span>
      </div>
      <div class="category-content">
        ${optionsHtml}
      </div>
    </div>
  `;
}

// Generate customization requests section HTML
function generateRequestsSectionHtml(requests: CustomizationRequest[]): string {
  return requests.map(request => {
    const status = getRequestStatus(request);
    const createdDate = formatDate(request.created_at);
    const hasQuote = request.quote_url && request.quote_amount;
    
    return `
      <div class="quote-card">
        <div class="quote-header">
          <div class="quote-icon">${status.icon}</div>
          <div class="quote-info">
            <div class="quote-title">${request.request_title}</div>
            ${request.request_description ? `<div class="quote-description">${request.request_description}</div>` : ''}
            <div class="quote-meta">
              <span class="quote-category">${getCategoryLabel(request.category)}</span>
              <span class="quote-date">Ingediend: ${createdDate}</span>
            </div>
            ${hasQuote ? `
              <div class="quote-amount" style="margin-top: 6px; font-weight: 600; color: #2f855a;">
                💰 Offerte: ${formatPrice(request.quote_amount!)}
                ${request.via_developer ? '<span style="background: #c6f6d5; color: #22543d; padding: 2px 6px; border-radius: 4px; font-size: 9px; margin-left: 8px;">Via ontwikkelaar</span>' : ''}
                ${request.gifted_by_tis ? '<span style="background: #e9d8fd; color: #553c9a; padding: 2px 6px; border-radius: 4px; font-size: 9px; margin-left: 8px;">🎁 Cadeau</span>' : ''}
              </div>
            ` : ''}
          </div>
          <div class="quote-status" style="background: ${status.bgColor}; color: ${status.color};">
            ${status.label}
          </div>
        </div>
        ${request.quote_url ? `
          <div class="quote-link">
            <a href="${request.quote_url}" target="_blank" style="color: #3182ce; font-size: 10px;">
              📎 Bekijk offerte document
            </a>
          </div>
        ` : ''}
        ${request.customer_decision_reason ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #718096;">
            💬 Klant reactie: ${request.customer_decision_reason}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Generate summary and signature page
function generateSummaryPage(
  categories: SaleExtraCategory[], 
  sale: SaleData, 
  pageNumber: number
): string {
  const customerNames = getCustomerNames(sale.customers);
  const customers = sale.customers.filter(c => c.crm_lead);
  
  // Calculate totals
  let totalViaDeveloper = 0;
  let totalExternal = 0;
  let giftValue = 0;
  
  const summaryRows = categories
    .filter(c => c.customer_visible !== false)
    .map(category => {
      const chosenOption = category.options.find(o => o.id === category.chosen_option_id);
      
      let status = '';
      let choice = '-';
      let amount = '-';
      
      if (category.is_included) {
        status = 'Inbegrepen';
        choice = 'Standaard';
        amount = 'Incl.';
      } else if (category.gifted_by_tis && chosenOption) {
        status = 'Cadeau van TIS';
        choice = chosenOption.name;
        amount = `<span style="text-decoration: line-through; color: #a0aec0;">${formatPrice(chosenOption.price)}</span> <span style="color: #805ad5;">€0</span>`;
        giftValue += chosenOption.price || 0;
      } else if (category.status === 'decided') {
        if (category.customer_choice_type === 'self_arranged') {
          status = 'Zelf regelen';
          choice = 'Na oplevering';
          amount = '-';
        } else if (chosenOption) {
          status = category.customer_choice_type === 'via_tis' ? 'Via TIS' : 'Beslist';
          choice = chosenOption.name;
          const price = chosenOption.price || 0;
          amount = formatPrice(price);
          
          if (category.via_developer) {
            totalViaDeveloper += price;
          } else {
            totalExternal += price;
          }
        }
      } else {
        status = 'Te beslissen';
        choice = '-';
        amount = '-';
      }
      
      return `
        <tr>
          <td>${category.name}</td>
          <td>${status}</td>
          <td>${choice}</td>
          <td style="text-align: right;">${amount}</td>
        </tr>
      `;
    }).join('');
  
  // Calculate taxes
  const developerTaxes = calculateTaxes(totalViaDeveloper, true);
  const externalTaxes = calculateTaxes(totalExternal, false);
  const grandTotal = developerTaxes.total + externalTaxes.total;
  
  // Generate signature boxes
  const signatureBoxes = customers.slice(0, 2).map((customer, index) => {
    const name = customer.crm_lead 
      ? `${customer.crm_lead.first_name || ''} ${customer.crm_lead.last_name || ''}`.trim()
      : `Koper ${index + 1}`;
    
    return `
      <div class="signature-box">
        <div class="signature-label">Handtekening ${customer.role === 'main_buyer' ? 'Hoofdkoper' : 'Medekoper'}</div>
        <div class="signature-line"></div>
        <div class="signature-name">${name}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="page">
      <h2 style="font-size: 18px; margin-bottom: 20px; color: #2d3748;">Samenvatting Extra's & Opties</h2>
      
      <table class="summary-table">
        <thead>
          <tr>
            <th>Categorie</th>
            <th>Status</th>
            <th>Keuze</th>
            <th style="text-align: right;">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>
      
      <div class="totals-box">
        ${totalViaDeveloper > 0 ? `
          <div class="total-row">
            <span>Via ontwikkelaar (excl. BTW)</span>
            <span>${formatPrice(totalViaDeveloper)}</span>
          </div>
          <div class="total-row">
            <span>BTW (10%)</span>
            <span>${formatPrice(developerTaxes.btw)}</span>
          </div>
          <div class="total-row">
            <span>AJD (1,5%)</span>
            <span>${formatPrice(developerTaxes.ajd)}</span>
          </div>
        ` : ''}
        
        ${totalExternal > 0 ? `
          <div class="total-row">
            <span>Extern (excl. BTW)</span>
            <span>${formatPrice(totalExternal)}</span>
          </div>
          <div class="total-row">
            <span>BTW (21%)</span>
            <span>${formatPrice(externalTaxes.btw)}</span>
          </div>
        ` : ''}
        
        ${giftValue > 0 ? `
          <div class="total-row gift-value">
            <span>🎁 Cadeau van Top Immo Spain</span>
            <span>-${formatPrice(giftValue)}</span>
          </div>
        ` : ''}
        
        <div class="total-row grand-total">
          <span>Totaal te betalen</span>
          <span>${formatPrice(grandTotal)}</span>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-title">Akkoord Extra's & Opties</div>
        <p style="font-size: 11px; color: #718096; margin-bottom: 20px;">
          Door ondertekening verklaart u akkoord te gaan met bovenstaande extra's en opties.
        </p>
        
        <div class="signature-grid">
          ${signatureBoxes || `
            <div class="signature-box">
              <div class="signature-label">Handtekening Koper 1</div>
              <div class="signature-line"></div>
              <div class="signature-name"></div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Handtekening Koper 2</div>
              <div class="signature-line"></div>
              <div class="signature-name"></div>
            </div>
          `}
        </div>
        
        <div class="date-place-row">
          <div class="date-place-box">
            <div class="date-place-label">Datum</div>
            <div class="date-place-line"></div>
          </div>
          <div class="date-place-box">
            <div class="date-place-label">Plaats</div>
            <div class="date-place-line"></div>
          </div>
        </div>
      </div>
      
      <div class="page-footer">
        <span>Top Immo Spain - Extra's & Opties</span>
        <span>Pagina ${pageNumber}</span>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { saleId, forceRegenerate = false } = await req.json();
    
    if (!saleId) {
      return new Response(
        JSON.stringify({ error: 'saleId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Generating extras PDF for sale: ${saleId}, forceRegenerate: ${forceRegenerate}`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate content hash for cache lookup
    const contentHash = await calculateContentHash(supabase, saleId);
    console.log('Content hash:', contentHash);

    // Check cache (skip if forceRegenerate)
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from('cached_pdfs')
        .select('*')
        .eq('sale_id', saleId)
        .eq('pdf_type', 'extras')
        .single();

      if (cached && cached.content_hash === contentHash) {
        console.log('Returning cached PDF URL:', cached.file_url);
        return new Response(
          JSON.stringify({ cached: true, url: cached.file_url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Cache miss or hash mismatch, generating new PDF');
    }
    
    // Fetch sale data with project and customers
    const { data: saleDataRaw, error: saleError } = await supabase
      .from('sales')
      .select(`
        id,
        property_description,
        sale_price,
        project:projects(id, name, city, featured_image),
        customers:sale_customers(
          id,
          role,
          crm_lead:crm_leads(first_name, last_name, email)
        )
      `)
      .eq('id', saleId)
      .single();
    
    if (saleError || !saleDataRaw) {
      console.error('Error fetching sale data:', saleError);
      return new Response(
        JSON.stringify({ error: 'Sale not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Transform the data to match our types (handle Supabase's array returns for single relations)
    const projectData = Array.isArray(saleDataRaw.project) ? saleDataRaw.project[0] : saleDataRaw.project;
    const customersData = (saleDataRaw.customers || []).map((c: any) => ({
      ...c,
      crm_lead: Array.isArray(c.crm_lead) ? c.crm_lead[0] : c.crm_lead
    }));
    
    const saleData: SaleData = {
      id: saleDataRaw.id,
      property_description: saleDataRaw.property_description,
      sale_price: saleDataRaw.sale_price,
      project: projectData || null,
      customers: customersData
    };
    
    // Fetch extra categories with options
    const { data: categories, error: catError } = await supabase
      .from('sale_extra_categories')
      .select('*')
      .eq('sale_id', saleId)
      .order('order_index', { ascending: true });
    
    if (catError) {
      console.error('Error fetching categories:', catError);
      return new Response(
        JSON.stringify({ error: 'Error fetching categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch options for all categories
    const categoryIds = (categories || []).map(c => c.id);
    let options: any[] = [];
    
    if (categoryIds.length > 0) {
      const { data: optionsData, error: optError } = await supabase
        .from('sale_extra_options')
        .select('*')
        .in('category_id', categoryIds)
        .order('order_index', { ascending: true });
      
      if (optError) {
        console.error('Error fetching options:', optError);
      } else {
        options = optionsData || [];
      }
    }
    
    // Fetch customization requests for this sale
    const { data: customizationRequests, error: requestsError } = await supabase
      .from('sale_customization_requests')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching customization requests:', requestsError);
    }

    const requests: CustomizationRequest[] = customizationRequests || [];
    console.log(`Extras PDF: ${requests.length} customization requests found`);
    
    // Map options to categories
    const categoriesWithOptions: SaleExtraCategory[] = (categories || []).map(cat => ({
      ...cat,
      options: options.filter(o => o.category_id === cat.id)
    }));
    
    // Filter visible categories
    const visibleCategories = categoriesWithOptions.filter(c => c.customer_visible !== false);
    
    // Separate into decided and pending
    const includedCategories = visibleCategories.filter(c => c.is_included);
    const giftedCategories = visibleCategories.filter(c => c.gifted_by_tis && !c.is_included);
    const decidedCategories = visibleCategories.filter(c => 
      !c.is_included && !c.gifted_by_tis && c.status === 'decided'
    );
    const pendingCategories = visibleCategories.filter(c => 
      !c.is_included && !c.gifted_by_tis && c.status === 'pending' &&
      !(c.is_optional_category && (!c.options || c.options.length === 0))
    );
    
    // Enhanced logging for debugging
    console.log(`Extras PDF: ${visibleCategories.length} visible categories`);
    console.log(`Extras PDF: ${includedCategories.length} included, ${giftedCategories.length} gifted, ${decidedCategories.length} decided, ${pendingCategories.length} pending`);
    
    const generationDate = formatDate(new Date().toISOString());
    
    // Build HTML - using minimal title to reduce browser header text
    let html = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${generatePdfFilename(saleData)}</title>
        ${generateStyles()}
      </head>
      <body>
        <div class="print-instructions">
          <strong>💡 Tip:</strong> Schakel "Kop- en voettekst" uit in de printopties voor een schoner resultaat.
        </div>
    `;
    
    // Cover page
    html += generateCoverPage(saleData, generationDate);
    
    let pageNumber = 2;
    
    // Included categories section - with pagination
    if (includedCategories.length > 0) {
      const chunks = chunkArray(includedCategories, ITEMS_PER_PAGE);
      chunks.forEach((chunk, index) => {
        html += `
          <div class="page">
            <div class="section-header included">
              <span style="font-size: 20px;">✓</span>
              <div class="section-title">Inbegrepen in de Woning${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}</div>
            </div>
            ${chunk.map(c => generateDecidedCategoryHtml(c)).join('')}
            <div class="page-footer">
              <span>Top Immo Spain - Extra's & Opties</span>
              <span>Pagina ${pageNumber}</span>
            </div>
          </div>
        `;
        pageNumber++;
      });
    }
    
    // Gifted categories section - with pagination
    if (giftedCategories.length > 0) {
      const chunks = chunkArray(giftedCategories, ITEMS_PER_PAGE);
      chunks.forEach((chunk, index) => {
        html += `
          <div class="page">
            <div class="section-header gifted">
              <span style="font-size: 20px;">🎁</span>
              <div class="section-title">Cadeau van Top Immo Spain${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}</div>
            </div>
            ${chunk.map(c => generateDecidedCategoryHtml(c)).join('')}
            <div class="page-footer">
              <span>Top Immo Spain - Extra's & Opties</span>
              <span>Pagina ${pageNumber}</span>
            </div>
          </div>
        `;
        pageNumber++;
      });
    }
    
    // Decided categories section - with pagination
    if (decidedCategories.length > 0) {
      const chunks = chunkArray(decidedCategories, ITEMS_PER_PAGE);
      chunks.forEach((chunk, index) => {
        html += `
          <div class="page">
            <div class="section-header decided">
              <span style="font-size: 20px;">✓</span>
              <div class="section-title">Uw Keuzes${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}</div>
            </div>
            ${chunk.map(c => generateDecidedCategoryHtml(c)).join('')}
            <div class="page-footer">
              <span>Top Immo Spain - Extra's & Opties</span>
              <span>Pagina ${pageNumber}</span>
            </div>
          </div>
        `;
        pageNumber++;
      });
    }
    
    // Pending categories section - with pagination
    if (pendingCategories.length > 0) {
      const chunks = chunkArray(pendingCategories, ITEMS_PER_PAGE);
      chunks.forEach((chunk, index) => {
        html += `
          <div class="page">
            <div class="section-header pending">
              <span style="font-size: 20px;">⏳</span>
              <div class="section-title">Nog te Beslissen${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}</div>
            </div>
            ${chunk.map(c => generatePendingCategoryHtml(c)).join('')}
            <div class="page-footer">
              <span>Top Immo Spain - Extra's & Opties</span>
              <span>Pagina ${pageNumber}</span>
            </div>
          </div>
        `;
        pageNumber++;
      });
    }
    
    // Customization requests section - with pagination
    if (requests.length > 0) {
      const chunks = chunkArray(requests, ITEMS_PER_PAGE);
      chunks.forEach((chunk, index) => {
        html += `
          <div class="page">
            <div class="section-header quotes">
              <span style="font-size: 20px;">📋</span>
              <div class="section-title">Klant Aanvragen & Offertes${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}</div>
            </div>
            ${generateRequestsSectionHtml(chunk)}
            <div class="page-footer">
              <span>Top Immo Spain - Extra's & Opties</span>
              <span>Pagina ${pageNumber}</span>
            </div>
          </div>
        `;
        pageNumber++;
      });
    }
    
    // Summary and signature page
    html += generateSummaryPage(visibleCategories, saleData, pageNumber);
    
    html += `
      </body>
      </html>
    `;
    
    console.log(`Extras PDF generated successfully for sale: ${saleId}`);

    // Store in cache - upload HTML to storage
    let cachedFileUrl: string | null = null;
    try {
      // First, get and delete old cached file if exists to prevent orphaned files
      const { data: existingCache } = await supabase
        .from('cached_pdfs')
        .select('file_path')
        .eq('sale_id', saleId)
        .eq('pdf_type', 'extras')
        .single();

      if (existingCache?.file_path) {
        console.log('Removing old cached file:', existingCache.file_path);
        await supabase.storage
          .from('sale-documents')
          .remove([existingCache.file_path]);
      }

      const fileName = `extras-${saleId}-${contentHash}.html`;
      const filePath = `cached-pdfs/${fileName}`;
      
      // Upload HTML to storage
      const { error: uploadError } = await supabase.storage
        .from('sale-documents')
        .upload(filePath, html, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading cached PDF:', uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('sale-documents')
          .getPublicUrl(filePath);

        cachedFileUrl = urlData?.publicUrl || '';

        // Upsert cache record
        const { error: cacheError } = await supabase
          .from('cached_pdfs')
          .upsert({
            sale_id: saleId,
            pdf_type: 'extras',
            file_path: filePath,
            file_url: cachedFileUrl,
            content_hash: contentHash,
            generated_at: new Date().toISOString()
          }, {
            onConflict: 'sale_id,pdf_type'
          });

        if (cacheError) {
          console.error('Error updating cache record:', cacheError);
        } else {
          console.log('Extras PDF cached successfully:', cachedFileUrl);
        }
      }
    } catch (cacheErr) {
      console.error('Cache storage error:', cacheErr);
    }
    
    // Return URL if upload succeeded, fallback to HTML if not
    if (cachedFileUrl) {
      return new Response(
        JSON.stringify({ cached: true, url: cachedFileUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return HTML directly if caching failed
    return new Response(
      JSON.stringify({ html }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error generating extras PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
