# Supabase Full Field Dictionary

*Generated: 2026-03-26 — 2099 fields across 151 tables*

## 1. Scope

### What is included

All **base tables** in the `public` schema that can be written to by forms, edge functions, admin flows, sync logic, imports, or system workflows.

### What is excluded

- **Views**: `klant_detail_view`, `public_sales`, `project_aggregations` — derived, not writable

- **Supabase internal schemas**: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`

- **Materialized views**: `project_aggregations` — system-refreshed

### Definition: "fillable/writable field"

Any column on a base table that can receive data through any application pathway — user input, edge function logic, trigger cascade, admin action, or external sync.


## 2. Per-Domain Table Summaries


### CRM & Customer

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `crm_leads` | 1212 | 56 | Central CRM record, source of truth for identity |
| `customer_hypotheek_data` | 2 | 22 | — |
| `customer_identity_documents` | 44 | 7 | — |
| `customer_profiles` | 1249 | 23 | Behavioral/preference profile linked to CRM lead |
| `customer_project_selections` | 283 | 11 | — |
| `manual_events` | 7 | 17 | Event management |
| `profiles` | 253 | 6 | Auth-linked user profile (display name) |
| `user_favorites` | 147 | 4 | — |

### Chat & AI

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `aftersales_ai_messages` | 1 | 10 | — |
| `aftersales_copilot_conversations` | 5 | 6 | — |
| `aftersales_reminders` | 3 | 8 | — |
| `ai_prompts` | 17 | 8 | — |
| `chat_conversations` | 468 | 10 | Chat/conversation data |
| `chat_messages` | 174 | 6 | Chat/conversation data |
| `chatbot_agent_tools` | 4 | 11 | Chat/conversation data |
| `chatbot_feedback` | 3 | 9 | Chat/conversation data |
| `chatbot_insights` | 0 | 12 | Chat/conversation data |
| `chatbot_question_metrics` | 0 | 8 | Chat/conversation data |
| `chatbot_settings` | 2 | 10 | Chat/conversation data |

### Chat & AI (Legacy)

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `chat_messages_old` | 10 | 6 | Legacy — no longer actively written |
| `chat_sessions_old` | 2 | 10 | Legacy — no longer actively written |

### Content & Blog

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `blog_feedback` | 10 | 12 | — |
| `blog_interest_analysis` | 1 | 15 | — |
| `blog_posts` | 19 | 24 | Published blog content |
| `content_archetypes` | 3 | 11 | Content pipeline |
| `content_briefings` | 26 | 15 | Content pipeline |
| `content_items` | 0 | 20 | Content pipeline |
| `content_pipeline_logs` | 100 | 10 | Content pipeline |
| `content_questions` | 175 | 9 | Content pipeline |
| `content_tensions` | 21 | 11 | Content pipeline |
| `conversation_insights` | 223 | 3 | — |
| `conversation_topics` | 6 | 9 | — |
| `conversations` | 37 | 12 | — |
| `insights` | 223 | 23 | — |
| `weekly_reports` | 2 | 6 | — |

### Events & Registration

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `info_evening_events` | 4 | 15 | Event management |
| `info_evening_registrations` | 6 | 19 | Event management |
| `webinar_events` | 3 | 12 | Event management |
| `webinar_registrations` | 8 | 19 | Event management |

### Journey & Tracking

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `journey_milestones` | 42100 | 15 | Customer journey milestone tracking |
| `lead_nurture_actions` | 13 | 18 | — |
| `tracking_events` | 17800 | 32 | User behavior tracking events |

### Marketing

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `campaign_leads` | 0 | 9 | Marketing campaigns |
| `social_campaigns` | 0 | 15 | Marketing campaigns |

### Materials & Customization

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `material_options` | 187 | 13 | Material selection for properties |
| `material_selections` | 53 | 15 | Material selection for properties |
| `snagging_inspections` | 8 | 13 | Property inspection/snagging |
| `snagging_items` | 172 | 14 | Property inspection/snagging |

### Other

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `advocaten` | 1 | 9 | — |
| `customer_travel_guide_pois` | 17 | 6 | — |
| `customer_travel_guides` | 2 | 11 | — |
| `customer_viewing_trips` | 34 | 17 | — |
| `customization_request_attachments` | 3 | 8 | — |
| `document_type_mappings` | 43 | 9 | — |
| `event_team_members` | 0 | 5 | Event management |
| `faq_categories` | 5 | 10 | — |
| `faq_items` | 20 | 10 | — |
| `ghl_contact_appointments` | 1049 | 22 | GoHighLevel CRM sync |
| `ghl_contact_notes` | 3 | 9 | GoHighLevel CRM sync |
| `google_business_connections` | 0 | 13 | — |
| `hypotheek_leads` | 2 | 25 | — |
| `info_evening_waitlist` | 0 | 8 | — |
| `lead_tasks` | 0 | 9 | — |
| `linkedin_photo_library` | 16 | 9 | — |
| `location_category_settings` | 13 | 11 | — |
| `material_categories` | 8 | 8 | Material selection for properties |
| `material_option_images` | 184 | 7 | Material selection for properties |
| `material_rooms` | 10 | 8 | Material selection for properties |
| `material_templates` | 13 | 11 | Material selection for properties |
| `meeting_knocks` | 37 | 9 | — |
| `orientation_guide_items` | 15 | 11 | — |
| `page_sections` | 43 | 9 | — |
| `pages` | 37 | 9 | — |
| `partner_content_shares` | 0 | 5 | Partner/referral management |
| `partner_content_status` | 1 | 5 | Partner/referral management |
| `partner_lead_notes` | 0 | 6 | Partner/referral management |
| `partner_scraped_data` | 10 | 7 | Partner/referral management |
| `pending_ghl_syncs` | 204 | 12 | GoHighLevel CRM sync |
| `project_briefing_analyses` | 13 | 10 | — |
| `project_contacts` | 5 | 12 | — |
| `project_dropbox_folders` | 163 | 11 | — |
| `project_dropbox_sources` | 25 | 9 | — |
| `project_feedback` | 8 | 9 | — |
| `project_sync_history` | 0 | 12 | — |
| `project_video_links` | 76 | 8 | — |
| `properties` | 1562 | 87 | — |
| `property_price_history` | 714 | 9 | — |
| `question_answers` | 0 | 6 | — |
| `rental_comparables_cache` | 418 | 11 | — |
| `reviews` | 15 | 52 | — |
| `roi_scenarios` | 2 | 34 | — |
| `sale_choice_attachments` | 0 | 12 | — |
| `sale_choice_options` | 0 | 16 | — |
| `sale_choices` | 17 | 38 | — |
| `sale_customization_requests` | 39 | 26 | — |
| `sale_extra_attachments` | 58 | 8 | — |
| `sale_invoices` | 56 | 20 | — |
| `sale_payment_proofs` | 52 | 8 | — |
| `sale_purchase_costs` | 317 | 19 | — |
| `sale_specification_approvals` | 0 | 9 | — |
| `sale_video_links` | 49 | 4 | — |
| `seo_keyword_cache` | 0 | 9 | — |
| `snagging_photos` | 2 | 10 | Property inspection/snagging |
| `snagging_voice_recordings` | 32 | 13 | Property inspection/snagging |
| `social_media_library` | 0 | 12 | Marketing campaigns |
| `social_post_generations` | 31 | 12 | Marketing campaigns |
| `social_posts` | 19 | 23 | Marketing campaigns |
| `style_examples` | 12 | 5 | — |
| `sync_logs` | 113 | 19 | — |
| `team_members` | 3 | 12 | — |
| `travel_guide_categories` | 12 | 10 | — |
| `travel_guide_pois` | 79 | 24 | — |
| `user_guide_progress` | 46 | 9 | — |
| `viewing_companion_notes` | 4 | 14 | — |
| `visual_exports` | 0 | 9 | — |
| `visual_templates` | 13 | 11 | — |
| `webhook_logs` | 1793 | 7 | — |
| `youtube_upload_jobs` | 4 | 17 | — |

### Partners

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `partner_categories` | 4 | 9 | Partner/referral management |
| `partner_referrals` | 0 | 16 | Partner/referral management |
| `partners` | 6 | 38 | Partner/referral management |

### Projects & Property

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `cost_estimate_assignments` | 17 | 8 | Cost estimation tools |
| `cost_estimates` | 17 | 18 | Cost estimation tools |
| `external_assignment_status_history` | 0 | 7 | External property listings |
| `external_listing_assignments` | 1 | 10 | External property listings |
| `external_listing_submissions` | 0 | 11 | External property listings |
| `external_listings` | 1 | 23 | External property listings |
| `project_documents` | 528 | 21 | — |
| `project_videos` | 125 | 11 | — |
| `projects` | 646 | 92 | Property project listings |

### Sales & Transactions

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `buyer_data_tokens` | 0 | 7 | — |
| `buyer_form_activity_log` | 0 | 8 | — |
| `sale_advocaten` | 16 | 5 | — |
| `sale_customers` | 63 | 5 | — |
| `sale_documents` | 375 | 16 | — |
| `sale_extra_categories` | 149 | 30 | — |
| `sale_extra_options` | 102 | 12 | — |
| `sale_milestone_activity_log` | 701 | 8 | — |
| `sale_milestones` | 1415 | 18 | Sale process milestone tracking |
| `sale_partners` | 10 | 10 | Partner/referral management |
| `sale_payments` | 111 | 23 | — |
| `sales` | 33 | 25 | Sale transaction records |

### Sales & Transactions (Legacy)

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `reservation_details` | 22 | 14 | Legacy — no longer actively written |
| `reservation_documents` | 26 | 7 | Legacy — no longer actively written |

### System & Config

| Table | Rows | Columns | Purpose |
|-------|------|---------|---------|
| `appointment_rooms` | 0 | 13 | — |
| `cached_pdfs` | 4 | 8 | — |
| `city_info_cache` | 95 | 12 | — |
| `city_video_links` | 5 | 6 | — |
| `otp_codes` | 393 | 6 | Security/system |
| `rate_limit_log` | 216 | 6 | Security/system |
| `user_roles` | 56 | 3 | — |

## 3. Major Duplication Clusters

Fields that store the same type of data across multiple tables.


### Address Duplication

- `crm_leads.country`
- `crm_leads.postal_code`
- `crm_leads.residence_city`
- `crm_leads.street_address`
- `reservation_details.country`
- `reservation_details.postal_code`
- `reservation_details.street_address`


### Bsn Duplication

- `crm_leads.tax_id_bsn`
- `reservation_details.tax_id_bsn`


### Dob Duplication

- `crm_leads.date_of_birth`
- `reservation_details.date_of_birth`


### Email Duplication

- `crm_leads.email`
- `profiles.email`


### Name Duplication

- `crm_leads.first_name`
- `crm_leads.last_name`
- `profiles.first_name`
- `profiles.last_name`


### Nationality Duplication

- `crm_leads.nationality`
- `reservation_details.nationality`


### Nie Duplication

- `crm_leads.tax_id_nie`
- `reservation_details.tax_id_nie`


### Phone Duplication

- `crm_leads.phone`


### User Id Linking

- `crm_leads.user_id`
- `customer_hypotheek_data.user_id`
- `customer_profiles.user_id`


### Visitor Id Duplication

- `crm_leads.visitor_id`
- `customer_profiles.visitor_id`


## 4. Sensitive Data Clusters


### Identity (4 fields)

- `crm_leads.tax_id_bsn`
- `crm_leads.tax_id_nie`
- `reservation_details.tax_id_bsn`
- `reservation_details.tax_id_nie`


### Personal (66 fields)

- `advocaten.email`
- `advocaten.phone`
- `appointment_rooms.contact_email`
- `appointment_rooms.contact_name`
- `blog_feedback.visitor_id`
- `blog_interest_analysis.visitor_id`
- `campaign_leads.visitor_id`
- `chat_conversations.visitor_id`
- `chat_sessions_old.final_email`
- `chat_sessions_old.final_name`
- `chat_sessions_old.visitor_id`
- `chatbot_feedback.visitor_id`
- `city_info_cache.country`
- `crm_leads.country`
- `crm_leads.date_of_birth`
- `crm_leads.email`
- `crm_leads.first_name`
- `crm_leads.last_name`
- `crm_leads.nationality`
- `crm_leads.phone`
- `crm_leads.postal_code`
- `crm_leads.residence_city`
- `crm_leads.street_address`
- `crm_leads.visitor_id`
- `customer_hypotheek_data.partner_achternaam`
- `customer_hypotheek_data.partner_voornaam`
- `customer_profiles.visitor_id`
- `hypotheek_leads.email`
- `info_evening_registrations.email`
- `info_evening_registrations.first_name`
- ... and 36 more


### Financial (51 fields)

- `cost_estimates.base_price`
- `cost_estimates.itp_rate`
- `customer_hypotheek_data.alimentatie`
- `customer_hypotheek_data.autolening`
- `customer_hypotheek_data.bruto_jaarinkomen`
- `customer_hypotheek_data.eigen_vermogen`
- `customer_hypotheek_data.inkomenstype`
- `customer_hypotheek_data.openstaande_hypotheek`
- `customer_hypotheek_data.partner_bruto_jaarinkomen`
- `customer_hypotheek_data.partner_inkomenstype`
- `customer_hypotheek_data.persoonlijke_lening`
- `customer_hypotheek_data.woningwaarde`
- `customer_hypotheek_data.woonlasten`
- `external_listings.price`
- `hypotheek_leads.bruto_jaarinkomen`
- `hypotheek_leads.eigen_vermogen`
- `hypotheek_leads.inkomenstype`
- `hypotheek_leads.partner_bruto_jaarinkomen`
- `material_options.price`
- `project_documents.is_pricelist`
- `projects.default_commission_fixed`
- `projects.default_commission_percentage`
- `projects.default_commission_type`
- `projects.price_from`
- `projects.price_to`
- `properties.previous_price`
- `properties.price`
- `properties.price_changed_at`
- `properties.price_reduced`
- `property_price_history.new_price`
- ... and 21 more


### Compliance (12 fields)

- `cost_estimate_assignments.assigned_at`
- `cost_estimate_assignments.assigned_by`
- `customer_project_selections.assigned_at`
- `customer_project_selections.assigned_by`
- `external_listing_assignments.assigned_at`
- `external_listing_assignments.assigned_by`
- `sale_documents.requires_customer_signature`
- `sale_documents.requires_developer_signature`
- `sale_documents.signed_by_customer_at`
- `sale_documents.signed_by_developer_at`
- `sales.contract_date`
- `sales.notary_date`


## 5. Structural Health Assessment


### Structurally Clean

- **`crm_leads`** — well-defined source of truth for all customer identity data

- **`sales` + `sale_milestones` + `sale_payments`** — clean transactional model with trigger-based status calculation

- **`projects`** — comprehensive property data model

- **`journey_milestones`** — clean phase-based tracking with auto-completion triggers

- **`user_roles`** — proper RBAC implementation separate from profiles


### Transitional / Messy

- **`reservation_details`** — orphaned, zero code writes, dead trigger still attached

- **`reservation_documents`** — replaced by `customer_identity_documents`

- **`chat_messages_old` / `chat_sessions_old`** — legacy chat tables, superseded by `chat_conversations` + `chat_messages`

- **Name/email duplication** across `crm_leads` and `profiles` — intentional but requires sync discipline

- **`customer_profiles`** has multiple linking columns (`user_id`, `crm_lead_id`, `crm_user_id`, `visitor_id`) — complex but necessary for visitor-to-user identity resolution


## 6. Areas Needing Later Cleanup

*No deletions proposed — documentation only.*

- **Legacy tables** (`reservation_details`, `reservation_documents`, `chat_*_old`) — verify row counts and remove when safe

- **Dead trigger** `auto_complete_milestone_on_reservation_data` — fires on `reservation_details` which is no longer written to

- **`customer_profiles` complexity** — 4 linking columns create join ambiguity; consider simplifying to `crm_lead_id` as primary link

- **GHL sync fields** — scattered across tables; consider consolidating sync metadata

- **Fill rate gaps** — many nullable fields with 0% fill rate may be unused or premature schema additions


## 7. Reference

Full field-level detail is in `supabase_full_field_inventory.csv` with columns:

- `schema_name`, `table_name`, `domain`, `column_name`, `data_type`

- `is_nullable`, `column_default`, `is_primary_key`, `is_foreign_key`, `referenced_table`

- `enum_values`, `total_rows`, `filled_count`, `fill_rate_pct`

- `sensitivity_level`, `ghl_sync_candidate`, `duplication_group`, `notes`
