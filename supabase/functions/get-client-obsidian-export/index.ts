import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
}

function fmtDateHuman(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtDateTimeHuman(iso: string | null): string {
  if (!iso) return "—";
  return `${fmtDateHuman(iso)} om ${fmtTime(iso)}`;
}

const humanMap: Record<string, string> = {
  very_high: "Zeer hoog",
  high: "Hoog",
  medium: "Gemiddeld",
  low: "Laag",
  active: "Actief",
  waiting: "Wachtend",
  passive: "Passief",
  pending: "In afwachting",
  completed: "Afgerond",
  orientatie: "Oriëntatie",
  orienteren: "Oriëntatie",
  selectie: "Selectie",
  bezichtiging: "Bezichtiging",
  aankoop: "Aankoop",
  overdracht: "Overdracht",
  beheer: "Beheer",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  noShow: "Niet verschenen",
  no_show: "Niet verschenen",
};

function humanize(val: string | null): string {
  if (!val) return "—";
  return humanMap[val] ?? val;
}

function formatSeconds(s: number | null): string {
  if (!s || s <= 0) return "0 min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}u ${m}min`;
  return `${m} min`;
}

function htmlToMd(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>|<\/ul>/gi, "")
    .replace(/<ol[^>]*>|<\/ol>/gi, "")
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "### $1\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function esc(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/"/g, '\\"');
}

// ── Markdown Generators ──────────────────────────────────────────────

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  journey_phase: string | null;
  residence_city: string | null;
  country: string | null;
  nationality: string | null;
  utm_source: string | null;
  source_campaign: string | null;
  created_at: string | null;
  last_visit_at: string | null;
  follow_up_status: string | null;
  follow_up_notes: string | null;
  admin_notes: string | null;
  last_follow_up_at: string | null;
  next_follow_up_at: string | null;
  dropped_off_reason: string | null;
  dropped_off_notes: string | null;
}

function buildClientMarkdown(
  lead: Lead,
  profile: Record<string, unknown> | null,
  notes: Array<Record<string, unknown>>,
  nurture: Array<Record<string, unknown>>,
  appointments: Array<Record<string, unknown>>,
  projectNames: Record<string, string>,
): string {
  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Onbekend";
  const eng = (profile?.engagement_data ?? {}) as Record<string, unknown>;
  const prefs = (profile?.inferred_preferences ?? {}) as Record<string, unknown>;
  const favIds = (profile?.favorite_projects ?? []) as string[];
  const viewedIds = (profile?.viewed_projects ?? []) as string[];
  const temp = (profile?.lead_temperature ?? null) as string | null;

  // Deduplicate favorites
  const uniqueFavIds = [...new Set(favIds)];
  const favNames = uniqueFavIds.map((id) => projectNames[id] || id);

  // Next appointment for wikilink
  const now = new Date().toISOString();
  const futureAppts = appointments.filter((a) => (a.start_time as string) > now);
  const nextAppt = futureAppts.length > 0 ? futureAppts[futureAppts.length - 1] : null;
  const nextFollowUpText = nextAppt
    ? `[[Meeting ${fmtDate(nextAppt.start_time as string)} - ${name}|${fmtDateHuman(nextAppt.start_time as string)}]]`
    : lead.next_follow_up_at
      ? fmtDateHuman(lead.next_follow_up_at)
      : "—";

  // Budget
  const budgetMin = prefs?.budget_min as number | null;
  const budgetMax = prefs?.budget_max as number | null;
  const budgetStr =
    budgetMin || budgetMax
      ? `€${(budgetMin ?? 0).toLocaleString("nl-NL")} – €${(budgetMax ?? 0).toLocaleString("nl-NL")}`
      : "—";
  const regions = ((prefs?.common_regions ?? []) as string[]).join(", ") || "—";

  // ── Frontmatter ──
  const lines: string[] = [
    "---",
    "type: klantfiche",
    `naam: "${esc(name)}"`,
    `email: "${esc(lead.email)}"`,
    `telefoon: "${esc(lead.phone)}"`,
    `fase: "${esc(lead.journey_phase)}"`,
    `temperatuur: "${esc(temp)}"`,
    `woonplaats: "${esc(lead.residence_city)}"`,
    `land: "${esc(lead.country)}"`,
    `utm_source: "${esc(lead.utm_source)}"`,
    `source_campaign: "${esc(lead.source_campaign)}"`,
    `aangemaakt: ${fmtDate(lead.created_at)}`,
    `laatste_bezoek: ${fmtDate(lead.last_visit_at)}`,
    `opvolging: "${esc(lead.follow_up_status)}"`,
    `projecten_bekeken: ${viewedIds.length}`,
    `favorieten_aantal: ${uniqueFavIds.length}`,
    `crm_lead_id: "${lead.id}"`,
    `laatste_opvolging: ${fmtDate(lead.last_follow_up_at)}`,
    `volgende_opvolging: ${fmtDate(lead.next_follow_up_at)}`,
    "tags:",
    "  - klant",
    `  - "${esc(lead.journey_phase)}"`,
    "---",
    "",
    `# ${name}`,
    "",
    "## Contactgegevens",
    `- **Email**: ${lead.email ?? "—"}`,
    `- **Telefoon**: ${lead.phone ?? "—"}`,
    `- **Woonplaats**: ${lead.residence_city ?? "—"}, ${lead.country ?? "—"}`,
    `- **Nationaliteit**: ${lead.nationality ?? "—"}`,
    "",
    "## Status",
    `- **Fase**: ${humanize(lead.journey_phase)}`,
    `- **Temperatuur**: ${humanize(temp)}`,
    `- **Opvolging**: ${humanize(lead.follow_up_status)}`,
    `- **Laatste bezoek**: ${fmtDateHuman(lead.last_visit_at)}`,
    `- **Volgende opvolging**: ${nextFollowUpText}`,
    "",
    "## Engagement",
    `- Bezoeken: ${eng.total_visits ?? 0}`,
    `- Pagina's bekeken: ${eng.total_page_views ?? 0}`,
    `- Projecten bekeken: ${viewedIds.length}`,
    `- Tijd op site: ${formatSeconds(eng.total_time_on_site_seconds as number | null)}`,
    `- Engagement: ${humanize(eng.engagement_depth as string | null)}`,
    "",
    "## Voorkeuren",
    `- **Budget**: ${budgetStr}`,
    `- **Regio's**: ${regions}`,
    `- **Favoriete projecten** (${uniqueFavIds.length}): ${favNames.length > 0 ? favNames.join(", ") : "—"}`,
  ];

  // ── Afspraken ──
  if (appointments.length > 0) {
    lines.push("", "## Afspraken");
    for (const a of appointments) {
      const d = fmtDate(a.start_time as string);
      const st = a.status as string;
      lines.push(`- [[Meeting ${d} - ${name}|${d} — ${(a.title as string) || "Afspraak"}]] (${humanize(st)})`);
    }
  }

  // ── Notities ──
  if (notes.length > 0) {
    lines.push("", "## Notities");
    for (const n of notes) {
      const src = (n.source as string) || "onbekend";
      lines.push(`### ${fmtDateHuman(n.created_at as string)} (${src})`, (n.body as string) || "", "");
    }
  }

  // ── Nurture Log ──
  const completedNurture = nurture.filter((n) => n.completed_at);
  if (completedNurture.length > 0) {
    lines.push("", "## Nurture Log");
    for (const n of completedNurture) {
      const d = fmtDate(n.completed_at as string);
      const type = (n.action_type as string) || "—";
      const action = (n.suggested_action as string) || "—";
      const result = (n.action_result as string) || "—";
      lines.push(`- **${d}** | ${type} | ${action} → ${result}`);
    }
  }

  // ── Admin Notities ──
  if (lead.admin_notes) {
    lines.push("", "## Admin Notities", lead.admin_notes);
  }

  // ── Afgehaakt ──
  if (lead.dropped_off_reason) {
    lines.push("", "## Afgehaakt", `- **Reden**: ${lead.dropped_off_reason}`);
    if (lead.dropped_off_notes) lines.push(`- **Notities**: ${lead.dropped_off_notes}`);
  }

  return lines.join("\n");
}

function buildMeetingMarkdown(
  appt: Record<string, unknown>,
  lead: Lead,
  includeEmpty: boolean,
): string | null {
  const hasSummary = !!(appt.summary_short || appt.summary_full);
  const hasNotes = !!(appt.local_notes);
  if (!includeEmpty && !hasSummary && !hasNotes) return null;

  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Onbekend";
  const keyTopics = (appt.key_topics as string[]) || [];

  const lines: string[] = [
    "---",
    "type: meeting",
    `klant: "[[${name}]]"`,
    `datum: ${fmtDate(appt.start_time as string)}`,
    `tijd: "${fmtTime(appt.start_time as string)}"`,
    `status: "${esc(appt.status as string)}"`,
    `categorie: "${esc(appt.summary_category as string)}"`,
    `headline: "${esc(appt.summary_headline as string)}"`,
    `appointment_id: "${appt.id}"`,
    `crm_lead_id: "${lead.id}"`,
    `fase: "${esc(lead.journey_phase)}"`,
    "tags:",
    "  - meeting",
    `  - "${esc(lead.journey_phase)}"`,
  ];
  for (const t of keyTopics) {
    lines.push(`  - "${esc(t)}"`);
  }
  lines.push("---", "");

  lines.push(`# ${(appt.title as string) || "Afspraak"}`);
  lines.push("");
  lines.push(`**Klant**: [[${name}]]`);
  lines.push(`**Datum**: ${fmtDateTimeHuman(appt.start_time as string)}`);
  lines.push(`**Status**: ${humanize(appt.status as string)}`);

  if (!hasSummary && !hasNotes) {
    lines.push("", "> Voor deze afspraak is nog geen samenvatting of notitie beschikbaar in het systeem.");
    return lines.join("\n");
  }

  if (appt.summary_short) {
    lines.push("", "## Samenvatting", `> ${appt.summary_short}`);
  }
  if (appt.summary_full) {
    lines.push("", "## Volledige Samenvatting", appt.summary_full as string);
  }
  if (appt.local_notes) {
    lines.push("", "## Gespreksnotities", htmlToMd(appt.local_notes as string));
  }
  if (keyTopics.length > 0) {
    lines.push("", "## Key Topics");
    for (const t of keyTopics) lines.push(`- ${t}`);
  }

  return lines.join("\n");
}

// ── Main Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Input ──
    const body = await req.json();
    const crmLeadId = body.crm_lead_id;
    const includeEmpty = body.include_empty_meetings !== false;

    if (!crmLeadId) {
      return new Response(JSON.stringify({ error: "Missing crm_lead_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5 Parallel Queries ──
    const [leadRes, profileRes, notesRes, nurtureRes, apptsRes] = await Promise.all([
      supabase.from("crm_leads").select("*").eq("id", crmLeadId).single(),
      supabase.from("customer_profiles").select("*").eq("crm_lead_id", crmLeadId).maybeSingle(),
      supabase
        .from("ghl_contact_notes")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("created_at", { ascending: true }),
      supabase
        .from("lead_nurture_actions")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ghl_contact_appointments")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("start_time", { ascending: false }),
    ]);

    if (leadRes.error || !leadRes.data) {
      return new Response(JSON.stringify({ error: "Lead not found", details: leadRes.error?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead = leadRes.data as unknown as Lead;
    const profile = profileRes.data as Record<string, unknown> | null;
    const notes = (notesRes.data ?? []) as Array<Record<string, unknown>>;
    const nurture = (nurtureRes.data ?? []) as Array<Record<string, unknown>>;
    const appointments = (apptsRes.data ?? []) as Array<Record<string, unknown>>;

    // ── Optional: project names for favorites ──
    const favIds = (profile?.favorite_projects ?? []) as string[];
    const uniqueFavIds = [...new Set(favIds)];
    let projectNames: Record<string, string> = {};

    if (uniqueFavIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", uniqueFavIds);
      if (projects) {
        for (const p of projects) {
          projectNames[p.id] = p.name;
        }
      }
    }

    // ── Generate Markdown ──
    const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Onbekend";

    const clientMarkdown = buildClientMarkdown(lead, profile, notes, nurture, appointments, projectNames);
    const clientPath = `02 Clients/${name}.md`;

    const meetingFiles: Array<{ path: string; markdown: string }> = [];
    for (const appt of appointments) {
      const md = buildMeetingMarkdown(appt, lead, includeEmpty);
      if (md) {
        const d = fmtDate(appt.start_time as string);
        meetingFiles.push({
          path: `03 Meetings/Processed/Meeting ${d} - ${name}.md`,
          markdown: md,
        });
      }
    }

    console.log(`Export generated for ${name}: 1 client file + ${meetingFiles.length} meeting files`);

    return new Response(
      JSON.stringify({ client_path: clientPath, client_markdown: clientMarkdown, meeting_files: meetingFiles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
