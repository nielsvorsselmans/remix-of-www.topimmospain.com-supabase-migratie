

## Full Supabase Field Inventory

Generate a complete field inventory of all 154 public-schema tables (~2,225 columns) as two artifacts.

### Outputs

| File | Format | Location |
|------|--------|----------|
| `supabase_full_field_inventory.csv` | CSV with all requested columns | `/mnt/documents/` |
| `supabase_full_field_dictionary.md` | Markdown reference document | `docs/` in project |

### Approach

This is a data processing task. I will:

1. **Extract full schema via SQL** — all columns, types, nullability, defaults, PKs, FKs, referenced tables, enum values
2. **Extract fill counts** — `COUNT(*)` and `COUNT(column)` for each column across all base tables (not views), to calculate fill rates
3. **Cross-reference with codebase** — search for table/column usage in edge functions, components, and hooks to determine `actively_used_in_code`
4. **Classify each column** with:
   - `likely_business_purpose` — inferred from name, table context, and code usage
   - `sensitivity_level` — none / personal / financial / identity / compliance
   - `ghl_sync_candidate` — based on GHL sync edge functions
   - `duplication_group` — fields that overlap across tables (e.g., first_name appears in crm_leads, profiles, hypotheek_leads)
   - `notes` — structural observations

5. **Generate CSV** to `/mnt/documents/supabase_full_field_inventory.csv`
6. **Generate markdown** to `docs/supabase_full_field_dictionary.md` with:
   - Scope explanation (included/excluded tables and why)
   - Per-domain table summaries grouped by business area
   - Top duplication clusters
   - Sensitive data clusters
   - Structural health assessment
   - Areas needing future cleanup (without proposing deletions)

### Table Classification (Domains)

Based on the 154 tables discovered:

- **CRM & Customer** (~10 tables): crm_leads, customer_profiles, customer_hypotheek_data, customer_identity_documents, etc.
- **Sales & Transactions** (~15 tables): sales, sale_customers, sale_milestones, sale_payments, sale_documents, etc.
- **Projects & Property** (~15 tables): projects, project_types, project_documents, external_listings, etc.
- **Content & Blog** (~12 tables): blog_posts, content_items, content_briefings, weekly_reports, etc.
- **Chat & AI** (~10 tables): chat_conversations, chatbot_feedback, chatbot_insights, aftersales_ai_messages, etc.
- **Events & Registration** (~6 tables): info_evening_events, webinar_events, etc.
- **Partners** (~8 tables): partners, partner_referrals, partner_categories, etc.
- **Materials & Customization** (~8 tables): material_selections, material_options, sale_extra_categories, etc.
- **Journey & Tracking** (~6 tables): journey_milestones, tracking_events, lead_nurture_actions, etc.
- **System & Config** (~10 tables): user_roles, otp_codes, rate_limit_log, cached_pdfs, etc.
- **Legacy/Old** (~4 tables): chat_messages_old, chat_sessions_old, reservation_details, reservation_documents
- **Views** (excluded from CSV): klant_detail_view, project_aggregations, public_sales, etc.

### Excluded from Inventory

- **Views** — documented separately as derived, not writable
- **Materialized views** (project_aggregations) — system-managed
- **Supabase internal schemas** (auth, storage, realtime) — not touched

### SQL Strategy

Two focused queries:
1. Full schema metadata (columns, types, PKs, FKs, enums) — single query
2. Fill counts per table — dynamic query generating `SELECT COUNT(*), COUNT(col1), COUNT(col2)...` per table, batched

### Sensitivity Classification Rules

| Level | Criteria |
|-------|----------|
| `identity` | BSN, NIE, passport, identity documents |
| `personal` | name, email, phone, address, DOB, nationality |
| `financial` | prices, payments, mortgage data, commission |
| `compliance` | signatures, contracts, notary dates |
| `none` | system fields, config, content, timestamps |

### No Changes Made

- No migrations
- No deletions
- No code changes
- Pure documentation and data extraction

