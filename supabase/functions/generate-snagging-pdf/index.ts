import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- AI Translation Helper ---
async function translateNotesToSpanish(notes: string[]): Promise<Record<string, string>> {
  const uniqueNotes = [...new Set(notes.filter(Boolean))];
  if (uniqueNotes.length === 0) return {};

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[snagging-pdf] No LOVABLE_API_KEY, skipping translations");
    return {};
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const prompt = `Vertaal de volgende Nederlandse zinnen naar het Spaans. 
Geef ALLEEN een JSON array terug met exact evenveel elementen als de input, in dezelfde volgorde.
Geen uitleg, geen extra tekst, alleen de JSON array met Spaanse vertalingen.

Input:
${JSON.stringify(uniqueNotes)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Je bent een vertaler NL→ES. Antwoord ALLEEN met een JSON array van vertalingen." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("[snagging-pdf] AI translation error:", response.status);
      return {};
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[snagging-pdf] Could not parse translation response:", content);
      return {};
    }

    const translations: string[] = JSON.parse(jsonMatch[0]);
    const map: Record<string, string> = {};
    uniqueNotes.forEach((note, i) => {
      if (translations[i]) map[note] = translations[i];
    });
    
    console.log(`[snagging-pdf] Translated ${Object.keys(map).length} notes to Spanish`);
    return map;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[snagging-pdf] Translation timeout - using original texts');
    } else {
      console.error("[snagging-pdf] Translation error:", err);
    }
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

type PdfVariant = 'developer' | 'client';

function generateReportId(saleId: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const shortId = saleId.slice(0, 4).toUpperCase();
  return `TIS-${yyyy}-${mm}-${shortId}`;
}

function toThumbnailUrl(url: string, width = 240, quality = 60): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const transformed = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return `${transformed}?width=${width}&quality=${quality}&resize=contain`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - require authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { error: authError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const saleId = body.saleId;
    const variant: PdfVariant = body.variant === 'client' ? 'client' : 'developer';
    const skipCache = body.skipCache === true;
    const inspectionId = body.inspectionId || null;

    if (!saleId) {
      return new Response(JSON.stringify({ error: 'saleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reportId = generateReportId(saleId);

    // Fetch sale + project info
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id, property_description, project:projects(name, city, featured_image)')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      console.error('Sale fetch error:', saleError);
      return new Response(JSON.stringify({ error: 'Sale not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch customers + voice recordings in parallel
    let recordingsQuery = supabase
      .from('snagging_voice_recordings')
      .select('*')
      .eq('sale_id', saleId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });
    
    if (inspectionId) {
      recordingsQuery = recordingsQuery.eq('inspection_id', inspectionId);
    }

    const [customersRes, recordingsRes] = await Promise.all([
      supabase
        .from('sale_customers')
        .select('id, role, crm_lead:crm_leads(first_name, last_name)')
        .eq('sale_id', saleId),
      recordingsQuery,
    ]);

    const customers = customersRes.data || [];
    const recordings = recordingsRes.data || [];

    // Build customer names
    const customerNames = [...new Set(customers
      .map((c: any) => {
        const lead = c.crm_lead;
        if (!lead) return null;
        return [lead.first_name, lead.last_name].filter(Boolean).join(' ');
      })
      .filter(Boolean))];

    // Group items by room_name
    const roomMap = new Map<string, any[]>();
    let earliestDate: string | null = null;

    for (const rec of recordings) {
      if (!earliestDate || rec.created_at < earliestDate) {
        earliestDate = rec.created_at;
      }
      const items = (rec.ai_items as any[]) || [];
      const existing = roomMap.get(rec.room_name) || [];
      existing.push(...items);
      roomMap.set(rec.room_name, existing);
    }

    // Calculate summary
    const allItems: any[] = [];
    roomMap.forEach((items) => allItems.push(...items));

    const summary = {
      total: allItems.length,
      ok: allItems.filter((i) => i.status === 'ok').length,
      defect: allItems.filter((i) => i.status === 'defect').length,
      critical: allItems.filter((i) => i.severity === 'critical').length,
      major: allItems.filter((i) => i.severity === 'major').length,
      minor: allItems.filter((i) => i.severity === 'minor').length,
    };

    const project = sale.project as any;
    const projectName = (project?.name || 'Onbekend project').replace(/_/g, ' ');
    const projectCity = project?.city || '';
    const featuredImage = project?.featured_image || '';
    const propertyDesc = sale.property_description || '';
    const reportDate = earliestDate
      ? new Date(earliestDate).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Collect all defect notes for AI translation (developer always, client only if needed)
    const allDefectNotes: string[] = [];
    roomMap.forEach((items) => {
      items.forEach((item: any) => {
        if (item.status === 'defect') {
          if (item.notes) allDefectNotes.push(item.notes);
          if (item.manual_notes) allDefectNotes.push(item.manual_notes);
        }
      });
    });

    // Translate notes to Spanish via AI (only for developer variant)
    const translations = variant === 'developer' ? await translateNotesToSpanish(allDefectNotes) : {};

    // Content hash for caching (based on recordings data + variant)
    const PDF_VERSION = 'v4';
    const hashSource = JSON.stringify(recordings.map((r: any) => ({ id: r.id, updated_at: r.updated_at, ai_items: r.ai_items }))) + variant + PDF_VERSION + (inspectionId || '');
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashSource));
    const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const pdfType = `snagging-${variant}`;

    // Check cache
    const { data: cached } = await supabase
      .from('cached_pdfs')
      .select('file_url')
      .eq('sale_id', saleId)
      .eq('pdf_type', pdfType)
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (cached?.file_url && !skipCache) {
      console.log(`[snagging-pdf] Cache hit for ${pdfType} / ${saleId}`);
      return new Response(JSON.stringify({ cached: true, url: cached.file_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML
    const html = generateHtml({
      projectName,
      projectCity,
      featuredImage,
      propertyDesc,
      customerNames,
      reportDate,
      summary,
      roomMap,
      translations,
      variant,
      reportId,
    });

    // Upload to storage
    const filePath = `cached-pdfs/snagging-${variant}-${saleId}-${contentHash.slice(0, 12)}.html`;

    // Clean up old files for this sale+type
    const { data: oldFiles } = await supabase.storage
      .from('sale-documents')
      .list('cached-pdfs', { search: `snagging-${variant}-${saleId}` });

    if (oldFiles && oldFiles.length > 0) {
      const oldPaths = oldFiles.map((f: any) => `cached-pdfs/${f.name}`);
      await supabase.storage.from('sale-documents').remove(oldPaths);
    }

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from('sale-documents')
      .upload(filePath, html, { contentType: 'text/html', upsert: true });

    if (uploadError) {
      console.error('[snagging-pdf] Upload error:', uploadError);
      // Fallback: return HTML directly
      return new Response(JSON.stringify({ html }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('sale-documents')
      .getPublicUrl(filePath);

    const fileUrl = urlData?.publicUrl || '';

    // Delete old cache entries, then insert new one
    await supabase.from('cached_pdfs').delete().eq('sale_id', saleId).eq('pdf_type', pdfType);
    await supabase.from('cached_pdfs').insert({
      sale_id: saleId,
      pdf_type: pdfType,
      content_hash: contentHash,
      file_path: filePath,
      file_url: fileUrl,
    });

    console.log(`[snagging-pdf] Generated and cached ${pdfType} for ${saleId}`);

    return new Response(JSON.stringify({ cached: true, url: fileUrl, html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating snagging PDF:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getStatusBadge(status: string): string {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ok: { label: '✓ OK', bg: '#dcfce7', color: '#166534' },
    defect: { label: '⚠ Punto de atención / Aandachtspunt', bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};">${s.label}</span>`;
}

function getSeverityBadge(severity: string | null | undefined): string {
  if (!severity) return '';
  const map: Record<string, { label: string; bg: string; color: string }> = {
    critical: { label: 'Crítico / Kritiek', bg: '#dc2626', color: '#fff' },
    major: { label: 'Mayor / Groot', bg: '#f97316', color: '#fff' },
    minor: { label: 'Menor / Klein', bg: '#eab308', color: '#422006' },
  };
  const s = map[severity];
  if (!s) return '';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};margin-left:4px;">${s.label}</span>`;
}

interface HtmlParams {
  projectName: string;
  projectCity: string;
  featuredImage: string;
  propertyDesc: string;
  customerNames: string[];
  reportDate: string;
  summary: { total: number; ok: number; defect: number; critical: number; major: number; minor: number };
  roomMap: Map<string, any[]>;
  translations: Record<string, string>;
  variant: PdfVariant;
  reportId: string;
}

function renderNoteWithTranslation(noteNl: string, translations: Record<string, string>): string {
  const esTranslation = translations[noteNl];
  if (!esTranslation) return noteNl;
  return `${noteNl}<br/><span style="color:#6b7280;font-style:italic;font-size:12px;">🇪🇸 ${esTranslation}</span>`;
}

function generateHtml(params: HtmlParams): string {
  const { projectName, projectCity, featuredImage, propertyDesc, customerNames, reportDate, summary, roomMap, translations, variant, reportId } = params;

  const isDev = variant === 'developer';
  const generatedDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Logo URL (uploaded to public storage)
  const logoUrl = 'https://owbzpreqoxedpmlsgdkb.supabase.co/storage/v1/object/public/sale-choice-attachments/branding/logo.png';

  // Assign reference IDs per room
  const roomEntries = Array.from(roomMap.entries());
  const roomRefMap = new Map<string, { items: any[]; refPrefix: string }>();
  roomEntries.forEach(([roomName, items], roomIdx) => {
    const refPrefix = `R${String(roomIdx + 1).padStart(2, '0')}`;
    items.forEach((item: any, itemIdx: number) => {
      item._refId = `${refPrefix}-${String(itemIdx + 1).padStart(2, '0')}`;
    });
    roomRefMap.set(roomName, { items, refPrefix });
  });

  // Defects-only action list
  const allDefects: { refId: string; roomName: string; item: any }[] = [];
  roomRefMap.forEach(({ items }, roomName) => {
    items.forEach((item: any) => {
      if (item.status === 'defect') {
        allDefects.push({ refId: item._refId, roomName, item });
      }
    });
  });

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, major: 1, minor: 2 };
  allDefects.sort((a, b) => {
    const sa = severityOrder[a.item.severity] ?? 3;
    const sb = severityOrder[b.item.severity] ?? 3;
    return sa - sb;
  });

  // Group defects by severity
  const defectsBySeverity = {
    critical: allDefects.filter(d => d.item.severity === 'critical'),
    major: allDefects.filter(d => d.item.severity === 'major'),
    minor: allDefects.filter(d => d.item.severity === 'minor'),
  };

  const severityConfig: Record<string, { headerBg: string; headerColor: string; borderColor: string; labelNl: string; labelEs: string; descNl: string; descEs: string; icon: string }> = {
    critical: { headerBg: '#dc2626', headerColor: '#fff', borderColor: '#dc2626', labelNl: 'KRITIEK', labelEs: 'CRÍTICO', descNl: 'Moet opgelost worden vóór sleuteloverdracht', descEs: 'Debe resolverse antes de la entrega de llaves', icon: '🔴' },
    major: { headerBg: '#f97316', headerColor: '#fff', borderColor: '#f97316', labelNl: 'GROOT', labelEs: 'MAYOR', descNl: 'Belangrijk herstel nodig, mag niet uitgesteld worden', descEs: 'Reparación importante, no debe posponerse', icon: '🟠' },
    minor: { headerBg: '#eab308', headerColor: '#422006', borderColor: '#eab308', labelNl: 'KLEIN', labelEs: 'MENOR', descNl: 'Kleine afwerking of cosmetisch herstel', descEs: 'Acabado menor o reparación cosmética', icon: '🟡' },
  };

  const renderSeverityGroup = (key: string, items: typeof allDefects) => {
    if (items.length === 0) return '';
    const cfg = severityConfig[key];

    if (isDev) {
      // Developer: full table with repair checkbox
      return `
        <div style="margin-bottom:24px;">
          <div style="background:${cfg.headerBg};color:${cfg.headerColor};padding:10px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:15px;font-weight:700;">${cfg.icon} ${cfg.labelNl} / ${cfg.labelEs} <span style="font-weight:400;font-size:13px;opacity:0.9;">(${items.length})</span></div>
            <div style="font-size:12px;font-weight:400;opacity:0.85;">${cfg.descNl}</div>
          </div>
          <div style="font-size:11px;color:#64748b;padding:4px 16px;background:#fafafa;border-left:3px solid ${cfg.borderColor};border-right:1px solid #e2e8f0;font-style:italic;">${cfg.descEs}</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:8%;">Ref</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:14%;">Foto</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:14%;">Ruimte<br/><span style="font-weight:400;color:#94a3b8;">Habitación</span></th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:18%;">Item</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:34%;">Notities / Notas</th>
                <th style="padding:10px 10px;text-align:center;font-size:12px;color:#475569;font-weight:700;width:10%;">Hersteld<br/><span style="font-weight:400;color:#94a3b8;">Reparado</span></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((d, idx) => {
                const media: string[] = d.item.media || [];
                const thumbSrc = media.length > 0 ? toThumbnailUrl(media[0], 240, 60) : '';
                const thumbHtml = media.length > 0
                  ? `<img src="${thumbSrc}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.1);" />`
                  : '<span style="color:#cbd5e1;font-size:11px;">—</span>';
                
                const noteParts: string[] = [];
                if (d.item.notes) noteParts.push(renderNoteWithTranslation(d.item.notes, translations));
                if (d.item.manual_notes) noteParts.push(renderNoteWithTranslation(d.item.manual_notes, translations));
                const notesHtml = noteParts.length > 0 ? noteParts.join('<br/>') : '—';

                const severityRefColor: Record<string, string> = { critical: '#dc2626', major: '#ea580c', minor: '#a16207' };
                const refColor = severityRefColor[d.item.severity] || '#dc2626';
                return `
                <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 1 ? 'background:#fafafa;' : ''}page-break-inside:avoid;">
                  <td style="padding:12px 10px;font-size:15px;font-weight:700;color:${refColor};font-family:'Courier New',monospace;vertical-align:top;">${d.refId}</td>
                  <td style="padding:12px 10px;vertical-align:top;">${thumbHtml}</td>
                  <td style="padding:12px 10px;font-size:14px;color:#1e293b;vertical-align:top;">${d.roomName}</td>
                  <td style="padding:12px 10px;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${d.item.item_name || 'Onbekend'}</td>
                  <td style="padding:12px 10px;font-size:13px;color:#374151;vertical-align:top;line-height:1.5;">${notesHtml}</td>
                  <td style="padding:12px 10px;text-align:center;vertical-align:top;"><span style="font-size:22px;line-height:1;">☐</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      // Client: simpler table without repair checkbox
      return `
        <div style="margin-bottom:24px;">
          <div style="background:${cfg.headerBg};color:${cfg.headerColor};padding:10px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:15px;font-weight:700;">${cfg.icon} ${cfg.labelNl} <span style="font-weight:400;font-size:13px;opacity:0.9;">(${items.length})</span></div>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:10%;">Ref</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:16%;">Foto</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:16%;">Ruimte</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:20%;">Item</th>
                <th style="padding:10px 10px;text-align:left;font-size:12px;color:#475569;font-weight:700;width:38%;">Opmerking</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((d, idx) => {
                const media: string[] = d.item.media || [];
                const thumbSrc2 = media.length > 0 ? toThumbnailUrl(media[0], 240, 60) : '';
                const thumbHtml = media.length > 0
                  ? `<img src="${thumbSrc2}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" />`
                  : '<span style="color:#cbd5e1;font-size:11px;">—</span>';
                
                const noteParts: string[] = [];
                if (d.item.notes) noteParts.push(d.item.notes);
                if (d.item.manual_notes) noteParts.push(d.item.manual_notes);
                const notesHtml = noteParts.length > 0 ? noteParts.join('<br/>') : '—';

                const severityRefColor2: Record<string, string> = { critical: '#dc2626', major: '#ea580c', minor: '#a16207' };
                const refColor2 = severityRefColor2[d.item.severity] || '#64748b';
                return `
                <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 1 ? 'background:#fafafa;' : ''}page-break-inside:avoid;">
                  <td style="padding:12px 10px;font-size:14px;font-weight:700;color:${refColor2};font-family:'Courier New',monospace;vertical-align:top;">${d.refId}</td>
                  <td style="padding:12px 10px;vertical-align:top;">${thumbHtml}</td>
                  <td style="padding:12px 10px;font-size:14px;color:#1e293b;vertical-align:top;">${d.roomName}</td>
                  <td style="padding:12px 10px;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${d.item.item_name || 'Onbekend'}</td>
                  <td style="padding:12px 10px;font-size:13px;color:#374151;vertical-align:top;line-height:1.5;">${notesHtml}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }
  };

  // === DEVELOPER ACTION LIST ===
  const defectsActionList = isDev && allDefects.length > 0 ? `
    <div style="page-break-after:always;padding:40px 32px;max-width:900px;margin:0 auto;">
      <h2 style="font-size:24px;color:#991b1b;margin:0 0 4px 0;">📋 Actielijst Aandachtspunten / Lista de Puntos de Atención</h2>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;">Overzicht van alle punten die hersteld moeten worden vóór sleuteloverdracht.<br/><em>Resumen de todos los puntos que deben repararse antes de la entrega de llaves.</em></p>

      <!-- Worker Instructions NL/ES -->
      <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;color:#0c4a6e;margin-bottom:10px;">📌 Instructies voor de uitvoerder</div>
        <ol style="margin:0 0 12px 0;padding-left:20px;font-size:13px;color:#1e293b;line-height:1.7;">
          <li>Gebruik het <strong>referentienummer</strong> (bv. R01-03) om elk punt terug te vinden in het detailrapport.</li>
          <li>Werk de punten af <strong>per prioriteit</strong>: eerst rood (kritiek), dan oranje (groot), dan geel (klein).</li>
          <li>Na herstel: <strong>vink het vakje "Hersteld" aan</strong> (☐ → ☑) en maak een foto van het resultaat.</li>
          <li>Bij twijfel of onduidelijkheid: neem contact op met de projectleider.</li>
        </ol>
        <div style="border-top:1px dashed #93c5fd;padding-top:12px;margin-top:4px;">
          <div style="font-size:14px;font-weight:700;color:#0c4a6e;margin-bottom:10px;">📌 Instrucciones para el operario</div>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:#1e293b;line-height:1.7;">
            <li>Utilice el <strong>número de referencia</strong> (ej. R01-03) para localizar cada punto en el informe detallado.</li>
            <li>Trabaje los puntos <strong>por prioridad</strong>: primero rojo (crítico), luego naranja (mayor), luego amarillo (menor).</li>
            <li>Tras la reparación: <strong>marque la casilla "Reparado"</strong> (☐ → ☑) y tome una foto del resultado.</li>
            <li>En caso de duda: contacte al jefe de proyecto.</li>
          </ol>
        </div>
      </div>

      <!-- Severity Groups -->
      ${renderSeverityGroup('critical', defectsBySeverity.critical)}
      ${renderSeverityGroup('major', defectsBySeverity.major)}
      ${renderSeverityGroup('minor', defectsBySeverity.minor)}

      <!-- Summary -->
      <div style="display:flex;gap:12px;align-items:center;justify-content:center;margin-top:20px;padding:14px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <span style="font-size:14px;font-weight:600;color:#991b1b;">🔴 ${defectsBySeverity.critical.length} kritiek</span>
        <span style="color:#cbd5e1;">|</span>
        <span style="font-size:14px;font-weight:600;color:#ea580c;">🟠 ${defectsBySeverity.major.length} groot</span>
        <span style="color:#cbd5e1;">|</span>
        <span style="font-size:14px;font-weight:600;color:#a16207;">🟡 ${defectsBySeverity.minor.length} klein</span>
        <span style="color:#cbd5e1;">|</span>
        <span style="font-size:14px;font-weight:700;color:#1e293b;">Totaal / Total: ${allDefects.length}</span>
      </div>

      <!-- Legend -->
      <div style="margin-top:16px;padding:12px 16px;background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#64748b;">
        <div style="font-weight:600;margin-bottom:6px;">Legenda / Leyenda:</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <span>🔴 Kritiek / Crítico — vóór overdracht / antes de entrega</span>
          <span>🟠 Groot / Mayor — niet uitstellen / no posponer</span>
          <span>🟡 Klein / Menor — cosmetisch / cosmético</span>
          <span>☐ = Nog te herstellen / Pendiente &nbsp; ☑ = Hersteld / Reparado</span>
        </div>
      </div>
    </div>` : '';

  // === CLIENT SUMMARY ===
  const clientSummarySection = !isDev && allDefects.length > 0 ? `
    <div style="page-break-after:always;padding:40px 32px;max-width:900px;margin:0 auto;">
      <h2 style="font-size:24px;color:#0c4a6e;margin:0 0 4px 0;">📋 Overzicht aandachtspunten</h2>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;">Hieronder vindt u alle punten die door ons zijn vastgelegd tijdens de oplevering.</p>

      ${renderSeverityGroup('critical', defectsBySeverity.critical)}
      ${renderSeverityGroup('major', defectsBySeverity.major)}
      ${renderSeverityGroup('minor', defectsBySeverity.minor)}

      <div style="display:flex;gap:12px;align-items:center;justify-content:center;margin-top:20px;padding:14px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <span style="font-size:14px;font-weight:600;color:#991b1b;">🔴 ${defectsBySeverity.critical.length} kritiek</span>
        <span style="color:#cbd5e1;">|</span>
        <span style="font-size:14px;font-weight:600;color:#ea580c;">🟠 ${defectsBySeverity.major.length} groot</span>
        <span style="color:#cbd5e1;">|</span>
        <span style="font-size:14px;font-weight:600;color:#a16207;">🟡 ${defectsBySeverity.minor.length} klein</span>
      </div>
    </div>` : '';

  // Build room sections
  const roomSections = roomEntries
    .map(([roomName, items]) => {
      const roomOk = items.filter((i: any) => i.status === 'ok').length;
      const roomDefect = items.filter((i: any) => i.status === 'defect').length;

      const itemRows = items.map((item: any) => {
        const isDefect = item.status === 'defect';

        const noteParts: string[] = [];
        if (item.notes) noteParts.push(isDev && isDefect ? renderNoteWithTranslation(item.notes, translations) : item.notes);
        if (item.manual_notes) noteParts.push(isDev && isDefect ? renderNoteWithTranslation(item.manual_notes, translations) : item.manual_notes);
        const allNotes = noteParts.join('<br/>');

        const media: string[] = item.media || [];

        // Client version: no repair checkbox column
        const repairCol = isDev
          ? `<td style="padding:10px 8px;vertical-align:top;width:10%;text-align:center;font-size:18px;">${isDefect ? '☐' : ''}</td>`
          : '';

        // Photos as separate sub-row
        const photoRow = media.length > 0
          ? `<tr style="page-break-inside:avoid;">
              <td colspan="${isDev ? '5' : '4'}" style="padding:4px 10px 12px 10px;">
                <div style="display:flex;gap:6px;flex-wrap:wrap;padding-left:40px;">
                  ${media.map((url: string) => {
                    const transformedUrl = toThumbnailUrl(url, isDefect ? 400 : 240, 70);
                    return `<img src="${transformedUrl}" style="width:${isDefect ? 180 : 80}px;height:${isDefect ? 135 : 60}px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.1);" />`;
                  }
                  ).join('')}
                </div>
              </td>
            </tr>`
          : '';

        return `
          <tr style="border-bottom:${media.length > 0 ? 'none' : '1px solid #f1f5f9'};page-break-inside:avoid;">
            <td style="padding:10px 8px;vertical-align:top;width:8%;font-family:monospace;font-size:11px;color:#64748b;font-weight:600;">${item._refId || ''}</td>
            <td style="padding:10px 10px;vertical-align:top;width:24%;">
              <div style="font-weight:500;font-size:13px;">${item.item_name || 'Onbekend'}</div>
            </td>
            <td style="padding:10px 10px;vertical-align:top;width:18%;text-align:center;">
              ${getStatusBadge(item.status)}${getSeverityBadge(item.severity)}
            </td>
            <td style="padding:10px 10px;vertical-align:top;width:${isDev ? '40' : '50'}%;">
              ${allNotes ? `<div style="font-size:12px;color:#475569;line-height:1.5;">${allNotes}</div>` : ''}
            </td>
            ${repairCol}
          </tr>
          ${photoRow}`;
      }).join('');

      const repairHeader = isDev
        ? `<th style="padding:8px 8px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Hersteld /<br/>Reparado</th>`
        : '';

      return `
        <div style="margin-bottom:28px;page-break-inside:avoid;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:8px 8px 0 0;border:1px solid #e2e8f0;border-bottom:none;">
            <h3 style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${roomName}</h3>
            <div style="font-size:12px;color:#64748b;">
              ${roomOk > 0 ? `<span style="color:#16a34a;margin-right:8px;">✓ ${roomOk} OK</span>` : ''}
              ${roomDefect > 0 ? `<span style="color:#dc2626;">⚠ ${roomDefect} aandachtspunt${roomDefect > 1 ? 'en' : ''}</span>` : ''}
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Ref</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Item</th>
                <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Status</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">${isDev ? 'Notities & Foto\'s / Notas y Fotos' : 'Opmerkingen & Foto\'s'}</th>
                ${repairHeader}
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>`;
    }).join('');

  // === NEXT STEPS (client only) ===
  const nextStepsSection = !isDev ? `
    <div style="margin-top:40px;page-break-inside:avoid;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px 28px;">
      <h3 style="font-size:18px;color:#166534;margin:0 0 16px 0;">🔄 Volgende stappen</h3>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:#1e293b;line-height:2;">
        <li><strong>Rapport doorgestuurd</strong> — Top Immo Spain heeft dit inspectierapport doorgestuurd naar de projectontwikkelaar met het verzoek tot herstel.</li>
        <li><strong>Hersteltermijn</strong> — De ontwikkelaar heeft een afgesproken termijn om alle aandachtspunten op te lossen.</li>
        <li><strong>Verificatie-inspectie</strong> — Na herstel plant Top Immo Spain een verificatie-inspectie in om te controleren of alle punten correct zijn opgelost.</li>
        <li><strong>Sleuteloverdracht</strong> — Pas wanneer alle punten naar tevredenheid zijn afgehandeld, wordt de sleuteloverdracht ingepland.</li>
      </ol>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #bbf7d0;font-size:13px;color:#166534;">
        <strong>Vragen?</strong> Neem gerust contact op met uw persoonlijke begeleider bij Top Immo Spain.<br/>
        📧 info@topimmospain.com · 🌐 www.topimmospain.com
      </div>
    </div>` : '';

  // === SIGNATURE BLOCK ===
  const signatureBlock = isDev ? `
    <div style="margin-top:48px;page-break-inside:avoid;">
      <h3 style="font-size:16px;color:#1e293b;margin-bottom:4px;">Ondertekening / Firmas</h3>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px 0;">Door ondertekening bevestigen alle partijen kennis te hebben genomen van dit rapport.<br/><em>Con la firma, todas las partes confirman haber tomado conocimiento de este informe.</em></p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:48px;">Inspecteur / Inspector</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:13px;color:#475569;">Naam / Nombre: ................................</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;">Datum / Fecha: ..................................</div>
        </div>
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:48px;">Klant / Cliente</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:13px;color:#475569;">Naam / Nombre: ................................</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;">Datum / Fecha: ..................................</div>
        </div>
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:48px;">Ontwikkelaar / Promotor</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:13px;color:#475569;">Naam / Nombre: ................................</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;">Datum / Fecha: ..................................</div>
        </div>
      </div>
    </div>` : `
    <div style="margin-top:48px;page-break-inside:avoid;">
      <h3 style="font-size:16px;color:#1e293b;margin-bottom:4px;">Ondertekening</h3>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px 0;">Door ondertekening bevestigt u kennis te hebben genomen van dit rapport.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:48px;">Inspecteur Top Immo Spain</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:13px;color:#475569;">Naam: ................................</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;">Datum: ..................................</div>
        </div>
        <div>
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:48px;">Klant</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:13px;color:#475569;">Naam: ................................</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;">Datum: ..................................</div>
        </div>
      </div>
    </div>`;

  // === COVER PAGE ===
  const logoHtml = `<div style="text-align:center;margin-bottom:8px;">
    <img src="${logoUrl}" style="height:60px;margin-bottom:4px;" alt="Top Immo Spain" />
  </div>`;

  const reportIdHtml = `<div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Rapport ${reportId}</div>`;

  // Client intro text
  const clientIntro = !isDev ? `
    <div style="page-break-after:always;padding:40px 32px;max-width:900px;margin:0 auto;">
      <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:12px;padding:28px 32px;">
        <h2 style="font-size:20px;color:#0c4a6e;margin:0 0 16px 0;">Beste ${customerNames.length > 0 ? customerNames.join(' & ') : 'klant'},</h2>
        <p style="font-size:14px;color:#1e293b;line-height:1.8;margin:0 0 12px 0;">
          Dit rapport is opgesteld door <strong>Top Immo Spain</strong> als onderdeel van onze persoonlijke begeleiding bij de oplevering van uw woning. 
          Tijdens de opleverings&shy;inspectie hebben wij elk onderdeel van uw woning zorgvuldig gecontroleerd en alle bevindingen vastgelegd.
        </p>
        <p style="font-size:14px;color:#1e293b;line-height:1.8;margin:0 0 12px 0;">
          Punten die in orde zijn, zijn gemarkeerd als <strong style="color:#166534;">✓ OK</strong>. Punten die aandacht vereisen, zijn gemarkeerd als 
          <strong style="color:#991b1b;">⚠ Aandachtspunt</strong> met een prioriteitsniveau (kritiek, groot of klein).
        </p>
        <p style="font-size:14px;color:#1e293b;line-height:1.8;margin:0;">
          Top Immo Spain stuurt dit rapport door naar de project&shy;ontwikkelaar en volgt het herstelproces op. 
          U hoeft zelf geen actie te ondernemen — wij houden u op de hoogte van de voortgang.
        </p>
      </div>
    </div>` : '';

  // Developer: no client names on cover (privacy)
  const coverCustomerLine = isDev
    ? ''
    : customerNames.length > 0
      ? `<p style="margin:0 0 8px 0;font-size:16px;color:#1e293b;font-weight:500;">Klant${customerNames.length > 1 ? 'en' : ''}: ${customerNames.join(', ')}</p>`
      : '';

  // Developer: deadline field; Client: no deadline field
  const deadlineField = isDev ? `
    <div style="margin:4px 0 12px 0;padding:8px 20px;border:1px solid #cbd5e1;border-radius:8px;display:inline-block;background:#f8fafc;">
      <span style="font-size:12px;color:#475569;font-weight:600;">Verwachte hersteldatum / Fecha prevista de reparación: </span>
      <span style="font-size:12px;color:#94a3b8;">____________________</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isDev ? 'Inspectierapport (Ontwikkelaar)' : 'Inspectierapport (Klant)'} – ${projectName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .cover-page { page-break-after: always; }
    }
    @page {
      margin: 20mm 15mm 25mm 15mm;
      @bottom-center {
        content: "Top Immo Spain · ${reportId} · Pagina " counter(page);
        font-size: 9px;
        color: #94a3b8;
      }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
    img { max-width: 100%; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px 32px;page-break-inside:avoid;">
    <!-- Print button at top -->
    <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:100;">
      <button onclick="window.print()" style="padding:12px 28px;background:#0c4a6e;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        📄 Opslaan als PDF (Ctrl+P)
      </button>
    </div>
    ${logoHtml}
    ${featuredImage ? `<img src="${toThumbnailUrl(featuredImage, 800, 75)}" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-bottom:16px;" />` : ''}
    <h1 style="margin:0 0 4px 0;font-size:24px;color:#0f172a;">${projectName}</h1>
    ${projectCity ? `<p style="margin:0 0 8px 0;font-size:15px;color:#64748b;">${projectCity}</p>` : ''}
    <div style="font-size:18px;color:#0c4a6e;font-weight:600;margin-bottom:4px;">Oplevering Inspectierapport</div>
    ${isDev ? `<div style="font-size:14px;color:#64748b;font-style:italic;margin-bottom:12px;">Informe de Inspección de Entrega</div>` : ''}
    ${reportIdHtml}
    ${propertyDesc ? `<p style="margin:0 0 12px 0;font-size:13px;color:#475569;">${propertyDesc}</p>` : ''}
    ${coverCustomerLine}
    <p style="margin:0 0 12px 0;font-size:13px;color:#64748b;">Datum inspectie${isDev ? ' / Fecha de inspección' : ''}: ${reportDate}</p>
    ${deadlineField}

    <!-- Summary boxes in 4-column grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;width:100%;max-width:700px;">
      <div style="padding:10px 8px;background:#e0f2fe;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0c4a6e;">${roomEntries.length}</div>
        <div style="font-size:11px;color:#0c4a6e;font-weight:600;">Ruimtes${isDev ? ' / Habitaciones' : ''}</div>
      </div>
      <div style="padding:10px 8px;background:#dcfce7;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#166534;">${summary.ok}</div>
        <div style="font-size:11px;color:#166534;font-weight:600;">OK</div>
      </div>
      <div style="padding:10px 8px;background:#fee2e2;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#991b1b;">${summary.defect}</div>
        <div style="font-size:11px;color:#991b1b;font-weight:600;">Aandachtspunten${isDev ? ' / Puntos' : ''}</div>
      </div>
      <div style="padding:10px 8px;background:#fef3c7;border-radius:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#92400e;">${summary.total}</div>
        <div style="font-size:11px;color:#92400e;font-weight:600;">Totaal${isDev ? ' / Total' : ''}</div>
      </div>
    </div>
    ${summary.critical > 0 ? `<div style="margin-top:8px;padding:5px 12px;background:#dc2626;color:#fff;border-radius:6px;font-size:11px;font-weight:600;">${summary.critical} kritiek punt${summary.critical > 1 ? 'en' : ''}${isDev ? ` / punto${summary.critical > 1 ? 's' : ''} crítico${summary.critical > 1 ? 's' : ''}` : ''}</div>` : ''}
  </div>

  <!-- Client Intro -->
  ${clientIntro}

  <!-- Defects Action List (developer) or Summary (client) -->
  ${defectsActionList}
  ${clientSummarySection}

  <!-- Detail Pages -->
  <div class="page">
    ${roomSections}

    <!-- Next Steps (client only) -->
    ${nextStepsSection}

    <!-- Signature block -->
    ${signatureBlock}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;">
      <img src="${logoUrl}" style="height:32px;margin-bottom:8px;" alt="Top Immo Spain" />
      <div style="font-size:14px;font-weight:700;color:#0c4a6e;">Top Immo Spain</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">www.topimmospain.com</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Rapport ${reportId} · Gegenereerd op ${generatedDate}${isDev ? ` / Generado el ${generatedDate}` : ''}</div>
    </div>

    <!-- Print button (removed from bottom, now fixed at top) -->

  </div>
</body>
</html>`;
}
