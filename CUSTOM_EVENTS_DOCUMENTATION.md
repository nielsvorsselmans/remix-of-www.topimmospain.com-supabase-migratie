# Custom Event Tracking Documentatie

Deze documentatie beschrijft alle custom events die worden getrackt in zowel Microsoft Clarity als de Supabase tracking database.

## Event Overzicht

Alle custom events worden automatisch naar beide systemen gestuurd:
- **Microsoft Clarity**: Voor heatmaps en session recordings
- **Supabase Database**: Voor analytics en rapportage (tracking_events tabel)

## Event Types

### 1. Form Submissions
**Event Name**: `form_submission`

Getrackt wanneer een gebruiker een formulier succesvol indient.

**Parameters**:
```typescript
{
  form_type: "guide_download" | "portal_access" | "contact",
  email: string,
  has_message: boolean
}
```

**Voorbeelden**:
- Oriëntatiegids download
- Portaal toegang aanvraag
- Contact formulier

**Waar getrackt**: `src/components/LeadForm.tsx`

---

### 2. CTA Clicks
**Event Name**: `cta_click`

Getrackt wanneer een gebruiker op een Call-to-Action button klikt.

**Parameters**:
```typescript
{
  cta_type: "portal_access" | "guide_download",
  location: "hero" | "cta_section" | "promotion_card" | "navigation" | "footer",
  button_text: string
}
```

**Voorbeelden**:
- "Open het Portaal" button in hero
- "Download Oriëntatiegids" in CTA section
- Portaal button in navigation

**Waar getrackt**: 
- `src/components/Hero.tsx`
- `src/components/CTASection.tsx`
- `src/components/PortalPromotionCard.tsx`

---

### 3. Favorite Actions
**Event Name**: `favorite_action`

Getrackt wanneer een gebruiker een pand toevoegt of verwijdert uit favorieten.

**Parameters**:
```typescript
{
  action: "add" | "remove",
  property_id: string
}
```

**Voorbeelden**:
- Pand toevoegen aan favorieten
- Pand verwijderen uit favorieten

**Waar getrackt**: `src/hooks/useFavorites.tsx`

---

### 4. Page Views (Automatisch)
**Event Name**: `page_view`

Automatisch getrackt bij elke pagina navigatie.

**Parameters**:
```typescript
{
  path: string,
  full_url: string,
  referrer: string | null,
  utm_source: string | null,
  utm_medium: string | null,
  utm_campaign: string | null,
  device_type: "desktop" | "mobile" | "tablet",
  browser: string,
  os: string
}
```

**Waar getrackt**: `src/lib/tracking.ts` (automatisch via TrackingWrapper)

---

### 5. Property Views
**Event Name**: `property_view`

Getrackt wanneer een gebruiker een property detail pagina bekijkt.

**Parameters**:
```typescript
{
  property_id: string
}
```

**Waar getrackt**: `src/lib/tracking.ts` (via `trackPropertyView()`)

---

## Database Schema

Alle events worden opgeslagen in de `tracking_events` tabel met de volgende structuur:

```sql
tracking_events:
  - id (uuid)
  - event_name (string)
  - visitor_id (uuid)
  - user_id (uuid, nullable)
  - site (string) - altijd "website"
  - path (string)
  - full_url (string)
  - referrer (string, nullable)
  - event_params (jsonb) - de specifieke event parameters
  - device_type (string)
  - browser (string)
  - browser_version (string, nullable)
  - os (string)
  - os_version (string, nullable)
  - screen_width (integer)
  - screen_height (integer)
  - locale (string)
  - utm_source (string, nullable)
  - utm_medium (string, nullable)
  - utm_campaign (string, nullable)
  - crm_user_id (string, nullable)
  - occurred_at (timestamp)
  - created_at (timestamp)
```

## Hoe nieuwe events toevoegen

### Stap 1: Importeer de trackEvent functie
```typescript
import { trackEvent } from "@/lib/tracking";
```

### Stap 2: Roep trackEvent aan met consistente naming
```typescript
trackEvent("event_name", {
  param1: "value1",
  param2: "value2"
});
```

### Stap 3: Gebruik consistente event naming conventions
- **Form acties**: `form_submission`
- **Button clicks**: `cta_click`
- **User acties**: `favorite_action`, `comparison_action`, `share_action`
- **Navigatie**: Automatisch via `page_view`

### Event Naming Best Practices

1. **Gebruik underscores**: `form_submission` niet `formSubmission`
2. **Gebruik enkelvoud**: `cta_click` niet `cta_clicks`
3. **Wees specifiek in parameters**: Gebruik `cta_type` en `location` parameters in plaats van meerdere event names
4. **Blijf consistent**: Gebruik dezelfde parameter namen voor vergelijkbare acties

## Analytics Queries

### Meest geklikte CTA's
```sql
SELECT 
  event_params->>'cta_type' as cta_type,
  event_params->>'location' as location,
  COUNT(*) as clicks
FROM tracking_events
WHERE event_name = 'cta_click'
GROUP BY cta_type, location
ORDER BY clicks DESC;
```

### Form conversion rate
```sql
SELECT 
  event_params->>'form_type' as form_type,
  COUNT(*) as submissions,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM tracking_events
WHERE event_name = 'form_submission'
GROUP BY form_type;
```

### Favorieten activiteit
```sql
SELECT 
  event_params->>'action' as action,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM tracking_events
WHERE event_name = 'favorite_action'
GROUP BY action;
```

### UTM tracking overzicht
```sql
SELECT 
  utm_source,
  utm_medium,
  utm_campaign,
  COUNT(*) as visits,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM tracking_events
WHERE event_name = 'page_view'
  AND utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY visits DESC;
```

## Clarity Integration

Alle events die naar de database worden gestuurd, worden ook naar Microsoft Clarity gestuurd. In Clarity kun je:

1. **Heatmaps per event**: Filter sessies op specifieke events
2. **Session recordings**: Bekijk sessies waar bepaalde events plaatsvonden
3. **Event funnels**: Maak funnels van verschillende event types
4. **Segmentatie**: Filter gebruikers op basis van event gedrag

### Voorbeeld: Filter sessies met form submissions
1. Ga naar Recordings in Clarity
2. Voeg filter toe: Custom event = "form_submission"
3. Bekijk alle sessies waar formulieren zijn ingevuld

## Privacy & GDPR

- Alle events respecteren privacy wetgeving
- Geen persoonlijk identificeerbare informatie (PII) in event parameters
- Email adressen alleen voor intern gebruik, niet voor publieke analyse
- Gebruikers kunnen data verwijdering aanvragen via contact formulier

## Testing

Test nieuwe events tijdens development:
```typescript
// In je component
const handleTestAction = () => {
  trackEvent("test_event", {
    test_param: "test_value"
  });
  console.log("Event tracked: test_event");
};
```

Controleer in:
1. **Browser Console**: Zie `[Tracking]` log messages
2. **Network Tab**: Zie POST requests naar tracking API
3. **Clarity Dashboard**: Zie events in realtime (kan 1-2 minuten delay hebben)
4. **Database**: Query `tracking_events` tabel

## Support

Voor vragen of problemen met tracking:
- Check browser console voor error messages
- Controleer of TRACKING_API_URL correct is geconfigureerd
- Verify dat Clarity Project ID is ingesteld
- Test in incognito mode om cache issues uit te sluiten
