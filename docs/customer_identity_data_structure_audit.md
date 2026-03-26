# Customer Identity Data Structure Audit

> **Date:** 2026-03-26  
> **Type:** Documentation & analysis only — no migrations, no deletes, no implementation  
> **Purpose:** Understand where customer/identity fields live, what's duplicated, what's active, and what cleanup options exist

---

## 1. Scope

This audit covers all tables that store customer identity, contact, or personal data:

- `crm_leads` — central CRM record
- `profiles` — auth-linked user profile
- `customer_profiles` — behavioral/preference profile
- `reservation_details` — per-sale buyer data snapshot (legacy)
- `reservation_documents` — per-reservation document uploads (legacy)
- `customer_identity_documents` — identity doc uploads (active)
- `customer_hypotheek_data` — mortgage simulation data
- `sale_customers` — linking table between sales and crm_leads
- `buyer-data-form` edge function — external buyer form flow

---

## 2. Table-by-Table Analysis

### 2.1 `crm_leads`

**Purpose:** Central CRM record for every lead/customer in the system.

**Identity/contact fields:**
| Field | Type | Fill count (of 1,212 rows) |
|-------|------|---------------------------|
| `first_name` | text | widely filled |
| `last_name` | text | widely filled |
| `email` | text | widely filled |
| `phone` | text | widely filled |
| `street_address` | text | 37 |
| `postal_code` | text | — |
| `residence_city` | text | — |
| `country` | text | — |
| `tax_id_bsn` | text | 2 |
| `tax_id_nie` | text | 0 |
| `nationality` | text | 26 |
| `date_of_birth` | date | 6 |
| `personal_data_complete` | bool | 21 marked true |
| `personal_data_completed_at` | timestamp | — |

**Actively used in code:**
- `useCustomerPersonalData.tsx` — reads all identity fields
- `useCustomerPersonalDataBySale.tsx` — reads via join
- `CustomerDetailSheet.tsx` — admin UI form for editing all fields
- `ReservationDetailsManager.tsx` — admin UI reads/writes identity data
- `buyer-data-form` edge function — external form writes all identity fields
- `KoperDataForm.tsx` — buyer-facing form (referenced via search)
- `useCrmLead.ts` — reads phone, first_name, last_name

**Role:** **Active source of truth** for all customer identity data.

---

### 2.2 `profiles`

**Purpose:** Auth-linked profile, created when a user registers.

**Identity fields:**
| Field | Used |
|-------|------|
| `first_name` | Yes — auth display |
| `last_name` | Yes — auth display |
| `email` | Yes — auth email |

**Row count:** 253 profiles

**Actively used in code:** Yes — auth context, admin user lookups, `fix-email-mismatch` edge function.

**Role:** **Active** — source of truth for auth display name. Intentionally separate from `crm_leads`.

**Sync mechanism:** Trigger `validate_crm_lead_user_email` enforces email match when `user_id` is set on `crm_leads`. Names are synced manually via edge functions like `admin-fix-user-account`.

---

### 2.3 `customer_profiles`

**Purpose:** Behavioral and preference tracking (viewed projects, favorites, engagement data, lead temperature).

**Identity fields:** None directly — links to identity via:
- `crm_lead_id` → `crm_leads`
- `user_id` → `profiles` / `auth.users`
- `crm_user_id` → legacy CRM user ID

**Row count:** 1,248 profiles

**Actively used in code:** Yes — `useCustomerProfile.tsx`, orientation progress, engagement tracking.

**Role:** **Active** — preferences and behavioral data. No PII duplication concern.

---

### 2.4 `reservation_details`

**Purpose:** Originally designed as a per-sale buyer data snapshot (one per `sale_customer`).

**Identity fields:**
| Field | Fill count (of 22 rows) |
|-------|------------------------|
| `street_address` | 19 |
| `tax_id_bsn` | 2 |
| `tax_id_nie` | 0 |
| `nationality` | 19 |
| `date_of_birth` | 2 |
| `data_complete` | 8 marked true |

**Row count:** 22 rows total

**Actively used in code:**
- **Frontend:** Zero code writes to this table. Comments in codebase confirm deprecation:
  - `AddCustomerDialog.tsx`: _"no more reservation_details creation needed"_
  - `useChecklistSmartLinks.tsx`: _"Now uses crm_leads.personal_data_complete instead of reservation_details"_
- **Triggers:** `auto_complete_milestone_on_reservation_data` still fires on inserts/updates to this table, but since nothing writes to it, **this trigger is dead code**.
- **Edge functions:** `buyer-data-form` does NOT write to `reservation_details` — it writes to `crm_leads`.

**Role:** **Legacy/orphaned** — superseded by `crm_leads` identity fields within weeks of creation. Contains 22 rows of historical data.

**Risk:** The dead trigger `auto_complete_milestone_on_reservation_data` references this table and the `res_koperdata` milestone. If someone were to manually insert a row, it would fire. But in practice nothing triggers it.

---

### 2.5 `reservation_documents`

**Purpose:** Document uploads linked to `reservation_detail_id`.

**Row count:** 26 documents

**Actively used in code:**
- **Frontend:** Zero code references in `src/` (excluding types.ts)
- **Edge functions:** Zero references in `supabase/functions/`
- **Storage bucket:** Uses `reservation-documents` bucket (same bucket name reused by `customer_identity_documents`)

**Role:** **Legacy** — replaced by `customer_identity_documents`. The 26 existing rows are historical uploads linked to the old `reservation_details` system.

---

### 2.6 `customer_identity_documents`

**Purpose:** Identity document uploads (passport, NIE document) linked directly to `crm_lead_id`.

**Row count:** 44 documents

**Actively used in code:**
- `useCustomerPersonalData.tsx` — queries, uploads, deletes
- `useCustomerPersonalDataBySale.tsx` — queries per sale
- Admin UI components display and manage these documents

**Role:** **Active** — the current system for identity document management. Links to `crm_lead_id` (not sale-specific), which means one set of documents per person, not per sale.

---

### 2.7 `customer_hypotheek_data`

**Purpose:** Mortgage simulation data, including co-applicant (partner) information.

**Identity-adjacent fields:**
| Field | Purpose |
|-------|---------|
| `partner_voornaam` | Co-applicant first name |
| `partner_achternaam` | Co-applicant last name |

**Row count:** 2 rows

**Actively used in code:**
- `HypotheekSimulator.tsx` — reads and writes via upsert
- `useCustomerHypotheekData.ts` — query hook

**Role:** **Active but isolated** — linked by `user_id`, not `crm_lead_id`. Partner names describe a *different person* (co-applicant), so this is **not a duplication** of the lead's own name.

---

### 2.8 `sale_customers`

**Purpose:** Linking table between `sales` and `crm_leads`. Defines buyer role (main buyer, co-buyer).

**Identity fields:** None — only `crm_lead_id`, `sale_id`, `role`.

**Role:** **Active** — structural linking table. No identity data duplication.

---

### 2.9 `buyer-data-form` Edge Function

**Purpose:** External form that allows buyers (via token-based auth) to submit their personal data.

**What it writes to:**
- `crm_leads` — all identity fields (name, address, BSN, NIE, nationality, DOB)
- `customer_identity_documents` — passport/NIE uploads
- Sets `personal_data_complete = true` on `crm_leads` when form is submitted

**Does NOT write to:** `reservation_details`

**Role:** **Active** — critical production flow for buyer data collection.

---

## 3. Duplication Analysis

### 3.1 Name (`first_name` / `last_name`)

| Location | Purpose | Status |
|----------|---------|--------|
| `crm_leads` | CRM source of truth | **Active** |
| `profiles` | Auth display name | **Active** |
| `customer_hypotheek_data` | Co-applicant name (different person) | **Not a duplicate** |

**Intentional or messy?** Intentional — `crm_leads` serves the CRM, `profiles` serves auth. Different audiences, different update flows.

**Sync mechanism:** Partial — edge functions like `admin-fix-user-account` and `fix-email-mismatch` sync names. No automatic trigger.

**Risk:** Names can drift apart if updated in one place but not the other. Low impact — admin-facing only.

### 3.2 Email

| Location | Purpose | Status |
|----------|---------|--------|
| `crm_leads.email` | CRM contact email | **Active** |
| `profiles.email` | Auth login email | **Active** |

**Intentional or messy?** Intentional — enforced by trigger `validate_crm_lead_user_email` when `user_id` is set.

**Risk:** Minimal — trigger prevents mismatch at write time.

### 3.3 BSN / NIE (`tax_id_bsn` / `tax_id_nie`)

| Location | Fill count | Status |
|----------|-----------|--------|
| `crm_leads.tax_id_bsn` | 2 filled | **Active** — written by buyer-data-form, read by admin UI |
| `crm_leads.tax_id_nie` | 0 filled | **Active** — same code paths, just no data yet |
| `reservation_details.tax_id_bsn` | 2 filled | **Legacy** — no code writes here |
| `reservation_details.tax_id_nie` | 0 filled | **Legacy** |

**Code evidence:**
- `buyer-data-form/index.ts` lines 13–14: defines `tax_id_bsn`, `tax_id_nie` in form interface
- `CustomerDetailSheet.tsx` lines 487–498: admin form fields for BSN/NIE
- `ReservationDetailsManager.tsx` lines 270–271: reads from `crm_leads` personal data
- `useCustomerPersonalData.tsx` lines 19–20: type definition includes both fields

**Intentional or messy?** The duplication between `crm_leads` and `reservation_details` is messy but harmless — `reservation_details` is orphaned. The fields on `crm_leads` are **actively used and should be kept**.

**Risk:** Only risk is the 22 legacy rows in `reservation_details` potentially having different values. The overlap query shows all 22 `reservation_details` rows have a corresponding `crm_lead` — data could theoretically conflict.

### 3.4 Address (`street_address`, `postal_code`, `residence_city`, `country`)

| Location | Fill count | Status |
|----------|-----------|--------|
| `crm_leads` | 37 addresses | **Active** |
| `reservation_details` | 19 addresses | **Legacy** |

**Same pattern as BSN/NIE:** Active on `crm_leads`, legacy on `reservation_details`.

### 3.5 DOB / Nationality

| Location | DOB filled | Nationality filled | Status |
|----------|-----------|-------------------|--------|
| `crm_leads` | 6 | 26 | **Active** |
| `reservation_details` | 2 | 19 | **Legacy** |

**Same pattern.**

### 3.6 Document Uploads

| System | Row count | Linked to | Status |
|--------|-----------|-----------|--------|
| `customer_identity_documents` | 44 | `crm_lead_id` | **Active** |
| `reservation_documents` | 26 | `reservation_detail_id` | **Legacy** |

**Key difference:** The new system links documents to the person (`crm_lead_id`), not to a sale. This is structurally better — one set of identity documents per person regardless of how many sales they have.

**Risk:** The 26 legacy documents in `reservation_documents` may contain files that were never migrated to the new system. The storage bucket `reservation-documents` is shared by both tables.

---

## 4. SQL Validation Queries

These queries can be run to validate the current state. Copy-paste ready.

### 4.1 Fill rates comparison
```sql
SELECT 'crm_leads' as source,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE tax_id_bsn IS NOT NULL) as bsn_filled,
  COUNT(*) FILTER (WHERE tax_id_nie IS NOT NULL) as nie_filled,
  COUNT(*) FILTER (WHERE street_address IS NOT NULL) as address_filled,
  COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL) as dob_filled,
  COUNT(*) FILTER (WHERE nationality IS NOT NULL) as nationality_filled,
  COUNT(*) FILTER (WHERE personal_data_complete = true) as data_complete
FROM crm_leads
UNION ALL
SELECT 'reservation_details',
  COUNT(*),
  COUNT(*) FILTER (WHERE tax_id_bsn IS NOT NULL),
  COUNT(*) FILTER (WHERE tax_id_nie IS NOT NULL),
  COUNT(*) FILTER (WHERE street_address IS NOT NULL),
  COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL),
  COUNT(*) FILTER (WHERE nationality IS NOT NULL),
  COUNT(*) FILTER (WHERE data_complete = true)
FROM reservation_details;
```

**Last run result (2026-03-26):**
| source | total_rows | bsn | nie | address | dob | nationality | complete |
|--------|-----------|-----|-----|---------|-----|-------------|----------|
| crm_leads | 1,212 | 2 | 0 | 37 | 6 | 26 | 21 |
| reservation_details | 22 | 2 | 0 | 19 | 2 | 19 | 8 |

### 4.2 Table row counts
```sql
SELECT 'customer_identity_documents' as tbl, COUNT(*) FROM customer_identity_documents
UNION ALL SELECT 'reservation_documents', COUNT(*) FROM reservation_documents
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'customer_profiles', COUNT(*) FROM customer_profiles
UNION ALL SELECT 'customer_hypotheek_data', COUNT(*) FROM customer_hypotheek_data;
```

**Last run result (2026-03-26):**
| table | rows |
|-------|------|
| customer_identity_documents | 44 |
| reservation_documents | 26 |
| profiles | 253 |
| customer_profiles | 1,248 |
| customer_hypotheek_data | 2 |

### 4.3 Data overlap check
```sql
-- How many reservation_details rows have a corresponding crm_lead with identity data?
SELECT COUNT(*) as overlap_count
FROM reservation_details rd
JOIN sale_customers sc ON sc.id = rd.sale_customer_id
JOIN crm_leads cl ON cl.id = sc.crm_lead_id
WHERE cl.tax_id_bsn IS NOT NULL OR cl.street_address IS NOT NULL;
```

**Last run result:** 22 (all reservation_details rows have a linked crm_lead)

### 4.4 Potential data conflicts
```sql
-- Check if BSN values match between crm_leads and reservation_details
SELECT cl.id as crm_lead_id, cl.tax_id_bsn as cl_bsn, rd.tax_id_bsn as rd_bsn,
       cl.tax_id_bsn = rd.tax_id_bsn as match
FROM reservation_details rd
JOIN sale_customers sc ON sc.id = rd.sale_customer_id
JOIN crm_leads cl ON cl.id = sc.crm_lead_id
WHERE rd.tax_id_bsn IS NOT NULL OR cl.tax_id_bsn IS NOT NULL;
```

### 4.5 Legacy document migration check
```sql
-- Are there reservation_documents whose files might not exist in customer_identity_documents?
SELECT rd.id, rd.file_name, rd.file_url, rd.reservation_detail_id
FROM reservation_documents rd
LEFT JOIN customer_identity_documents cid 
  ON cid.file_name = rd.file_name
WHERE cid.id IS NULL;
```

---

## 5. Code Usage Reality Check

### `tax_id_bsn` / `tax_id_nie`

| Location | Type | Status |
|----------|------|--------|
| `buyer-data-form/index.ts` | Edge function | **Active** — reads/writes on `crm_leads` |
| `CustomerDetailSheet.tsx` | Admin UI | **Active** — form input fields |
| `ReservationDetailsManager.tsx` | Admin UI | **Active** — reads from `crm_leads` |
| `useCustomerPersonalData.tsx` | Hook | **Active** — type definition + query |
| `useCustomerPersonalDataBySale.tsx` | Hook | **Active** — query via join |
| `auto_complete_milestone_on_reservation_data()` | DB trigger | **Dead code** — fires on `reservation_details` but nothing writes there |

### `reservation_details` table

| Location | Status |
|----------|--------|
| Frontend code (src/) | **Zero writes** — only type definitions in types.ts |
| Edge functions | **Zero references** |
| DB trigger `auto_complete_milestone_on_reservation_data` | **Dead** — no writer |
| Code comments | Explicitly deprecated in 3 locations |

### `reservation_documents` table

| Location | Status |
|----------|--------|
| Frontend code (src/) | **Zero references** (excluding types.ts) |
| Edge functions | **Zero references** |
| Storage bucket | Shared bucket name `reservation-documents` still used by active `customer_identity_documents` code |

---

## 6. Cleanup Options

### Option A: `reservation_details` table

| Direction | Rationale | Risk |
|-----------|-----------|------|
| **Keep as-is** | 22 rows, no code writes, harmless | Dead trigger wastes mental overhead |
| **Deprecate trigger** | Remove `auto_complete_milestone_on_reservation_data` trigger since it's dead code | Very low risk — nothing fires it |
| **Archive and drop** | Export 22 rows, drop table | Need to verify no edge case reads; would clean up dead trigger automatically |
| **Document as legacy** | Add comment to table, disable trigger | Cheapest option, reduces confusion |

### Option B: `reservation_documents` table

| Direction | Rationale | Risk |
|-----------|-----------|------|
| **Keep as-is** | 26 rows of historical uploads, harmless | Files in storage bucket are still accessible |
| **Migrate files** | Move 26 docs to `customer_identity_documents` | Requires mapping `reservation_detail_id` → `crm_lead_id` via `sale_customers` |
| **Archive and drop** | Export references, keep storage files | Storage files remain accessible via direct URL |

### Option C: BSN/NIE on `crm_leads`

| Direction | Rationale |
|-----------|-----------|
| **Keep** | Actively used in production — buyer-data-form, admin UI, KoperDataForm |

**No cleanup needed. These fields are correct where they are.**

### Option D: Name/email duplication across `profiles` and `crm_leads`

| Direction | Rationale |
|-----------|-----------|
| **Keep as intentional duplication** | Different audiences (auth vs CRM), trigger enforces email consistency |
| **Improve name sync** | Consider adding a trigger for name sync (currently manual via edge functions) |

### Option E: `customer_hypotheek_data` partner names

| Direction | Rationale |
|-----------|-----------|
| **No action needed** | Partner names describe a different person (co-applicant), not a duplicate |

---

## 7. Business-Readable Summary

### What feels structurally correct
- **`crm_leads`** as the single source of truth for all customer identity data — this is clean and well-established
- **`customer_identity_documents`** linked to `crm_lead_id` (person-level, not sale-level) — correct architecture
- **`profiles`** for auth display separate from CRM — appropriate separation of concerns
- **`customer_profiles`** for behavioral data without PII — clean design
- **BSN/NIE fields on `crm_leads`** — actively used, correctly placed

### What feels duplicated but probably necessary
- **Name/email on both `profiles` and `crm_leads`** — different systems need their own copy, sync mechanisms exist (trigger for email, edge functions for name)
- **`sale_customers` as a linking table** — correctly avoids putting identity data on sales

### What feels genuinely messy
- **`reservation_details`** — an orphaned table with 22 rows, a dead trigger, and zero code writing to it. It's harmless but adds confusion
- **`reservation_documents`** — 26 legacy document records that were never migrated to the new system. Files still exist in storage but the metadata is orphaned
- **The dead trigger `auto_complete_milestone_on_reservation_data`** — references a table nobody writes to, targets the `res_koperdata` milestone which is now handled differently

### What absolutely should NOT be changed yet
- **`tax_id_bsn` / `tax_id_nie` on `crm_leads`** — actively used in `buyer-data-form`, `CustomerDetailSheet`, `ReservationDetailsManager`, and `KoperDataForm`. Removing these would break production buyer flows
- **The `reservation-documents` storage bucket** — shared between legacy `reservation_documents` and active `customer_identity_documents`. Even if the table is deprecated, the bucket must stay
- **The `validate_crm_lead_user_email` trigger** — critical safeguard preventing email mismatch between CRM and auth
